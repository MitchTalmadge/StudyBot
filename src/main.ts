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

    if (this.client.guilds.cache.size === 0) {
      console.error(`This bot must be connected to a guild. Please add this bot to a guild before starting the instance. 
      You can do this by visiting the following URL: https://discordapp.com/oauth2/authorize?client_id=${this.client.user.id}&scope=bot&permissions=0`);
      process.exit();
    } else if (this.client.guilds.cache.size > 1) {
      console.error('This bot only supports one guild at a time. Please run multiple instances to handle multiple guilds.');
      process.exit();
    }
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
