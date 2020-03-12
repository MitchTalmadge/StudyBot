import * as Discord from "discord.js";
import { CourseService } from "./services/course";
import { GuildConfig } from "./models/config";
import { Major } from "./models/major";
import { WebCatalogFactory } from "./services/web-catalog/web-catalog-factory";

/**
 * For the purposes of the bot, wraps up everything it needs to know about one guild.
 * Since each guild would have its own major, users, roles, channels, etc., this helps keep things separate.
 */
export class GuildContext {

  private courseService: CourseService;

  constructor(
    private client: Discord.Client,
    public guild: Discord.Guild,
    private guildConfig: GuildConfig,
    public major: Major) {
    this.courseService = new CourseService(
      this,
      new WebCatalogFactory().getWebCatalog(guildConfig.webCatalog)
    );
  }

  public onMessageReceived(message: Discord.Message | Discord.PartialMessage) {
    console.log(`Message received from ${message.author.username}: ${message.content}`);
  }
}