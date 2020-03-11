import Discord from 'discord.js';
import dotenv from 'dotenv';

// Load environment variables.
dotenv.config();

// Login to Discord.
const client = new Discord.Client();
client.login(process.env.DISCORD_TOKEN);

client.on('ready', () => {
    console.log("Discord bot is ready.");
})