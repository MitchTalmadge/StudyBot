import * as Discord from "discord.js";
import { CommandController } from "controllers/command/command-controller";
import { Course } from "models/course";
import { CourseSelectionChannelController } from "./controllers/channel/course-selection";
import { CourseService } from "./services/course";
import { DevCommandController } from "controllers/command/dev";
import { GuildConfig } from "./models/config";
import { MajorMap } from "./models/major-map";
import { ModeratorCommandController } from "controllers/command/moderator";
import { VerificationChannelController } from "./controllers/channel/verification";
import { WebCatalogFactory } from "./services/web-catalog/web-catalog-factory";
import _ from "lodash";

/**
 * For the purposes of the bot, wraps up everything it needs to know about one guild.
 * Since each guild would have its own major, users, roles, channels, etc., this helps keep things separate.
 */
export class GuildContext {
  private courseSelectionController: CourseSelectionChannelController;
  
  private verificationController: VerificationChannelController;

  private commandControllers: CommandController[] = [];

  /**
   * The list of allowed courses that users can be assigned to.
   * May be empty if the list could not be populated automatically.
   */
  public courses: { [majorPrefix: string]: Course[] };

  constructor(
    public guild: Discord.Guild,
    private guildConfig: GuildConfig,
    public majors: MajorMap) {
    this.guildLog("Initializing course lists...");
    CourseService.fetchCourseList(this, new WebCatalogFactory().getWebCatalog(this.guildConfig.webCatalog))
      .then(courses => this.courses = courses)
      .catch(err => {
        this.guildError("Failed to get course lists from the web catalog.");
        console.error(err);

        _.forIn(majors, major => {
          this.courses[major.prefix] = [];
        });
      });

    this.initControllers();
  }

  private initControllers(): void {
    this.courseSelectionController = new CourseSelectionChannelController(this);
    this.verificationController = new VerificationChannelController(this);

    this.commandControllers.push(new DevCommandController(this));
    this.commandControllers.push(new ModeratorCommandController(this));
  }

  public onMessageReceived(message: Discord.Message | Discord.PartialMessage): void {
    // Channel Controllers
    if (message.channel instanceof Discord.TextChannel) {
      if (message.channel.name === CourseSelectionChannelController.CHANNEL_NAME) {
        this.courseSelectionController.onMessageReceived(message);
      } else if (message.channel.name === VerificationChannelController.CHANNEL_NAME) {
        this.verificationController.onMessageReceived(message);
      }
    }

    // Command Controllers
    this.commandControllers.forEach(commandController => commandController.onMessageReceived(message));
  }

  public guildLog(message: string, ...optionalParams: any): void {
    console.log(`[G: ${this.guild.name}] ${message}`, ...optionalParams);
  }
  
  public guildDebug(message: string, ...optionalParams: any): void {
    if(process.env.NODE_ENV === "development") {
      this.guildLog(`[DEBUG] ${message}`, ...optionalParams);
    }
  }

  public guildError(message: string, ...optionalParams: any): void {
    console.error(`[G: ${this.guild.name}] ${message}`, ...optionalParams);
  }
}