import * as Discord from "discord.js";
import { ConfigService } from "./services/config";
import { DatabaseService } from "./services/database/database";
import { GuildContext } from "./guild-context";
import { MajorMap } from "./models/major-map";
import express from "express";

class StudyBot {
  private static client: Discord.Client;

  private static guildContexts: { [guildId: string]: GuildContext } = {};

  public static async init() {
    // Load configuration.
    console.log("Loading config...");
    await ConfigService.loadAndValidateConfig();

    // Connect to database.
    console.log("Connecting to database...");
    await DatabaseService.connect(ConfigService.getConfig().database);

    // Start web server.
    if(ConfigService.getConfig().web.enabled) {
      console.log("Starting web server...");

      // Configure express.
      const app = express();

      // Configure routing.
      const port = ConfigService.getConfig().web.port;
      const apiRoutes = require("./routes/api").default;
      app.use(`/${ConfigService.getConfig().web.basename}`, apiRoutes); 
      app.get("/*", (_req, res) => {
        res.status(404).send("Requested Endpoint Not Found");
      });

      app.listen(port, () => console.log(`Web server started on port ${port}`));
    }

    // Login to Discord.
    console.log("Logging into Discord...");
    this.client = new Discord.Client();
    this.client.login(ConfigService.getConfig().discordToken);

    this.client.on("ready", () => this.onDiscordReady());
    this.client.on("message", (msg) => this.onMessageReceived(msg));
    this.client.on("rateLimit", (rateLimitData => this.onRateLimit(rateLimitData)));
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
      if (!guildConfig) {
        console.log(`Warning: Bot is a member of unconfigured guild [${guild.id}] ${guild.name}. No actions will be taken in this guild.`);
        return;
      }

      const majors: MajorMap = {};

      guildConfig.majors.forEach(majorPrefix => {
        majors[majorPrefix] = {
          prefix: majorPrefix.toLowerCase()
        };
      });

      this.guildContexts[guild.id] = new GuildContext(
        guild,
        guildConfig,
        majors
      );
    });
  }

  private static onMessageReceived(message: Discord.Message | Discord.PartialMessage): void {
    if (message.author.id === this.client.user.id)
      return;

    this.guildContexts[message.guild.id].onMessageReceived(message);
  }

  private static onRateLimit(rateLimitData: Discord.RateLimitData): void {
    console.error("Rate limit encountered:", rateLimitData);
  }
}

// Initialize.
StudyBot.init()
  .catch((err) => {
    console.error("Failed to initialize.");
    console.error(err);
  });
