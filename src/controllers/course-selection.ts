import * as Discord from "discord.js";
import { CourseService } from "src/services/course";
import { CourseUtils } from "src/utils/course";
import { GuildContext } from "src/guild-context";
import { timer } from "rxjs";

export class CourseSelectionController {
  public static readonly CHANNEL_NAME = "course-selector";

  constructor(
    private guildContext: GuildContext,
    private courseService: CourseService
  ) { }

  public onMessageReceived(message: Discord.Message | Discord.PartialMessage): void {
    console.log(`Course selection message received: ${message.content}`);

    if (message.content.toLowerCase().startsWith("join")) {
      this.onJoinRequest(message);
    } else if (message.content.toLowerCase().startsWith("leave")) {
      this.onLeaveRequest(message);
    } else {
      // TODO: Create a partial request and ask the user what they meant?
      this.sendTempReply(message, `${message.author}, make sure your request starts with 'join' or 'leave'. For example: 'join 1410 2420'`);
    }

    this.scrubMessage(message);
  }

  private onJoinRequest(message: Discord.Message | Discord.PartialMessage) {
    const numbers = CourseUtils.parseCourseNumberList(message.content.substring("join".length));
    if (numbers.length === 0) {
      this.sendTempReply(message, `${message.author}, I didn't see any course numbers in your request! Here's an example: 'join 1410 2420'`);
      return;
    }

    this.courseService.getCoursesFromNumberList(numbers)
      .then(courses => {
        const invalidNumbers = courses.reduce((invalid, course, index) => {
          if (!course) {
            invalid.push(numbers[index]);
          }

          return invalid;
        }, []);

        const validCourses = courses.filter(course => course);

        // TODO: Assign courses.
        // TODO: Limit to some number of courses.

        if (invalidNumbers.length > 0) {
          this.sendTempReply(message,
            `Good news and bad news, ${message.author}. Wherever I could, I have added you to the requested courses. However, the following courses do not appear to be valid: [${invalidNumbers.join(", ")}]. If you think this is a mistake, ask an admin for help!`
          );
        } else {
          this.sendTempReply(message, `Success! ${message.author}, I have added you to the requested courses.`);
        }
      })
      .catch(err => {
        console.error("Failed to parse courses from join request.");
        console.error(err);
        this.sendTempReply(message,
          `${message.author}, sorry, something went wrong while I was trying to read your message. Try again or ask an admin for help! Here's an example: 'join 1410 2420'`
        );
      });
  }

  private onLeaveRequest(message: Discord.Message | Discord.PartialMessage) {
    const numbers = CourseUtils.parseCourseNumberList(message.content.substring("leave".length));
    if (numbers.length === 0) {
      this.sendTempReply(message, `${message.author}, I didn't see any course numbers in your request! Here's an example: 'leave 1410 2420'`);
      return;
    }

    this.courseService.getCoursesFromNumberList(numbers)
      .then(courses => {
        const invalidNumbers = courses.reduce((invalid, course, index) => {
          if (!course) {
            invalid.push(numbers[index]);
          }

          return invalid;
        }, []);

        const validCourses = courses.filter(course => course);

        // TODO: Unassign courses.

        if (invalidNumbers.length > 0) {
          this.sendTempReply(message,
            `Good news and bad news, ${message.author}. Wherever I could, I have removed you from the requested courses. However, the following courses do not appear to be valid: [${invalidNumbers.join(", ")}]. If you think this is a mistake, ask an admin for help!`
          );
        } else {
          this.sendTempReply(message, `Success! ${message.author}, I have removed you from the requested courses.`);
        }
      })
      .catch(err => {
        console.error("Failed to parse courses from join request.");
        console.error(err);
        this.sendTempReply(message,
          `${message.author}, sorry, something went wrong while I was trying to read your message. Try again or ask an admin for help! Here's an example: 'join 1410 2420'`
        );
      });
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
        console.error("Could not scrub (delete) course selection message. Please fix this, as it is a privacy concern.");
        console.error(err);
      });
  }
}