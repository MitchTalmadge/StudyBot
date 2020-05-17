import * as Discord from "discord.js";
import { Course } from "src/models/course";
import { CourseImplementDiscordService } from "./implement/course";
import { GuildContext } from "src/guild-context";

export class RoleAssignmentDiscordService {

  private static roleAssignmentQueues: { [guildId: string]: Promise<void> } = {};

  /**
   * Queues a promise by appending it to the guild's queue chain.
   * @param guildContext The guild initiating the queue request.
   * @param promise The promise to queue.
   */
  private static queue(guildContext: GuildContext, promise: Promise<any>): void {
    if (!this.roleAssignmentQueues[guildContext.guild.id]) {
      this.roleAssignmentQueues[guildContext.guild.id] = Promise.resolve();
    }

    this.roleAssignmentQueues[guildContext.guild.id] =
      this.roleAssignmentQueues[guildContext.guild.id].finally(() => {
        return promise;
      });
  }

  /**
   * Queues course role additions for a member.
   * @param guildContext The guild context.
   * @param discordMember The member whose roles to update.
   * @param courses The courses to add as roles.
   */
  public static queueCourseRolesAddition(guildContext: GuildContext, discordMember: Discord.GuildMember, courses: Course[]): Promise<void> {
    const promise = this.assignCourseRoles(guildContext, discordMember, courses, [])
      .then(() => {
        console.log("Roles assigned.");
      })
      .catch(err => {
        console.error(`Failed to assign roles to member ${discordMember.id}:`, err);
      });

    this.queue(
      guildContext,
      promise
    );

    return promise;
  }

  /**
   * Queues course role removals for a member.
   * @param guildContext The guild context.
   * @param discordMember The member whose roles to update.
   * @param courses The courses to remove as roles.
   */
  public static queueCourseRolesRemoval(guildContext: GuildContext, discordMember: Discord.GuildMember, courses: Course[]): Promise<void> {
    const promise = this.assignCourseRoles(guildContext, discordMember, [], courses)
      .then(() => {
        console.log("Roles removed.");
      })
      .catch(err => {
        console.error(`Failed to remove roles from member ${discordMember.id}:`, err);
      });

    this.queue(
      guildContext,
      promise
    );

    return promise;
  }

  public static queueTARoleAssignments(guildContext: GuildContext, discordMember: Discord.GuildMember, taCourses: Course[], nonTACourses: Course[]): void {
    this.queue(
      guildContext,
      this.assignTARoles(guildContext, discordMember, taCourses, nonTACourses)
        .then(() => {
          console.log("TA roles assigned.");
        })
        .catch(err => {
          console.error(`Failed to assign TA roles for member ${discordMember.id}:`, err);
        })
    );
  }

  private static async assignCourseRoles(guildContext: GuildContext, discordMember: Discord.GuildMember, coursesToAdd: Course[], coursesToRemove: Course[]): Promise<void> {
    // Addition
    let rolesToAdd: string[] = [];
    for (let course of coursesToAdd) {
      const courseImplement = await CourseImplementDiscordService.getOrCreateCourseImplement(guildContext, course);
      rolesToAdd.push(courseImplement.mainRoleId);
    }
    if (rolesToAdd.length > 0)
      discordMember = await discordMember.roles.add(rolesToAdd, "StudyBot automatic role assignment");

    // Removal
    let rolesToRemove: string[] = [];
    for (let course of coursesToRemove) {
      // Users can 
      const courseImplement = await CourseImplementDiscordService.getCourseImplementIfExists(guildContext, course);
      if (courseImplement) {
        rolesToRemove.push(courseImplement.mainRoleId);
        // We also remove the TA role since a user cannot TA a course they are not in.
        rolesToRemove.push(courseImplement.taRoleId);
      }
    }
    if (rolesToRemove.length > 0) {
      discordMember = await discordMember.roles.remove(rolesToRemove, "StudyBot automatic role removal");

      // Check if nobody is in the course anymore.
      for (let course of coursesToRemove) {
        await CourseImplementDiscordService.deleteCourseImplementIfEmpty(guildContext, course);
      }
    }
  }

  private static async assignTARoles(guildContext: GuildContext, discordMember: Discord.GuildMember, taCourses: Course[], nonTACourses: Course[]): Promise<void> {
    // Addition
    let rolesToAdd: string[] = [];
    for (let course of taCourses) {
      const courseImplement = await CourseImplementDiscordService.getOrCreateCourseImplement(guildContext, course);
      rolesToAdd.push(courseImplement.taRoleId);
    }
    if (rolesToAdd.length > 0)
      discordMember = await discordMember.roles.add(rolesToAdd, "StudyBot automatic role assignment");

    // Removal
    let rolesToRemove: string[] = [];
    for (let course of nonTACourses) {
      const courseImplement = await CourseImplementDiscordService.getCourseImplementIfExists(guildContext, course);
      if (courseImplement)
        rolesToRemove.push(courseImplement.taRoleId);
    }
    if (rolesToRemove.length > 0) {
      discordMember = await discordMember.roles.remove(rolesToRemove, "StudyBot automatic role removal");
    }
  }
}