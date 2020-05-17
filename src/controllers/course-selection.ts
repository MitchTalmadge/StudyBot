import * as Discord from "discord.js";
import { Course } from "src/models/course";
import { CourseService } from "src/services/course";
import { CourseUtils } from "src/utils/course";
import { GuildContext } from "src/guild-context";
import { Major } from "src/models/major";
import { UserDatabaseService } from "src/services/database/user";
import _ from "lodash";

export class CourseSelectionController {
  public static readonly CHANNEL_NAME = "course-selector";

  constructor(
    private guildContext: GuildContext,
    private courseService: CourseService
  ) { 
    // TODO: Delete all messages in channel on startup and write an instructions message.
  }

  public onMessageReceived(message: Discord.Message | Discord.PartialMessage): void {
    if (message.content.toLowerCase().startsWith("join")) {
      this.sendReply(message, "Request queued, please wait...");
      this.joinOrLeaveCourses(message, "join")  
        .then(result => {
          const validCourseNames = result.validCourses.map(c => CourseUtils.convertToString(c));
          if(result.invalidCourseNames.length > 0) {
            this.sendReply(message, `${message.author}, I have added you to the following courses: ${validCourseNames.join(", ")}. However, the following courses do not appear to be valid: ${result.invalidCourseNames.join(", ")}.`);
          } else {
            this.sendReply(message, `Success! ${message.author}, I have added you to the following courses: ${validCourseNames.join(", ")}.`); 
          }
        })
        .catch(err => {
          this.sendReply(message, `${err} Example usage: join cs1410 phys2210`);
          // TODO: Better example.
        });
    } else if (message.content.toLowerCase().startsWith("leave")) {
      this.sendReply(message, "Request queued, please wait...");
      this.joinOrLeaveCourses(message, "leave")  
        .then(result => {
          const validCourseNames = result.validCourses.map(c => CourseUtils.convertToString(c));
          if(result.invalidCourseNames.length > 0) {
            this.sendReply(message, `${message.author}, I have removed you from the following courses: ${validCourseNames.join(", ")}. However, the following courses do not appear to be valid: ${result.invalidCourseNames.join(", ")}.`);
          } else {
            this.sendReply(message, `Success! ${message.author}, I have removed you from the following courses: ${validCourseNames.join(", ")}.`); 
          }
        })
        .catch(err => {
          this.sendReply(message, `${err} Example usage: leave cs1410 phys2210`);
          // TODO: Better example.
        });
    } else if (message.content.toLowerCase().startsWith("ta")) {
      // Join the courses just in case (also takes care of validation).
      this.sendReply(message, "Request queued, please wait...");
      this.joinOrLeaveCourses(message, "join")  
        .then(result => {
          const validCourseNames = result.validCourses.map(c => CourseUtils.convertToString(c));
          return UserDatabaseService.toggleTAStatusForMember(this.guildContext, message.member, result.validCourses)
            .then(() => {
              if(result.invalidCourseNames.length > 0) {
                this.sendReply(message, `${message.author}, I have toggled your TA status for the following courses: ${validCourseNames.join(", ")}. However, the following courses do not appear to be valid: ${result.invalidCourseNames.join(", ")}.`);
              } else {
                this.sendReply(message, `Success! ${message.author}, I have toggled your TA status for the following courses: ${validCourseNames.join(", ")}.`); 
              }
            });
        })
        .catch(err => {
          this.sendReply(message, `${err} Example usage: ta cs1410 phys2210`);
          // TODO: Better example.
        });
    } else {
      this.sendReply(message, `${message.author}, I'm not sure what you want to do. Make sure your request starts with 'join', 'leave', or 'ta'. For example: 'join cs1410 phys2420'`);
    }
  }

  private joinOrLeaveCourses(message: Discord.Message | Discord.PartialMessage, action: "join" | "leave"): Promise<{validCourses: Course[], invalidCourseNames: string[]}> {
    const separatorIndex = message.content.indexOf(" ");
    if(separatorIndex === -1) {
      return Promise.reject(`${message.author}, I didn't see any course numbers in your request!`);
    }
    
    const numbers = CourseUtils.parseCourseNumberList(message.content.substring(separatorIndex + 1));
    // Check for empty request
    if (Object.keys(numbers).length === 0) {
      return Promise.reject(`${message.author}, I didn't see any course numbers in your request!`);
    }

    // Fix ambiguity
    if (!this.disambiguateNumbers(numbers)) {
      return Promise.reject(`${message.author}, please specify major prefixes for each of your courses.`);
    }

    // Check for non-existent majors
    const invalidMajors = this.getInvalidMajors(Object.keys(numbers));
    if (invalidMajors.length > 0) {
      return Promise.reject(`Sorry ${message.author}, the major(s) '${invalidMajors.join(", ")}' are not valid in this server. The valid majors are: ${Object.keys(this.guildContext.majors).join(", ")}`);
    }

    // Convert numbers to courses
    return this.courseService.getCoursesFromNumberListsByMajor(numbers)
      .catch(err => {
        console.error(`Failed to parse courses from ${action} request.`);
        console.error(err);
        return Promise.reject(`${message.author}, sorry, something went wrong while I was trying to read your message. Try again or ask an admin for help!`);
      })
      .then(result => {
        // Remove invalid courses and keep track of them to show the user.
        const allValidCourses: Course[] = [];
        const allInvalidCourseNames: string[] = [];
        _.keys(result).forEach(major => {
          const courses = result[major];
          allValidCourses.push(...courses.validCourses);
          allInvalidCourseNames.push(...courses.invalidCourseNames);
        });

        // Add all courses to member.
        return Promise.resolve()
          .then(() => {
            if(action == "join")
              return UserDatabaseService.addCoursesToMember(this.guildContext, message.member, allValidCourses);
            else
              return UserDatabaseService.removeCoursesFromMember(this.guildContext, message.member, allValidCourses);
          })
          .catch(err => {
            console.error(`Failed to set courses for member during ${action} request.`);
            console.error(err);
            return Promise.reject(`Sorry ${message.author}, something internal went wrong when I tried to assign your courses. Try again or ask an admin for help!`);
          })
          .then(() => {
            if (allValidCourses.length === 0) {
              return Promise.reject(`Sorry ${message.author}, none of the courses you specified appear to be valid: ${allInvalidCourseNames.join(", ")}. If you think this is a mistake, ask an admin for help!`);
            }

            return { validCourses: allValidCourses, invalidCourseNames: allInvalidCourseNames };
          });          
      });
  }

  /**
   * Determines which of the major prefixes passed in are invalid.
   * @param prefixes The prefixes, lowercased.
   * @returns An array containing the invalid prefixes.
   */
  private getInvalidMajors(prefixes: string[]): string[] {
    const invalidMajors = _.filter(prefixes, prefix => {
      return prefix && !this.guildContext.majors[prefix];
    });
    return invalidMajors;
  }

  /**
   * Attempts to remove ambiguity from the parsed numbers (having an empty major when more than one major could be a candidate).
   *
   * @param numbers The numbers to disambiguate.
   * @return True if disambiguated. False if cannot be done.
   */
  private disambiguateNumbers(numbers: { [majorPrefix: string]: string[] }): boolean {
    if (numbers[""]) {
      if (Object.keys(this.guildContext.majors).length > 1) {
        return false;
      } else {
        const major: Major = Object.values(this.guildContext.majors)[0];
        if (!numbers[major.prefix]) {
          numbers[major.prefix] = numbers[""];
        } else {
          numbers[major.prefix] = _.union(numbers[major.prefix], numbers[""]);
        }
        delete numbers[""];
      }
    }

    return true;
  }

  private sendReply(message: Discord.Message | Discord.PartialMessage, reply: string): void {
    message.channel.send(reply)
      .catch(err => {
        console.error("Could not send course selection reply message.");
        console.error(err);
      });
  }
}