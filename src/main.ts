import * as Discord from "discord.js";
import { ConfigService } from "./services/config";
import { DatabaseService } from "./services/database";
import { GuildContext } from "./guild-context";
import { Major } from "./models/major";

class StudyBot {
  private static client: Discord.Client;

  private static guildContexts: {[guildId: string]: GuildContext} = {};

  public static async init() {
    // Load configuration.
    console.log("Loading config...");
    await ConfigService.loadAndValidateConfig();

    // Connect to database.
    console.log("Connecting to database...");
    await DatabaseService.connect(ConfigService.getConfig().database);

    // Login to Discord.
    console.log("Logging into Discord...");
    this.client = new Discord.Client();
    this.client.login(ConfigService.getConfig().discordToken);

    this.client.on("ready", () => this.onDiscordReady());
    this.client.on("message", (msg) => this.onMessageReceived(msg));
  }

  private static onDiscordReady(): void {
    console.log("Login successful.");

    console.log("Bot is a member of the following Guilds:");
    this.client.guilds.cache.forEach((guild) => {
      console.log(`> [${guild.id}] ${guild.name}`);
    });

    this.createGuildContexts();
  }

  private static createGuildContexts(): void {
    this.client.guilds.cache.forEach(guild => {
      const guildConfig = ConfigService.getConfig().guilds[guild.id];
      if(!guildConfig) {
        console.log(`Warning: Bot is a member of unconfigured guild [${guild.id}] ${guild.name}. No actions will be taken in this guild.`);
        return;
      }

      const major: Major = {
        prefix: guildConfig.majorPrefix.toLowerCase()
      };

      this.guildContexts[guild.id] = new GuildContext(
        this.client,
        guild,
        guildConfig,
        major
      );
    });
  }

  private static onMessageReceived(message: Discord.Message | Discord.PartialMessage): void {
    this.guildContexts[message.guild.id].onMessageReceived(message);
  }
}

// Initialize.
StudyBot.init()
  .catch((err) => {
    console.error("Failed to initialize.");
    console.error(err);
  });
