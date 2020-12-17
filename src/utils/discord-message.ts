import * as Discord from "discord.js";
import { timer } from "rxjs";
import { v4 as uuidv4 } from "uuid";

export class DiscordMessageUtils {
  /**
   * Deletes a user's message after an optional delay. (Return will not be wait for message to be deleted.)
   * @param message The message to delete.
   * @param delayMs How long to wait before deleting the message.
   */
  public static purgeMessage(message: Discord.Message, delayMs: number = 0): void {
    message.delete({
      timeout: delayMs,
      reason: "StudyBot automatic message purge."
    }).catch(err => {
      console.error(`Failed to delete message with ID ${message.id}:`, err);
    });
  }

  /**
   * Sends a message to a channel.
   * @param channel The channel to send the message in.
   * @param content The message content.
   * @param options Optional extra message data, like attachments.
   * @returns A promise that will resolve after the message has been sent.
   */
  public static async sendMessage(channel: Discord.TextChannel | Discord.DMChannel | Discord.NewsChannel, content: string, options?: (Discord.MessageOptions & {split?: false}) | Discord.MessageAdditions): Promise<Discord.Message> {
    // Nonce prevents duplicate message requests (can happen during lag) from appearing as duplicate messages.
    if(!options) {
      options = {
        nonce: uuidv4()
      };
    }

    return await channel.send(content, options);
  }

  /**
   * Sends a temporary auto-deleting message to a channel.
   * @param lifeMs How long the message should live.
   * @param channel The channel to send the message in.
   * @param content The message content.
   * @param options Optional extra message data, like attachments.
   * @returns A promise that will resolve after the message has been sent. (Will not wait for message to be deleted.)
   */
  public static async sendTempMessage(lifeMs: number, channel: Discord.TextChannel | Discord.DMChannel | Discord.NewsChannel, content: string, options?: (Discord.MessageOptions & {split?: false}) | Discord.MessageAdditions): Promise<Discord.Message> {
    const message = await this.sendMessage(channel, content, options);
    timer(lifeMs).subscribe(() => {
      message.delete({
        timeout: 0,
        reason: "StudyBot temporary message."
      }).catch(err => {
        console.error(`Failed to delete temporary message with ID ${message.id}:`, err);
      });
    });

    return message;
  }
}