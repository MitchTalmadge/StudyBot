import * as Discord from "discord.js";
import { GuildContext } from "guild-context";
import { VerificationStatus } from "models/verification-status";
import { ConfigService } from "services/config";
import { UserDatabaseService } from "services/database/user";
import { DiscordUtils } from "utils/discord";

import { CourseImplementService } from "../implement/course/implement";
export class DiscordRoleAssignmentService {
  public static async computeAndApplyRoleChanges(guildContext: GuildContext, discordMember: Discord.GuildMember): Promise<void> {
    const user = await UserDatabaseService.findOrCreateUser(discordMember.id, guildContext);

    const rolesToAdd: string[] = [];
    const rolesToRemove: string[] = [];
    
    // Verification 
    if(ConfigService.getConfig().verification.enabled) {
      if(user.verificationStatus === VerificationStatus.VERIFIED) {
        if(!discordMember.roles.cache.has(guildContext.verificationRoleId))
          rolesToAdd.push(guildContext.verificationRoleId);
      } else if(discordMember.roles.cache.has(guildContext.verificationRoleId)) {
        rolesToRemove.push(guildContext.verificationRoleId);
      }
    }

    // Courses
    //TODO: Won't work for non-catalog majors
    for(let courses of Object.values(guildContext.coursesByMajor)) {
      for(let course of courses) {
        const assignment = user.guilds.get(guildContext.guild.id).courses.find(courseAssignment => courseAssignment.courseKey === course.key);
        if(assignment) { // User is assigned to course.
          const courseImplement = await CourseImplementService.getOrCreateCourseImplement(guildContext, course);
          if(!discordMember.roles.cache.has(courseImplement.mainRoleId)) 
            rolesToAdd.push(courseImplement.mainRoleId);

          // Check TA status.
          if(assignment.isTA) {
            if(!discordMember.roles.cache.has(courseImplement.taRoleId))
              rolesToAdd.push(courseImplement.taRoleId);
          } else if(discordMember.roles.cache.has(courseImplement.taRoleId)) {
            rolesToRemove.push(courseImplement.taRoleId);
          }
        } else { // User is not assigned to course.
          const courseImplement = await CourseImplementService.getCourseImplementIfExists(guildContext, course);
          if(courseImplement) {
            if(discordMember.roles.cache.has(courseImplement.mainRoleId))
              rolesToRemove.push(courseImplement.mainRoleId);
            if(discordMember.roles.cache.has(courseImplement.taRoleId))
              rolesToRemove.push(courseImplement.taRoleId);
          }
        }
      }
    }

    // Apply assignments.
    guildContext.guildLog(`+${rolesToAdd.length}/-${rolesToRemove.length} roles for ${DiscordUtils.describeUserForLogs(discordMember.user)}.`);
    if (rolesToAdd.length > 0)
      discordMember = await discordMember.roles.add(rolesToAdd, "StudyBot automatic role assignment.");
    if (rolesToRemove.length > 0)
      discordMember = await discordMember.roles.remove(rolesToRemove, "StudyBot automatic role removal.");
  }
}