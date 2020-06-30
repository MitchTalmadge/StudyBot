import * as Discord from "discord.js";
import { GuildContext } from "guild-context";

export class DiscordUtils {
  /**
   * Evicts the provided channels from cache and re-fetches them from Discord.
   * @param channels Which channels to refresh.
   */
  public static async refreshChannelsInCache(guildContext: GuildContext, channels: Discord.GuildChannel[]): Promise<void> {
    // Evict from cache.
    for(let channel of channels) {
      guildContext.guild.client.channels.cache.delete(channel.id);
      guildContext.guild.channels.cache.delete(channel.id);
    }
    // Get from Discord
    const refreshedChannels = await Promise.all(channels.map(channel => guildContext.guild.client.channels.fetch(channel.id, true)));
    
    // Write to cache.
    for(let channel of refreshedChannels) {
      guildContext.guild.client.channels.cache.set(channel.id, channel);
      guildContext.guild.channels.cache.set(channel.id, <Discord.GuildChannel>channel);
    }
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