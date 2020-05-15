import { Course } from "src/models/course";
import { CourseChannelImplementDiscordService } from "./channel";
import { CourseRoleImplementDiscordService } from "./role";
import { GuildContext } from "src/guild-context";
import { GuildStorageDatabaseService } from "src/services/database/guild-storage";
import { ICourseImplementDiscord } from "src/models/discord/implement/course";
import { MajorImplementDiscordService } from "../major";

export class CourseImplementDiscordService {
  public static async getOrCreateCourseImplement(guildContext: GuildContext, course: Course): Promise<ICourseImplementDiscord> {
    const implement = await this.getCourseImplementIfExists(guildContext, course);
    if(implement) {
      return implement;
    }
    return await this.createCourseImplement(guildContext, course);
  }

  public static async getCourseImplementIfExists(guildContext: GuildContext, course: Course): Promise<ICourseImplementDiscord | undefined> {
    const implement = await GuildStorageDatabaseService.getCourseImplement(guildContext, course);
    if(implement) {
      return implement;
    }
    return undefined;
  }

  private static async createCourseImplement(guildContext: GuildContext, course: Course): Promise<ICourseImplementDiscord> {
    const majorImplement = await MajorImplementDiscordService.getOrCreateMajorImplement(guildContext, course.major);
    
    const mainRoleId = (await CourseRoleImplementDiscordService.createMainCourseRole(guildContext, course)).id;
    const taRoleId = (await CourseRoleImplementDiscordService.createTACourseRole(guildContext, course)).id;
    const mainChannelId = (await CourseChannelImplementDiscordService.createMainCourseChannel(guildContext, course, majorImplement.textCategoryId, mainRoleId, taRoleId)).id;
    const voiceChannelId = (await CourseChannelImplementDiscordService.createVoiceCourseChannel(guildContext, course, majorImplement.voiceCategoryId, mainRoleId, taRoleId)).id;

    const implement = {
      mainRoleId,
      taRoleId,
      mainChannelId,
      voiceChannelId
    };

    await GuildStorageDatabaseService.setCourseImplement(guildContext, course, implement);
    return implement;
  }

  // TODO: Repair implement
}