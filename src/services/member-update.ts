import * as Discord from "discord.js";
import { GuildContext } from "guild-context";
import { Course } from "models/course";
import { DiscordUtils } from "utils/discord";

import { BanService } from "./ban";
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
    return this.queue(guildContext, async () => {
      guildContext.guildLog(`Assigning courses to ${DiscordUtils.describeUserForLogs(member.user)}:`, courses);
      
      await UserDatabaseService.addCoursesToMember(guildContext, member, courses);
  
      await DiscordRoleAssignmentService.computeAndApplyRoleChanges(guildContext, member);
  
      await MajorImplementService.cleanUpImplements(guildContext);
    });
  }

  public static queueUnassignCourses(guildContext: GuildContext, member: Discord.GuildMember, courses: Course[]): Promise<void> {
    return this.queue(guildContext, async () => {
      guildContext.guildLog(`Unassigning courses from ${DiscordUtils.describeUserForLogs(member.user)}:`, courses);
  
      await UserDatabaseService.removeCoursesFromMember(guildContext, member, courses);
  
      await DiscordRoleAssignmentService.computeAndApplyRoleChanges(guildContext, member);
  
      await MajorImplementService.cleanUpImplements(guildContext);
    } );
  }

  public static queueUnassignAllCourses(guildContext: GuildContext, member: Discord.GuildMember): Promise<void> {
    return this.queue(guildContext, async () => {
      guildContext.guildLog(`Unassigning all courses from ${DiscordUtils.describeUserForLogs(member.user)}.`);
  
      await UserDatabaseService.removeAllCoursesFromUser(guildContext, member.user.id);
      
      await DiscordRoleAssignmentService.computeAndApplyRoleChanges(guildContext, member);
  
      await MajorImplementService.cleanUpImplements(guildContext);
    } );
  }

  public static queueUnassignAllCoursesManyMembers(guildContext: GuildContext, members: Discord.GuildMember[]): Promise<void> {
    return this.queue(guildContext, async () => {
      guildContext.guildLog(`Unassigning all courses from ${members.length} members.`);
  
      let promises: Promise<void>[] = [];
      for(let member of members) {
        await UserDatabaseService.removeAllCoursesFromUser(guildContext, member.user.id);
      }
      await Promise.all(promises);
      
      await this.synchronizeRolesManyMembers(guildContext, members);

      await MajorImplementService.cleanUpImplements(guildContext);
    } );
  }

  public static queueLeaveGuild(guildContext: GuildContext, discordUserId: string): Promise<void> {
    return this.queue(guildContext, async () => {
      guildContext.guildLog(`Performing guild-leave cleanup of user ID ${discordUserId}.`);
  
      await UserDatabaseService.leaveGuild(guildContext, discordUserId);
      await MajorImplementService.cleanUpImplements(guildContext);
    });
  }

  public static queueLeaveGuildManyMembers(guildContext: GuildContext, discordUserIds: string[]): Promise<void> {
    return this.queue(guildContext, async () => {
      guildContext.guildLog(`Performing guild-leave cleanup of ${discordUserIds.length} members.`);
      let promises: Promise<void>[] = [];
      for(let discordUserId of discordUserIds) {
        promises.push(UserDatabaseService.leaveGuild(guildContext, discordUserId));
      }
      await Promise.all(promises);
      await MajorImplementService.cleanUpImplements(guildContext);
    });
  }

  public static queueToggleTAStatus(guildContext: GuildContext, member: Discord.GuildMember, courses: Course[]): Promise<void> {
    return this.queue(guildContext, async () => {
      guildContext.guildLog(`Toggling TA status for ${DiscordUtils.describeUserForLogs(member.user)} in courses:`, courses);
  
      await UserDatabaseService.toggleTAStatusForMember(guildContext, member, courses);
  
      await DiscordRoleAssignmentService.computeAndApplyRoleChanges(guildContext, member);
  
      await MajorImplementService.cleanUpImplements(guildContext);
    });
  }

  public static queueMarkVerified(guildContext: GuildContext, member: Discord.GuildMember): Promise<void> {
    return this.queue(guildContext, async () => {
      guildContext.guildLog(`Marking ${DiscordUtils.describeUserForLogs(member.user)} verified.`);
  
      await UserDatabaseService.setUserVerified(member.user.id);
  
      const banned = await BanService.banIfBannedStudentId(member.user.id);
      if(!banned)    
        await DiscordRoleAssignmentService.computeAndApplyRoleChanges(guildContext, member);
    });
  }

  public static queueSynchronizeRolesManyMembers(guildContext: GuildContext, members: Discord.GuildMember[]): Promise<void> {
    return this.queue(guildContext, async () => {
      await this.synchronizeRolesManyMembers(guildContext, members);
    });
  }

  private static async synchronizeRolesManyMembers(guildContext: GuildContext, members: Discord.GuildMember[]): Promise<void> {
    guildContext.guildLog(`Synchronizing roles for ${members.length} members...`);
    let promises: Promise<void>[] = [];
    for(let member of members) {
      promises.push(DiscordRoleAssignmentService.computeAndApplyRoleChanges(guildContext, member));
    }
    await Promise.all(promises);
  }
}