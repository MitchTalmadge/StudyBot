import * as Discord from 'discord.js';

const dotenv = require('dotenv');

// Load environment variables.
dotenv.config();

// Login to Discord.
const client = new Discord.Client();
client.login(process.env.DISCORD_TOKEN);

client.on('ready', () => {
  console.log('Bot is ready.');

  console.log('Connected to the following Guilds:');
  client.guilds.cache.forEach((guild) => {
    console.log(`> [${guild.id}] ${guild.name}`);
  });
});
