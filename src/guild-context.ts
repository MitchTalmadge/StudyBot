import * as Discord from "discord.js";
import { CourseSelectionController } from "./controllers/course-selection";
import { CourseService } from "./services/course";
import { GuildConfig } from "./models/config";
import { Major } from "./models/major";
import { WebCatalogFactory } from "./services/web-catalog/web-catalog-factory";
import { UserService } from "./services/user";

/**
 * For the purposes of the bot, wraps up everything it needs to know about one guild.
 * Since each guild would have its own major, users, roles, channels, etc., this helps keep things separate.
 */
export class GuildContext {
  private courseService: CourseService;

  private userService: UserService;

  private courseSelectionController: CourseSelectionController;

  constructor(
    private client: Discord.Client,
    public guild: Discord.Guild,
    private guildConfig: GuildConfig,
    public major: Major) {
    this.initServices();
    this.initControllers();
  }

  private initServices(): void {
    this.courseService = new CourseService(
      this,
      new WebCatalogFactory().getWebCatalog(this.guildConfig.webCatalog)
    );
    this.guildLog("Initializing course list...");
    this.courseService.updateCourseList();

    this.userService = new UserService(
      this
    );
  }

  private initControllers(): void {
    this.courseSelectionController = new CourseSelectionController(
      this,
      this.courseService,
      this.userService
    );
  }

  public onMessageReceived(message: Discord.Message | Discord.PartialMessage): void {
    if (message.channel instanceof Discord.TextChannel) {
      if (message.channel.name === CourseSelectionController.CHANNEL_NAME) {
        this.courseSelectionController.onMessageReceived(message);
      }
    }
  }

  private guildLog(message: string): void {
    console.log(`[G: ${this.guild.name}] ${message}`);
  }
}