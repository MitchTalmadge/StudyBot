import * as Discord from "discord.js";
import { Course } from "src/models/course";
import { CourseService } from "src/services/course";
import { CourseUtils } from "src/utils/course";
import { GuildContext } from "src/guild-context";
import { Major } from "src/models/major";
import { UserDatabaseService } from "src/services/database/user";
import _ from "lodash";
import { timer } from "rxjs";

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
      this.onJoinRequest(message);
    } else if (message.content.toLowerCase().startsWith("leave")) {
      this.onLeaveRequest(message);
    } else {
      // TODO: Create a partial request and ask the user what they meant?
      this.sendTempReply(message, `${message.author}, I'm not sure what you want to do. Make sure your request starts with 'join' or 'leave'. For example: 'join cs1410 phys2420'`);
    }

    this.scrubMessage(message);
  }

  private onJoinRequest(message: Discord.Message | Discord.PartialMessage) {
    this.joinOrLeaveCourses(message, "join");
  }

  private onLeaveRequest(message: Discord.Message | Discord.PartialMessage) {
    this.joinOrLeaveCourses(message, "leave");
  }

  private joinOrLeaveCourses(message: Discord.Message | Discord.PartialMessage, action: "join" | "leave"): void {
    const numbers = CourseUtils.parseCourseNumberList(message.content.substring(action.length));
    // Check for empty request
    if (Object.keys(numbers).length === 0) {
      // TODO: Example based on majors
      this.sendTempReply(message, `${message.author}, I didn't see any course numbers in your request! Here's an example: '${action} cs1410 phys2420'`);
      return;
    }

    // Fix ambiguity
    if (!this.disambiguateNumbers(numbers)) {
      // TODO: Example based on majors
      this.sendTempReply(message, `${message.author}, please specify major prefixes for each of your courses. For example: '${action} cs1410 phys2420'`);
      return;
    }

    // Check for non-existent majors
    const invalidMajors = this.getInvalidMajors(Object.keys(numbers));
    if (invalidMajors.length > 0) {
      this.sendTempReply(message, `Sorry ${message.author}, the major(s) '${invalidMajors.join(", ")}' are not valid in this server. The valid majors are: ${Object.keys(this.guildContext.majors).join(", ")}`);
      return;
    }

    // Convert numbers to courses
    this.courseService.getCoursesFromNumberListsByMajor(numbers)
      .then(result => {
        // Remove invalid courses and keep track of them to show the user.
        const allValidCourses: Course[] = [];
        const allValidCourseNames: string[] = [];
        const allInvalidCourseNames: string[] = [];
        _.keys(result).forEach(major => {
          const courses = result[major];
          allValidCourses.push(...courses.validCourses);
          allValidCourseNames.push(...courses.validCourses.map(c => CourseUtils.convertToString(c)));
          allInvalidCourseNames.push(...courses.invalidCourses);
        });

        // Add all courses to member.
        Promise.resolve()
          .then(() => {
            if(action == "join")
              return UserDatabaseService.addCoursesToMember(this.guildContext, message.member, allValidCourses);
            else
              return UserDatabaseService.removeCoursesFromMember(this.guildContext, message.member, allValidCourses);
          })
          .then(() => {
            if (allValidCourses.length === 0) {
              this.sendTempReply(message,
                `Sorry ${message.author}, none of the courses you specified appear to be valid: ${allInvalidCourseNames.join(", ")}. If you think this is a mistake, ask an admin for help!`
              );
            } else if (allInvalidCourseNames.length > 0) {
              this.sendTempReply(message,
                `${message.author}, I have ${action === "join" ? "added you to" : "removed you from"} the following courses: ${allValidCourseNames.join(", ")}. However, the following courses do not appear to be valid: ${allInvalidCourseNames.join(", ")}. If you think this is a mistake, ask an admin for help!`
              );
            } else {
              this.sendTempReply(message, `Success! ${message.author}, I have ${action === "join" ? "added you to" : "removed you from"} the following courses: ${allValidCourseNames.join(", ")}`);
            }
          })
          .catch(err => {
            console.error(`Failed to set courses for member during ${action} request.`);
            console.error(err);
            this.sendTempReply(message, `Sorry ${message.author}, something internal went wrong when I tried to assign your courses. Try again, and if it still doesn't work then ask an admin for help!`);
          });
      })
      .catch(err => {
        console.error(`Failed to parse courses from ${action} request.`);
        console.error(err);
        this.sendTempReply(message,
          `${message.author}, sorry, something went wrong while I was trying to read your message. Try again or ask an admin for help! Here's an example: '${action} cs1410 phys2420'`
          // TODO: better example
        );
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

  private sendTempReply(message: Discord.Message | Discord.PartialMessage, reply: string): void {
    message.channel.send(reply)
      .then(sentMessage => {
        timer(20_000).subscribe(() => {
          this.scrubMessage(sentMessage);
        });
      })
      .catch(err => {
        console.error("Could not send course selection reply message.");
        console.error(err);
      });
  }

  private scrubMessage(message: Discord.Message | Discord.PartialMessage) {
    message.delete({
      reason: "Automatic scrubbing of course selection message to maintain privacy."
    })
      .catch(err => {
        if(err.httpStatus) {
          if(err.httpStatus === 404) {
            // Message was deleted by someone else.
            console.error("Could not scrub (delete) course selection message. It may have been deleted by someone else.");
            return;
          }
        }
        console.error("Could not scrub (delete) course selection message. Please fix this, as it is a privacy concern.");
        console.error(err);
      });
  }
}