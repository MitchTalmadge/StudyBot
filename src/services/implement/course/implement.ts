import { Course } from "models/course";
import { CourseChannelImplementService } from "./channel";
import { CourseRoleImplementService } from "./role";
import { DiscordUtils } from "utils/discord";
import { GuildContext } from "guild-context";
import { GuildStorageDatabaseService } from "services/database/guild-storage";
import { ICourseImplement } from "models/implement/course";
import { MajorImplementService } from "../major/implement";
import { UserDatabaseService } from "services/database/user";
import { VerificationImplementService } from "../verification/implement";

export class CourseImplementService {
  public static async getOrCreateCourseImplement(guildContext: GuildContext, course: Course): Promise<ICourseImplement> {
    const implement = await this.getCourseImplementIfExists(guildContext, course);
    if(implement) {
      return implement;
    }
    return await this.createCourseImplement(guildContext, course);
  }

  public static async getCourseImplementIfExists(guildContext: GuildContext, course: Course): Promise<ICourseImplement | undefined> {
    const implement = await GuildStorageDatabaseService.getCourseImplement(guildContext, course);
    if(implement) {
      return implement;
    }
    return undefined;
  }

  private static async createCourseImplement(guildContext: GuildContext, course: Course): Promise<ICourseImplement> {
    const majorCategoryId = await MajorImplementService.getCategoryIdForNewCourseImplement(guildContext, course.major);
    const verificationImplement = await VerificationImplementService.getOrCreateVerificationImplement(guildContext);
    
    // Main Role
    await DiscordUtils.rateLimitAvoidance();
    const mainRoleId = (await CourseRoleImplementService.createMainRole(guildContext, course)).id;
    
    // TA Role
    await DiscordUtils.rateLimitAvoidance();
    const taRoleId = (await CourseRoleImplementService.createTARole(guildContext, course)).id;

    // Text Channel
    await DiscordUtils.rateLimitAvoidance();
    const mainChannelId = (await CourseChannelImplementService.createMainChannel(guildContext, course, majorCategoryId, mainRoleId, taRoleId, verificationImplement.roleId)).id;
    
    // Voice Channel
    await DiscordUtils.rateLimitAvoidance();
    const voiceChannelId = (await CourseChannelImplementService.createVoiceChannel(guildContext, course, majorCategoryId, mainRoleId, taRoleId, verificationImplement.roleId)).id;

    const implement = {
      mainRoleId,
      taRoleId,
      mainChannelId,
      voiceChannelId
    };

    await GuildStorageDatabaseService.setCourseImplement(guildContext, course, implement);
    await MajorImplementService.sortMajorImplement(guildContext, course.major);
    return implement;
  }

  public static async deleteCourseImplementIfEmpty(guildContext: GuildContext, course: Course): Promise<void> {
    const implement = await this.getCourseImplementIfExists(guildContext, course);
    if(!implement) {
      return;
    }

    if((await UserDatabaseService.getUsersByCourse(guildContext, course)).length > 0) {
      return;
    }

    // Delays are to avoid rate limits.
    await DiscordUtils.rateLimitAvoidance();
    await guildContext.guild.channels.resolve(implement.mainChannelId).delete();
    await DiscordUtils.rateLimitAvoidance();
    await guildContext.guild.channels.resolve(implement.voiceChannelId).delete();
    await DiscordUtils.rateLimitAvoidance();
    await guildContext.guild.roles.resolve(implement.mainRoleId).delete();
    await DiscordUtils.rateLimitAvoidance();
    await guildContext.guild.roles.resolve(implement.taRoleId).delete();

    await GuildStorageDatabaseService.setCourseImplement(guildContext, course, undefined);
    await MajorImplementService.deleteMajorImplementIfEmpty(guildContext, course.major);
  }

  // TODO: Repair implement
}