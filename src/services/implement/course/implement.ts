import { GuildContext } from "guild-context";
import { Course, PartialCourse } from "models/course";
import { CourseImplementChannelType,ICourseImplement } from "models/implement/course";
import { GuildStorageDatabaseService } from "services/database/guild-storage";
import { UserDatabaseService } from "services/database/user";

import { MajorImplementService } from "../major/implement";
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
    guildContext.guildDebug("Creating course implement for", course);
    const majorCategoryIds = await MajorImplementService.getCategoryIdsForNewCourseImplement(guildContext, course.major);
    
    // Main Role
    const mainRoleId = (await CourseRoleImplementService.createMainRole(guildContext, course)).id;
    
    // TA Role
    const taRoleId = (await CourseRoleImplementService.createTARole(guildContext, course)).id;

    // Channels
    const channelIds: string[] = [];
    for(let type of CourseImplementChannelType.values()) {
      channelIds[type] = (await CourseChannelImplementService.createChannelByType(guildContext, type, course, majorCategoryIds[type], mainRoleId, taRoleId)).id;
    }

    const implement: ICourseImplement = {
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

    guildContext.guildLog(`Course ${course.key} is empty and will be cleaned up.`);

    for(let type of CourseImplementChannelType.values()) {
      await guildContext.guild.channels.resolve(implement.channelIds[type]).delete();
    }
    await guildContext.guild.roles.resolve(implement.mainRoleId).delete();
    await guildContext.guild.roles.resolve(implement.taRoleId).delete();

    await GuildStorageDatabaseService.setCourseImplement(guildContext, course, undefined);
  }

  public static async guarantee(guildContext: GuildContext, course: Course) {
    guildContext.guildLog(`Guaranteeing course ${course.key}...`);
    const implement = await this.getCourseImplementIfExists(guildContext, course);
    if(!implement) {
      return;
    }

    let update = false;
    
    // Main Role
    if(!await guildContext.guild.roles.fetch(implement.mainRoleId)) {
      guildContext.guildLog(`Creating missing main role for course ${course.key}`);
      implement.mainRoleId = (await CourseRoleImplementService.createMainRole(guildContext, course)).id;
      update = true;
    }

    // TA Role
    if(!await guildContext.guild.roles.fetch(implement.taRoleId)) {
      guildContext.guildLog(`Creating missing TA role for course ${course.key}`);
      implement.taRoleId = (await CourseRoleImplementService.createTARole(guildContext, course)).id;
      update = true;
    }

    // Channels
    for(let type of CourseImplementChannelType.values()) {
      const channel = guildContext.guild.channels.resolve(implement.channelIds[type]);
      if(!channel) {
        guildContext.guildLog(`Creating missing ${CourseImplementChannelType[type]} channel for course ${course.key}`);
        const majorCategoryId = await MajorImplementService.getCategoryIdForNewCourseImplement(guildContext, course.major, type);
        implement.channelIds[type] = (await CourseChannelImplementService.createChannelByType(guildContext, type, course, majorCategoryId, implement.mainRoleId, implement.taRoleId)).id;
        update = true;
      } else {
        guildContext.guildLog(`Resetting ${CourseImplementChannelType[type]} channel permissions for course ${course.key}`);
        await CourseChannelImplementService.resetChannelPermissionsByType(guildContext, type, implement.mainRoleId, implement.taRoleId, channel);
      }
    }

    if(update) {
      await GuildStorageDatabaseService.setCourseImplement(guildContext, course, implement);
    }
  }
}