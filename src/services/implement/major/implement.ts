import * as Discord from "discord.js";
import { DiscordUtils } from "utils/discord";
import { GuildContext } from "guild-context";
import { GuildStorageDatabaseService } from "services/database/guild-storage";
import { ICourseImplement } from "models/implement/course";
import { IMajorImplement } from "models/implement/major";
import { Major } from "models/major";
import { MajorCategoryImplementService } from "./category";

export class MajorImplementService {
  public static async getOrCreateMajorImplement(guildContext: GuildContext, major: Major): Promise<IMajorImplement> {
    const implement = await this.getMajorImplementIfExists(guildContext, major);
    if (implement)
      return implement;

    return await this.createMajorImplement(guildContext, major);
  }

  public static async getMajorImplementIfExists(guildContext: GuildContext, major: Major): Promise<IMajorImplement | undefined> {
    const implement = await GuildStorageDatabaseService.getMajorImplement(guildContext, major);
    if (implement) {
      return implement;
    }
    return undefined;
  }

  private static async createMajorImplement(guildContext: GuildContext, major: Major): Promise<IMajorImplement> {
    await DiscordUtils.rateLimitAvoidance();
    const textCategoryId = (await MajorCategoryImplementService.createTextCategory(guildContext, major)).id;
    await DiscordUtils.rateLimitAvoidance();
    const voiceCategoryId = (await MajorCategoryImplementService.createVoiceCategory(guildContext, major)).id;

    const implement: IMajorImplement = {
      textCategoryId,
      voiceCategoryId,
      courseImplements: new Map<string, ICourseImplement>()
    };

    await GuildStorageDatabaseService.setMajorImplement(guildContext, major, implement);
    return implement;
  }

  public static async deleteMajorImplementIfEmpty(guildContext: GuildContext, major: Major): Promise<void> {
    const implement = await this.getMajorImplementIfExists(guildContext, major);
    if (!implement) {
      return;
    }

    if (implement.courseImplements.size > 0) {
      return;
    }

    // Delays are to avoid rate limits.
    await DiscordUtils.rateLimitAvoidance();
    await guildContext.guild.channels.resolve(implement.textCategoryId).delete();
    await DiscordUtils.rateLimitAvoidance();
    await guildContext.guild.channels.resolve(implement.voiceCategoryId).delete();

    await GuildStorageDatabaseService.setMajorImplement(guildContext, major, undefined);
  }

  /**
   * Re-sorts all aspects of the major implement (channels, roles) based on names.
   * @param guildContext The guild context.
   * @param major The major.
   * @returns A promise that resolves when sorting is complete.
   */
  public static async sortMajorImplement(guildContext: GuildContext, major: Major): Promise<void> {
    const implement = await this.getMajorImplementIfExists(guildContext, major);
    if (!implement) {
      return;
    }

    // Channels
    const textCategory = <Discord.CategoryChannel>guildContext.guild.channels.resolve(implement.textCategoryId);
    const voiceCategory = <Discord.CategoryChannel>guildContext.guild.channels.resolve(implement.voiceCategoryId);

    const channelPositions: Discord.ChannelPosition[] = [];
    channelPositions.push(...this.createChannelPositionsByName(textCategory.children.array()));
    channelPositions.push(...this.createChannelPositionsByName(voiceCategory.children.array()));

    await guildContext.guild.setChannelPositions(channelPositions);
    await DiscordUtils.rateLimitAvoidance();

    //TODO: Roles
  }

  private static createChannelPositionsByName(channels: Discord.GuildChannel[]): Discord.ChannelPosition[] {
    return channels
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c, i) => {
        return {
          channel: c,
          position: i
        };
      });
  }
}