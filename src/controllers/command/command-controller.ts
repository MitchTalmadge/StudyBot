import * as Discord from "discord.js";
import { GuildContext } from "guild-context";

export abstract class CommandController {
  constructor(protected guildContext: GuildContext) {

  }

  public abstract onMessageReceived(message: Discord.Message | Discord.PartialMessage): void;
}