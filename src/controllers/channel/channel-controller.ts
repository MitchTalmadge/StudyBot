import * as Discord from "discord.js";
import { DiscordUtils } from "utils/discord";
import { GuildContext } from "guild-context";
import { timer } from "rxjs";

export abstract class ChannelController {
  constructor(protected guildContext: GuildContext) {
  }

  public abstract async onMessageReceived(message: Discord.Message | Discord.PartialMessage): Promise<void>;

  /**
   * Deletes a user's message after an optional delay. 
   * @param message The message to delete.
   * @param delayMs How long to wait before deleting the message.
   * @returns A promise that will resolve after rate limit avoidance. 
   * (Will not be wait for message to be deleted.)
   */
  protected async purgeMessage(message: Discord.Message | Discord.PartialMessage, delayMs: number = 0): Promise<void> {
    message.delete({
      timeout: delayMs,
      reason: "StudyBot automatic message purge."
    });

    return DiscordUtils.rateLimitAvoidance();
  }

  /**
   * Sends a message to a channel with integrated rate limit avoidance.
   * @param channel The channel to send the message in.
   * @param content The message content.
   * @param options Optional extra message data, like attachments.
   * @returns A promise that will resolve after the message has been sent and the rate limit avoidance delay has elapsed.
   */
  protected async sendMessage(channel: Discord.TextChannel | Discord.DMChannel, content: string, options?: Discord.MessageOptions | Discord.MessageAdditions): Promise<Discord.Message> {
    const result = await channel.send(content, options);
    await DiscordUtils.rateLimitAvoidance();
    return result;
  }

  /**
   * Sends a temporary auto-deleting message to a channel with integrated rate limit avoidance.
   * @param lifeMs How long the message should live.
   * @param channel The channel to send the message in.
   * @param content The message content.
   * @param options Optional extra message data, like attachments.
   * @returns A promise that will resolve after the message has been sent and the rate limit avoidance delay has elapsed. 
   * (Will not wait for message to be deleted.)
   */
  protected async sendTempMessage(lifeMs: number, channel: Discord.TextChannel | Discord.DMChannel, content: string, options?: Discord.MessageOptions | Discord.MessageAdditions): Promise<Discord.Message> {
    const message = await this.sendMessage(channel, content, options);
    timer(lifeMs).subscribe(() => {
      message.delete({
        timeout: 0,
        reason: "StudyBot temporary message."
      });
    });

    return message;
  }
}