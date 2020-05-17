import { DiscordUtils } from "src/utils/discord";
import { GuildContext } from "src/guild-context";
import { GuildStorageDatabaseService } from "src/services/database/guild-storage";
import { ICourseImplementDiscord } from "src/models/discord/implement/course";
import { IMajorImplementDiscord } from "src/models/discord/implement/major";
import { Major } from "src/models/major";
import { MajorCategoryImplementDiscordService } from "./category";

export class MajorImplementDiscordService {
  public static async getOrCreateMajorImplement(guildContext: GuildContext, major: Major): Promise<IMajorImplementDiscord> {
    const implement = await this.getMajorImplementIfExists(guildContext, major);
    if(implement)
      return implement;

    return await this.createMajorImplement(guildContext, major);
  }

  public static async getMajorImplementIfExists(guildContext: GuildContext, major: Major): Promise<IMajorImplementDiscord | undefined> {
    const implement = await GuildStorageDatabaseService.getMajorImplement(guildContext, major);
    if(implement) {
      return implement;
    }
    return undefined;
  }

  private static async createMajorImplement(guildContext: GuildContext, major: Major): Promise<IMajorImplementDiscord> {
    // Delays are to avoid rate limits.
    await DiscordUtils.rateLimitAvoidance();
    const textCategoryId = (await MajorCategoryImplementDiscordService.createTextCategory(guildContext, major)).id;
    await DiscordUtils.rateLimitAvoidance();
    const voiceCategoryId = (await MajorCategoryImplementDiscordService.createVoiceCategory(guildContext, major)).id;
    
    const implement: IMajorImplementDiscord = {
      textCategoryId,
      voiceCategoryId,
      courseImplements: new Map<string, ICourseImplementDiscord>()
    };

    await GuildStorageDatabaseService.setMajorImplement(guildContext, major, implement);
    return implement;
  }

  public static async deleteMajorImplementIfEmpty(guildContext: GuildContext, major: Major): Promise<void> {
    const implement = await this.getMajorImplementIfExists(guildContext, major);
    if(!implement) {
      return;
    }

    if(implement.courseImplements.size > 0) {
      return;
    }

    // Delays are to avoid rate limits.
    await DiscordUtils.rateLimitAvoidance();
    await guildContext.guild.channels.resolve(implement.textCategoryId).delete();
    await DiscordUtils.rateLimitAvoidance();
    await guildContext.guild.channels.resolve(implement.voiceCategoryId).delete();

    await GuildStorageDatabaseService.setMajorImplement(guildContext, major, undefined);
  }
}