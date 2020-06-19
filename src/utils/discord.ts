import * as Discord from "discord.js";
import { timer } from "rxjs";

export class DiscordUtils {
  /**
   * Waits for an amount of time in order to avoid rate limits.
   * Rate limits happen at about 120 events per 60 seconds, or 2 per second.
   */
  public static async rateLimitAvoidance(delayMs = 750): Promise<void> {
    delayMs = 0;
    await timer(delayMs).toPromise();
  }

  /**
   * Converts a user to a format which is useful when humans read the logs.
   * Includes the user's ID and the username with discriminator.
   * @param user The user to describe.
   */
  public static describeUserForLogs(user: Discord.User): string {
    return `(${user.id} / ${user.username}#${user.discriminator})`;
  }
}