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
    private courseService: CourseService,
    private userService: UserDatabaseService,
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
    // TODO: extract duplicate code from this method and leave method
    const numbers = CourseUtils.parseCourseNumberList(message.content.substring("join".length));
    // Check for empty request
    if (Object.keys(numbers).length === 0) {
      // TODO: Example based on majors
      this.sendTempReply(message, `${message.author}, I didn't see any course numbers in your request! Here's an example: 'join cs1410 phys2420'`);
      return;
    }

    // Fix ambiguity
    if (!this.disambiguateNumbers(numbers)) {
      // TODO: Example based on majors
      this.sendTempReply(message, `${message.author}, please specify major prefixes for each of your courses. For example: 'join cs1410 phys2420'`);
      return;
    }

    // Check for non-existent majors
    const invalidMajors = _.filter(Object.keys(numbers), majorPrefix => {
      return majorPrefix && !this.guildContext.majors[majorPrefix];
    });
    if (invalidMajors.length > 0) {
      this.sendTempReply(message, `${message.author}, the major(s) '${invalidMajors.join(", ")}' are not valid in this server. The valid majors are: ${Object.keys(this.guildContext.majors).join(", ")}`);
      return;
    }

    // Convert numbers to courses
    const courseResolverPromises: Promise<Course[]>[] = [];
    _.forIn(numbers, (majorNumbers, majorPrefix) => {
      courseResolverPromises.push(this.courseService.getCoursesFromNumberList(majorNumbers, this.guildContext.majors[majorPrefix]));
    });

    Promise.all(courseResolverPromises)
      .then(allCourses => {
        // Remove invalid courses and keep track of them to show the user.
        let invalidCourseNames: string[] = [];
        allCourses = allCourses.map((courses, coursesIndex) => {
          return courses.filter((course, index) => {
            if (!course) {
              invalidCourseNames.push(`${Object.keys(numbers)[coursesIndex]}${Object.values(numbers)[coursesIndex][index]}`);
              return false;
            }
            return true;
          });
        });

        // Merge courses
        const mergedCourses = _.flatten(allCourses);
        const mergedCoursesNames = mergedCourses.map(course => CourseUtils.convertToString(course));

        // Add all courses to member.
        this.userService.addCoursesToMember(message.member, mergedCourses)
          .then(() => {
            if (invalidCourseNames.length > 0) {
              // TODO: Handle case where mergedCourseNames len == 0 (all invalid)
              this.sendTempReply(message,
                `${message.author}, I have added you to the following courses: ${mergedCoursesNames.join(", ")}. However, the following courses do not appear to be valid: ${invalidCourseNames.join(", ")}. If you think this is a mistake, ask an admin for help!`
              );
            } else {
              this.sendTempReply(message, `Success! ${message.author}, I have added you to the following courses: ${mergedCoursesNames.join(", ")}`);
            }
          })
          .catch(err => {
            console.error("Failed to add courses to member during join request.");
            console.error(err);
            this.sendTempReply(message, `Sorry ${message.author}, something internal went wrong when I tried to assign your courses. Try again, and if it still doesn't work then ask an admin for help!`);
          });
      })
      .catch(err => {
        console.error("Failed to parse courses from join request.");
        console.error(err);
        this.sendTempReply(message,
          `${message.author}, sorry, something went wrong while I was trying to read your message. Try again or ask an admin for help! Here's an example: 'join cs1410 phys2420'`
          // TODO: better example
        );
      });
  }

  // TODO: remove duplicate code
  private onLeaveRequest(message: Discord.Message | Discord.PartialMessage) {
    const numbers = CourseUtils.parseCourseNumberList(message.content.substring("leave".length));
    // Check for empty request
    if (Object.keys(numbers).length === 0) {
      // TODO: Example based on majors
      this.sendTempReply(message, `${message.author}, I didn't see any course numbers in your request! Here's an example: 'leave cs1410 phys2420'`);
      return;
    }

    // Fix ambiguity
    if (!this.disambiguateNumbers(numbers)) {
      // TODO: Example based on majors
      this.sendTempReply(message, `${message.author}, please specify major prefixes for each of your courses. For example: 'leave cs1410 phys2420'`);
      return;
    }

    // Check for non-existent majors
    const invalidMajors = _.filter(Object.keys(numbers), majorPrefix => {
      return majorPrefix && !this.guildContext.majors[majorPrefix];
    });
    if (invalidMajors.length > 0) {
      this.sendTempReply(message, `${message.author}, the major(s) '${invalidMajors.join(", ")}' are not valid in this server. The valid majors are: ${Object.keys(this.guildContext.majors).join(", ")}`);
      return;
    }

    // Convert numbers to courses
    const courseResolverPromises: Promise<Course[]>[] = [];
    _.forIn(numbers, (majorNumbers, majorPrefix) => {
      courseResolverPromises.push(this.courseService.getCoursesFromNumberList(majorNumbers, this.guildContext.majors[majorPrefix]));
    });

    Promise.all(courseResolverPromises)
      .then(allCourses => {
        // Remove invalid courses and keep track of them to show the user.
        let invalidCourseNames: string[] = [];
        allCourses = allCourses.map((courses, coursesIndex) => {
          return courses.filter((course, index) => {
            if (!course) {
              invalidCourseNames.push(`${Object.keys(numbers)[coursesIndex]}${Object.values(numbers)[coursesIndex][index]}`);
              return false;
            }
            return true;
          });
        });

        // Merge courses
        const mergedCourses = _.flatten(allCourses);
        const mergedCoursesNames = mergedCourses.map(course => CourseUtils.convertToString(course));

        // Remove all courses from member.
        this.userService.removeCoursesFromMember(message.member, mergedCourses)
          .then(() => {
            if (invalidCourseNames.length > 0) {
              this.sendTempReply(message,
                `${message.author}, I have removed you from the following courses: ${mergedCoursesNames.join(", ")}. However, the following courses do not appear to be valid: [${invalidCourseNames.join(", ")}]. If you think this is a mistake, ask an admin for help!`
              );
            } else {
              this.sendTempReply(message, `Success! ${message.author}, I have removed you from the following courses: ${mergedCoursesNames.join(", ")}.`);
            }
          })
          .catch(err => {
            console.error("Failed to remove courses from member during leave request.");
            console.error(err);
            this.sendTempReply(message, `Sorry ${message.author}, something internal went wrong when I tried to remove your courses. Try again, and if it still doesn't work then ask an admin for help!`);
          });
      })
      .catch(err => {
        console.error("Failed to parse courses from leave request.");
        console.error(err);
        this.sendTempReply(message,
          `${message.author}, sorry, something went wrong while I was trying to read your message. Try again or ask an admin for help! Here's an example: 'leave cs1410 phys2420'`
          // TODO: better example
        );
      });
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
        timer(30_000).subscribe(() => {
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