import * as Discord from 'discord.js';
import * as dotenv from 'dotenv';
import { DatabaseService } from './services/database';

class StudyBot {
  private static client: Discord.Client;

  public static async init() {
    // Connect to database.
    console.log('Connecting to database...');
    await DatabaseService.connect(process.env.DB_ADDRESS, process.env.DB_NAME);

    // Login to Discord.
    console.log('Logging into Discord...');
    this.client = new Discord.Client();
    this.client.login(process.env.DISCORD_TOKEN);
    this.client.on('ready', () => this.onDiscordReady());
  }

  private static onDiscordReady(): void {
    console.log('Login successful.');

    console.log('Connected to the following Guilds:');
    this.client.guilds.cache.forEach((guild) => {
      console.log(`> [${guild.id}] ${guild.name}`);
    });
  }
}

// Load environment variables.
dotenv.config();

// Initialize.
StudyBot.init()
  .catch((err) => {
    console.error('Failed to initialize.');
    console.error(err);
  });
