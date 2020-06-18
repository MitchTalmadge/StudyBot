import * as Discord from "discord.js";
import { DiscordUtils } from "utils/discord";
import { GuildContext } from "guild-context";
import { GuildStorageDatabaseService } from "services/database/guild-storage";
import { ICourseImplement } from "models/implement/course";
import { IMajorImplement } from "models/implement/major";
import { Major } from "models/major";
import { MajorCategoryImplementService } from "./category";

export class MajorImplementService {
  private static readonly MAX_CHANNELS_PER_CATEGORY = 50;

  private static readonly CHANNELS_PER_COURSE_IMPLEMENT = 2; // Text and Voice

  public static async getMajorImplementIfExists(guildContext: GuildContext, major: Major): Promise<IMajorImplement | undefined> {
    const implement = await GuildStorageDatabaseService.getMajorImplement(guildContext, major);
    if (implement) {
      return implement;
    }
    return undefined;
  }

  public static async getCategoryIdForNewCourseImplement(guildContext: GuildContext, major: Major): Promise<string> {
    let implement = await this.getMajorImplementIfExists(guildContext, major);
    if (!implement) {
      implement = await this.createEmptyMajorImplement(guildContext, major);
    }

    const currentChannelCount = implement.courseImplements.size * this.CHANNELS_PER_COURSE_IMPLEMENT;
    // Select a category index where all of the required channels will fit together.
    const selectedCategoryIndex = Math.floor((currentChannelCount + this.CHANNELS_PER_COURSE_IMPLEMENT - 1) / this.MAX_CHANNELS_PER_CATEGORY);
    guildContext.guildDebug("Major category requested for new course implement.");
    guildContext.guildDebug(`Current Channel Count: ${currentChannelCount} | Selected Category Index: ${selectedCategoryIndex}`);
    implement = await this.scaleOutCategories(guildContext, major, selectedCategoryIndex + 1);
    return implement.categoryIds[selectedCategoryIndex];
  }

  private static async createEmptyMajorImplement(guildContext: GuildContext, major: Major): Promise<IMajorImplement> {
    const implement: IMajorImplement = {
      categoryIds: [],
      courseImplements: new Map<string, ICourseImplement>()
    };

    await GuildStorageDatabaseService.setMajorImplement(guildContext, major, implement);
    return implement;
  }

  /**
   * Ensures the creation of at least enough categories to meet the count provided.
   * @param guildContext The guild context.
   * @param major The major.
   * @param count The number of categories needed.
   * @returns A promise that resolves the updated major implement.
   */
  private static async scaleOutCategories(guildContext: GuildContext, major: Major, count: number): Promise<IMajorImplement> {
    const implement = await GuildStorageDatabaseService.getMajorImplement(guildContext, major);
    const numToCreate = count - implement.categoryIds.length;
    guildContext.guildDebug(`Scaling out to ${count} categories (${numToCreate} to create.)`);
    for (let i = 0; i < numToCreate; i++) {
      await DiscordUtils.rateLimitAvoidance();
      const categoryId = (await MajorCategoryImplementService.createCategory(guildContext, major)).id;
      implement.categoryIds.push(categoryId);
    }
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

    //await DiscordUtils.rateLimitAvoidance();
    //await guildContext.guild.channels.resolve(implement.categoryId).delete();

    //await GuildStorageDatabaseService.setMajorImplement(guildContext, major, undefined);
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
    // const category = <Discord.CategoryChannel>guildContext.guild.channels.resolve(implement.categoryId);

    // const channelPositions: Discord.ChannelPosition[] = [];
    // channelPositions.push(...this.createChannelPositionsByName(category.children.array()));

    // await guildContext.guild.setChannelPositions(channelPositions);
    // await DiscordUtils.rateLimitAvoidance();

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