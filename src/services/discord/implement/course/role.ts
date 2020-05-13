import * as Discord from "discord.js";
import { Course } from "src/models/course";
import { CourseUtils } from "src/utils/course";
import { GuildContext } from "src/guild-context";

export class CourseRoleImplementDiscordService {
  public static async createMainCourseRole(guildContext: GuildContext, course: Course): Promise<Discord.Role> {
    const role = await guildContext.guild.roles.create({
      data: {
        name: CourseUtils.convertToString(course),
        hoist: false,
        color: 0,
        mentionable: true,
        position: 1
      }
    });

    return role;
  }

  public static async createTACourseRole(guildContext: GuildContext, course: Course): Promise<Discord.Role> {
    const role = await guildContext.guild.roles.create({
      data: {
        name: `${CourseUtils.convertToString(course)}-ta`,
        hoist: true,
        color: "GREEN",
        mentionable: true,
        position: 1
      }
    });

    return role;
  }
}