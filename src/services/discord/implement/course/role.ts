import * as Discord from "discord.js";
import { Course } from "src/models/course";
import { CourseUtils } from "src/utils/course";
import { GuildContext } from "src/guild-context";

export class CourseRoleImplementDiscordService {
  public static async createMainRole(guildContext: GuildContext, course: Course): Promise<Discord.Role> {
    const role = await guildContext.guild.roles.create({
      data: {
        name: CourseUtils.getMainRoleName(course),
        hoist: false,
        color: 0,
        mentionable: true,
        position: 1
      }
    });

    return role;
  }

  public static async createTARole(guildContext: GuildContext, course: Course): Promise<Discord.Role> {
    const role = await guildContext.guild.roles.create({
      data: {
        name: CourseUtils.getTARoleName(course),
        hoist: true,
        color: "GREEN",
        mentionable: true,
        position: 1
      }
    });

    return role;
  }
}