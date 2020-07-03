import * as Discord from "discord.js";
import { GuildContext } from "guild-context";
import { Course } from "models/course";
import { DiscordUtils } from "utils/discord";

import { UserDatabaseService } from "./database/user";
import { DiscordRoleAssignmentService } from "./discord/role-assignment";
import { MajorImplementService } from "./implement/major/implement";

export class MemberUpdateService {
  private static queues: { [guildId: string]: Promise<void> } = {};

  /**
   * Queues a promise by appending it to the guild's queue chain.
   * @param guildContext The guild initiating the queue request.
   * @param promiseFunc A function that returns the promise to execute.
   */
  private static queue(guildContext: GuildContext, promiseFunc: () => Promise<any>): Promise<void> {
    if (!this.queues[guildContext.guild.id]) {
      this.queues[guildContext.guild.id] = Promise.resolve();
    }

    this.queues[guildContext.guild.id] =
      this.queues[guildContext.guild.id].finally(promiseFunc);

    return this.queues[guildContext.guild.id];
  }

  public static queueAssignCourses(guildContext: GuildContext, member: Discord.GuildMember, courses: Course[]): Promise<void> {
    return this.queue(guildContext, () => this.assignCourses(guildContext, member, courses));
  }

  private static async assignCourses(guildContext: GuildContext, member: Discord.GuildMember, courses: Course[]): Promise<void> {
    guildContext.guildLog(`Assigning courses to ${DiscordUtils.describeUserForLogs(member.user)}:`, courses);
    
    await UserDatabaseService.addCoursesToMember(guildContext, member, courses);

    await DiscordRoleAssignmentService.computeAndApplyRoleChanges(guildContext, member);

    await MajorImplementService.cleanUpAll(guildContext);
  }

  public static queueUnassignCourses(guildContext: GuildContext, member: Discord.GuildMember, courses: Course[]): Promise<void> {
    return this.queue(guildContext, () => this.unassignCourses(guildContext, member, courses));
  }

  private static async unassignCourses(guildContext: GuildContext, member: Discord.GuildMember, courses: Course[]): Promise<void> {
    guildContext.guildLog(`Unassigning courses from ${DiscordUtils.describeUserForLogs(member.user)}:`, courses);

    await UserDatabaseService.removeCoursesFromMember(guildContext, member, courses);

    await DiscordRoleAssignmentService.computeAndApplyRoleChanges(guildContext, member);

    await MajorImplementService.cleanUpAll(guildContext);
  } 

  public static queueUnassignAllCourses(guildContext: GuildContext, member: Discord.GuildMember, updateRoles: boolean): Promise<void> {
    return this.queue(guildContext, () => this.unassignAllCourses(guildContext, member, updateRoles));
  }

  private static async unassignAllCourses(guildContext: GuildContext, member: Discord.GuildMember, updateRoles: boolean): Promise<void> {
    guildContext.guildLog(`Unassigning all courses from ${DiscordUtils.describeUserForLogs(member.user)}.`);

    await UserDatabaseService.removeAllCoursesFromMember(guildContext, member);

    if(updateRoles)
      await DiscordRoleAssignmentService.computeAndApplyRoleChanges(guildContext, member);

    await MajorImplementService.cleanUpAll(guildContext);
  } 

  public static queueToggleTAStatus(guildContext: GuildContext, member: Discord.GuildMember, courses: Course[]): Promise<void> {
    return this.queue(guildContext, () => this.toggleTAStatus(guildContext, member, courses));
  }

  private static async toggleTAStatus(guildContext: GuildContext, member: Discord.GuildMember, courses: Course[]): Promise<void> {
    guildContext.guildLog(`Toggling TA status for ${DiscordUtils.describeUserForLogs(member.user)} in courses:`, courses);

    await UserDatabaseService.toggleTAStatusForMember(guildContext, member, courses);

    await DiscordRoleAssignmentService.computeAndApplyRoleChanges(guildContext, member);

    await MajorImplementService.cleanUpAll(guildContext);
  }

  public static queueMarkVerified(guildContext: GuildContext, member: Discord.GuildMember): Promise<void> {
    return this.queue(guildContext, () => this.markVerified(guildContext, member));
  }

  private static async markVerified(guildContext: GuildContext, member: Discord.GuildMember): Promise<void> {
    guildContext.guildLog(`Marking ${DiscordUtils.describeUserForLogs(member.user)} verified.`);

    await UserDatabaseService.setUserVerified(guildContext, member);

    await DiscordRoleAssignmentService.computeAndApplyRoleChanges(guildContext, member);
  }
}