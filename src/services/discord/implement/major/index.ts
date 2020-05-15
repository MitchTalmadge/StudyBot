import { GuildContext } from "src/guild-context";
import { GuildStorageDatabaseService } from "src/services/database/guild-storage";
import { ICourseImplementDiscord } from "src/models/discord/implement/course";
import { IMajorImplementDiscord } from "src/models/discord/implement/major";
import { Major } from "src/models/major";
import { MajorCategoryImplementDiscordService } from "./category";

export class MajorImplementDiscordService {
  public static async getOrCreateMajorImplement(guildContext: GuildContext, major: Major): Promise<IMajorImplementDiscord> {
    const majorImplement = await GuildStorageDatabaseService.getMajorImplement(guildContext, major);
    if(majorImplement)
      return majorImplement;

    return await this.createMajorImplement(guildContext, major);
  }

  private static async createMajorImplement(guildContext: GuildContext, major: Major): Promise<IMajorImplementDiscord> {
    const textCategoryId = (await MajorCategoryImplementDiscordService.createTextCategory(guildContext, major)).id;
    const voiceCategoryId = (await MajorCategoryImplementDiscordService.createVoiceCategory(guildContext, major)).id;
    
    const implement: IMajorImplementDiscord = {
      textCategoryId,
      voiceCategoryId,
      courseImplements: new Map<string, ICourseImplementDiscord>()
    };

    await GuildStorageDatabaseService.setMajorImplement(guildContext, major, implement);
    return implement;
  }
}