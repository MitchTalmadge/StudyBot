import * as Discord from 'discord.js';
import * as dotenv from 'dotenv';
import { DatabaseService } from './services/database';

class StudyBot {
  private client: Discord.Client;

  constructor() {
    this.init()
      .then(() => {
        console.log('Initialization complete.');
      })
      .catch((err) => {
        console.error('Failed to initialize.');
        console.error(err);
      });
  }

  public async init() {
    // Load environment variables.
    dotenv.config();

    // Connect to database.
    console.log('Connecting to database...');
    await DatabaseService.connect(process.env.DB_ADDRESS, process.env.DB_NAME);

    // Login to Discord.
    this.client = new Discord.Client();
    this.client.login(process.env.DISCORD_TOKEN);
    this.client.on('ready', () => this.onDiscordReady());
  }

  private onDiscordReady(): void {
    console.log('Logged into Discord.');

    console.log('Connected to the following Guilds:');
    this.client.guilds.cache.forEach((guild) => {
      console.log(`> [${guild.id}] ${guild.name}`);
    });
  }
}

export default new StudyBot();
