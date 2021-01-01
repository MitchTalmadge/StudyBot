import * as Discord from "discord.js";
import { GuildContext } from "guild-context";

export abstract class ChannelController {
  constructor(protected guildContext: GuildContext) {
  }

  public abstract onMessageReceived(message: Discord.Message): Promise<void>;
}