import * as Discord from "discord.js";
import { CourseSelectionChannelController } from "./controllers/channel/course-selection";
import { CourseService } from "./services/course";
import { GuildConfig } from "./models/config";
import { MajorMap } from "./models/major-map";
import { VerificationChannelController } from "./controllers/channel/verification";
import { WebCatalogFactory } from "./services/web-catalog/web-catalog-factory";

/**
 * For the purposes of the bot, wraps up everything it needs to know about one guild.
 * Since each guild would have its own major, users, roles, channels, etc., this helps keep things separate.
 */
export class GuildContext {
  private courseService: CourseService;

  private courseSelectionController: CourseSelectionChannelController;
  
  private verificationController: VerificationChannelController;

  constructor(
    public guild: Discord.Guild,
    private guildConfig: GuildConfig,
    public majors: MajorMap) {
    this.initServices();
    this.initControllers();
  }

  private initServices(): void {
    this.courseService = new CourseService(
      this,
      new WebCatalogFactory().getWebCatalog(this.guildConfig.webCatalog)
    );
    this.guildLog("Initializing course list...");
    this.courseService.updateCourseLists();
  }

  private initControllers(): void {
    this.courseSelectionController = new CourseSelectionChannelController(
      this,
      this.courseService
    );

    this.verificationController = new VerificationChannelController(this);
  }

  public onMessageReceived(message: Discord.Message | Discord.PartialMessage): void {
    if (message.channel instanceof Discord.TextChannel) {
      if (message.channel.name === CourseSelectionChannelController.CHANNEL_NAME) {
        this.courseSelectionController.onMessageReceived(message);
      } else if (message.channel.name === VerificationChannelController.CHANNEL_NAME) {
        this.verificationController.onMessageReceived(message);
      }
    }
  }

  public guildLog(message: string): void {
    console.log(`[G: ${this.guild.name}] ${message}`);
  }

  public guildError(message: string): void {
    console.error(`[G: ${this.guild.name}] ${message}`);
  }
}