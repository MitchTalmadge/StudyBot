import { GuildContext } from "guild-context";
import { Course, PartialCourse } from "models/course";
import { CourseImplementChannelType,ICourseImplement } from "models/implement/course";
import { GuildStorageDatabaseService } from "services/database/guild-storage";
import { UserDatabaseService } from "services/database/user";

import { MajorImplementService } from "../major/implement";
import { VerificationImplementService } from "../verification/implement";
import { CourseChannelImplementService } from "./channel";
import { CourseRoleImplementService } from "./role";

export class CourseImplementService {
  public static async getOrCreateCourseImplement(guildContext: GuildContext, course: Course): Promise<ICourseImplement> {
    const implement = await this.getCourseImplementIfExists(guildContext, course);
    if(implement) {
      return implement;
    }
    return await this.createCourseImplement(guildContext, course);
  }

  public static async getCourseImplementIfExists(guildContext: GuildContext, course: PartialCourse): Promise<ICourseImplement | undefined> {
    const implement = await GuildStorageDatabaseService.getCourseImplement(guildContext, course);
    if(implement) {
      return implement;
    }
    return undefined;
  }

  private static async createCourseImplement(guildContext: GuildContext, course: Course): Promise<ICourseImplement> {
    const majorCategoryIds = await MajorImplementService.getCategoryIdsForNewCourseImplement(guildContext, course.major);
    const verificationImplement = await VerificationImplementService.getOrCreateVerificationImplement(guildContext);
    
    // Main Role
    const mainRoleId = (await CourseRoleImplementService.createMainRole(guildContext, course)).id;
    
    // TA Role
    const taRoleId = (await CourseRoleImplementService.createTARole(guildContext, course)).id;

    // Channels
    const channelIds: string[] = [];
    for(let type of CourseImplementChannelType.values()) {
      channelIds[type] = (await CourseChannelImplementService.createChannelByType(guildContext, type, course, majorCategoryIds[type], mainRoleId, taRoleId, verificationImplement.roleId)).id;
    }

    const implement = {
      mainRoleId,
      taRoleId,
      channelIds,
    };
    await GuildStorageDatabaseService.setCourseImplement(guildContext, course, implement);
    return implement;
  }

  public static async deleteCourseImplementIfEmpty(guildContext: GuildContext, course: PartialCourse): Promise<void> {
    const implement = await this.getCourseImplementIfExists(guildContext, course);
    if(!implement) {
      return;
    }

    if((await UserDatabaseService.getUsersByCourse(guildContext, course)).length > 0) {
      return;
    }

    guildContext.guildDebug(`Course ${course.key} is empty and will be cleaned up.`);

    for(let type of CourseImplementChannelType.values()) {
      await guildContext.guild.channels.resolve(implement.channelIds[type]).delete();
    }
    await guildContext.guild.roles.resolve(implement.mainRoleId).delete();
    await guildContext.guild.roles.resolve(implement.taRoleId).delete();

    await GuildStorageDatabaseService.setCourseImplement(guildContext, course, undefined);
  }

  // TODO: Repair implement
}