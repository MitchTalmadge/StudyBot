import * as Discord from "discord.js";
import { Course } from "src/models/course";
import { GuildContext } from "src/guild-context";
import { RoleService } from "./role";

export class RoleAssignmentService {
  /**
   * Queues course role additions for a member.
   * @param guildContext The guild context.
   * @param discordMember The member whose roles to update.
   * @param courses The courses to add as roles.
   */
  public static queueCourseRolesAddition(guildContext: GuildContext, discordMember: Discord.GuildMember, courses: Course[]): void {
    this.assignCourseRoles(guildContext, discordMember, courses, [])
      .then(() => {
        console.log("Roles assigned.");
      })
      .catch(err => {
        console.error(`Failed to assign roles to member ${discordMember.id}:`, err);
      });
  }

  /**
   * Queues course role removals for a member.
   * @param guildContext The guild context.
   * @param discordMember The member whose roles to update.
   * @param courses The courses to remove as roles.
   */
  public static queueCourseRolesRemoval(guildContext: GuildContext, discordMember: Discord.GuildMember, courses: Course[]): void {
    this.assignCourseRoles(guildContext, discordMember, [], courses)
      .then(() => {
        console.log("Roles removed.");
      })
      .catch(err => {
        console.error(`Failed to remove roles from member ${discordMember.id}:`, err);
      });
  }

  private static async assignCourseRoles(guildContext: GuildContext, discordMember: Discord.GuildMember, coursesToAdd: Course[], coursesToRemove: Course[]): Promise<void> {
    let rolesToAdd: Discord.Role[] = [];
    for (let course of coursesToAdd) {
      const role = await RoleService.getCourseRole(guildContext, course);
      rolesToAdd.push(role);
    }
    if (rolesToAdd.length > 0)
      discordMember = await discordMember.roles.add(rolesToAdd, "StudyBot auto role assignment");

    let rolesToRemove: Discord.Role[] = [];
    for (let course of coursesToRemove) {
      const role = await RoleService.getCourseRole(guildContext, course);
      rolesToRemove.push(role);
    }
    if (rolesToRemove.length > 0)
      discordMember = await discordMember.roles.remove(rolesToRemove, "StudyBot auto role removal");
  }
}