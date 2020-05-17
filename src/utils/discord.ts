import { timer } from "rxjs";

export class DiscordUtils {
  /**
   * Waits for an amount of time in order to avoid rate limits.
   * Rate limits happen at about 120 events per 60 seconds, or 2 per second.
   */
  public static async rateLimitAvoidance(delayMs = 750): Promise<void> {
    await timer(delayMs).toPromise();
  }
}