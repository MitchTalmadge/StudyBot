import * as Discord from "discord.js";
import { GuildContext } from "guild-context";
import { Course } from "models/course";
import { VerificationStatus } from "models/verification-status";
import { ConfigService } from "services/config";
import { UserDatabaseService } from "services/database/user";

import { CourseImplementService } from "../implement/course/implement";
import { VerificationImplementService } from "../implement/verification/implement";
export class DiscordRoleAssignmentService {
  public static async computeAndApplyRoleChanges(guildContext: GuildContext, discordMember: Discord.GuildMember): Promise<void> {
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
    //TODO: Won't work for non-catalog majors
    for(let courses of Object.values(guildContext.courses)) {
      for(let course of courses) {
        // If the user is assigned to this course...
        const assignment = user.guilds.get(guildContext.guild.id).courses.find(courseAssignment => courseAssignment.courseKey === course.key);
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
    if (rolesToRemove.length > 0)
      discordMember = await discordMember.roles.remove(rolesToRemove, "StudyBot automatic role removal.");
  }
}