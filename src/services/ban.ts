import * as Discord from "discord.js";
import { StudyBot } from "main";
import { DiscordUtils } from "utils/discord";

import { UserDatabaseService } from "./database/user";
export class BanService {
  public static async ban(discordUserId: string): Promise<void> {
    await UserDatabaseService.setBanned(discordUserId);
    
    for(let guild of StudyBot.client.guilds.cache.values()) {
      const member = guild.members.resolve(discordUserId);
      if(member) {
        this.kick(member);
      }
    }
  }

  public static async unban(discordUserId: string): Promise<void> {
    await UserDatabaseService.setBanned(discordUserId, false);
  }

  public static async kickIfBanned(discordMember: Discord.GuildMember): Promise<boolean> {
    const user = await UserDatabaseService.findOrCreateUser(discordMember.user.id);
    if(user.banned) {
      await this.kick(discordMember);
      return true;
    }

    return false;
  }

  private static async kick(discordMember: Discord.GuildMember): Promise<void> {
    StudyBot.guildContexts[discordMember.guild.id].guildLog(`Kicking ${DiscordUtils.describeUserForLogs(discordMember.user)} due to virtual ban.`);
    await discordMember.kick("StudyBot auto-kick due to virtual ban");
  }
}