import * as Discord from "discord.js";
import { GuildContext } from "guild-context";
import { PartialCourse } from "models/course";
import { CourseUtils } from "utils/course";

export class CourseRoleImplementService {
  public static async createMainRole(guildContext: GuildContext, course: PartialCourse): Promise<Discord.Role> {
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

  public static async createTARole(guildContext: GuildContext, course: PartialCourse): Promise<Discord.Role> {
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