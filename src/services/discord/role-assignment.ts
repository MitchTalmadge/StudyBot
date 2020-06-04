import * as Discord from "discord.js";
import { ConfigService } from "services/config";
import { Course } from "models/course";
import { CourseImplementService } from "../implement/course/implement";
import { CourseUtils } from "utils/course";
import { DiscordUtils } from "utils/discord";
import { GuildContext } from "guild-context";
import { UserDatabaseService } from "services/database/user";
import { VerificationImplementService } from "../implement/verification/implement";
import { VerificationStatus } from "models/verification-status";
export class RoleAssignmentDiscordService {
  private static roleAssignmentQueues: { [guildId: string]: Promise<void> } = {};

  /**
   * Queues a promise by appending it to the guild's queue chain.
   * @param guildContext The guild initiating the queue request.
   * @param promiseFunc A function that returns the promise to execute.
   */
  private static queue(guildContext: GuildContext, promiseFunc: () => Promise<any>): Promise<void> {
    if (!this.roleAssignmentQueues[guildContext.guild.id]) {
      this.roleAssignmentQueues[guildContext.guild.id] = Promise.resolve();
    }

    this.roleAssignmentQueues[guildContext.guild.id] =
      this.roleAssignmentQueues[guildContext.guild.id].finally(() => {
        // Delay each queue action to help avoid rate limits.
        return DiscordUtils.rateLimitAvoidance().then(promiseFunc);
      });

    return this.roleAssignmentQueues[guildContext.guild.id];
  }

  /**
   * Queues role computation for a member, which will automatically determine and apply role changes.
   * @param guildContext The guild context.
   * @param discordMember The member whose roles to update.
   * @param courses The courses to add as roles.
   */
  public static queueRoleComputation(guildContext: GuildContext, discordMember: Discord.GuildMember): Promise<void> {
    return this.queue(
      guildContext,
      () => this.computeAndApplyRoleChanges(guildContext, discordMember))
      .then(() => {
        guildContext.guildLog(`Roles updated for member ${DiscordUtils.describeUserForLogs(discordMember.user)}.`);
      })
      .catch(err => {
        guildContext.guildError(`Failed to assign roles to member ${DiscordUtils.describeUserForLogs(discordMember.user)}:`, err);
      });
  }

  private static async computeAndApplyRoleChanges(guildContext: GuildContext, discordMember: Discord.GuildMember): Promise<void> {
    const user = await UserDatabaseService.findOrCreateUser(discordMember.id, guildContext);

    const rolesToAdd: string[] = [];
    const rolesToRemove: string[] = [];
    const coursesToRemove: Course[] = [];
    
    // Verification 
    if(ConfigService.getConfig().verification.enabled) {
      const verificationImplement = await VerificationImplementService.getOrCreateVerificationImplement(guildContext);
      if(user.verificationStatus === VerificationStatus.VERIFIED) {
        rolesToAdd.push(verificationImplement.roleId);
      } else {
        rolesToRemove.push(verificationImplement.roleId);
      }
    }

    // Courses
    for(let courses of Object.values(guildContext.courses)) {
      for(let course of courses) {
        // If the user is assigned to this course...
        const assignment = user.guilds.get(guildContext.guild.id).courses.find(courseAssignment => courseAssignment.courseKey === CourseUtils.convertToString(course));
        if(assignment) {
          // (User is assigned to course.)
          const courseImplement = await CourseImplementService.getOrCreateCourseImplement(guildContext, course);
          rolesToAdd.push(courseImplement.mainRoleId);

          // Check TA status.
          if(assignment.isTA) {
            rolesToAdd.push(courseImplement.taRoleId);
          } else {
            rolesToRemove.push(courseImplement.taRoleId);
          }
        } else {
          // (User is not assigned to course.)
          const courseImplement = await CourseImplementService.getCourseImplementIfExists(guildContext, course);
          if(courseImplement) {
            rolesToRemove.push(courseImplement.mainRoleId);
            rolesToRemove.push(courseImplement.taRoleId);
            coursesToRemove.push(course);
          }
        }
      }
    }

    // Apply assignments.
    if (rolesToAdd.length > 0)
      discordMember = await discordMember.roles.add(rolesToAdd, "StudyBot automatic role assignment.");
    if(rolesToAdd.length > 0 && rolesToRemove.length > 0)
      await DiscordUtils.rateLimitAvoidance();  
    if (rolesToRemove.length > 0) {
      discordMember = await discordMember.roles.remove(rolesToRemove, "StudyBot automatic role removal.");
    
      // Delete implements of courses no longer used by anyone.
      for (let course of coursesToRemove) {
        await CourseImplementService.deleteCourseImplementIfEmpty(guildContext, course);
      }
    }
  }
}