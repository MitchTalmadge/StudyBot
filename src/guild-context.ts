import * as Discord from "discord.js";
import { Major } from "./models/major";

/**
 * For the purposes of the bot, wraps up everything it needs to know about one guild.
 * Since each guild would have its own major, users, roles, channels, etc., this helps keep things separate.
 */
export class GuildContext {
  constructor(
    private client: Discord.Client,
    public guild: Discord.Guild,
    public major: Major){
  }

  public onMessageReceived(message: Discord.Message | Discord.PartialMessage) {
    console.log(`Message received from ${message.author.username}: ${message.content}`);
  }

}