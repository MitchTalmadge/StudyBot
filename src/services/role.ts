import * as Discord from "discord.js";
import { Course } from "src/models/course";
import { CourseUtils } from "src/utils/course";
import { GuildContext } from "src/guild-context";
import { GuildStorageService } from "./guild-storage";

export class RoleService {
  public static async getCourseRole(guildContext: GuildContext, course: Course): Promise<Discord.Role> {
    const existingRole = await this.getCourseRoleIfExists(guildContext, course);
    if (existingRole)
      return existingRole;

    const role = await this.createCourseRole(guildContext, course);
    return role;
  }

  public static async getCourseRoleIfExists(guildContext: GuildContext, course: Course): Promise<Discord.Role | undefined> {
    const courseKey = CourseUtils.convertToString(course);

    const roles = await GuildStorageService.getRolesForMajor(guildContext, course.major);
    const roleId = roles.get(courseKey);
    if (roleId) {
      const role = await guildContext.guild.roles.fetch(roleId);
      if (role) {
        return role;
      }

      guildContext.guildError(`Failed to find course role with ID ${roleId} for course ${courseKey}.`);
      // Remove invalid role from storage. Probably deleted by someone on the server.
      await GuildStorageService.removeRole(guildContext, course);
    }

    return undefined;
  }

  public static async getExistingRoleIdsForCourses(guildContext: GuildContext, courses: Course[]): Promise<string[]> {
    const roles = await GuildStorageService.getAllRoles(guildContext);
    let roleIds = [];
    courses.forEach(course => {
      roleIds.push(roles.get(CourseUtils.convertToString(course)));
    });

    return roleIds;
  }

  private static async createCourseRole(guildContext: GuildContext, course: Course): Promise<Discord.Role> {
    const role = await guildContext.guild.roles.create({
      data: {
        name: CourseUtils.convertToString(course),
        hoist: false,
        color: 0,
        mentionable: true,
        position: 1
      }
    });

    await GuildStorageService.addRole(guildContext, course, role.id);
    return role;
  }
}