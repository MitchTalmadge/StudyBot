import * as Discord from "discord.js";
import { StudyBot } from "main";
import { VerificationStatus } from "models/verification-status";
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

  public static async banIfBannedStudentId(discordUserId: string): Promise<boolean> {
    const user = await UserDatabaseService.findOrCreateUser(discordUserId);
    
    // User must be verified. 
    if(user.verificationStatus != VerificationStatus.VERIFIED) {
      return false;
    }
    const studentId = user.studentId;
    if(!studentId) {
      return false;
    }

    // Check for banned users under the same verified student ID.
    let matchingUsers = await UserDatabaseService.getUsersByStudentId(studentId, true);
    matchingUsers = matchingUsers.filter(user => {
      return user.discordUserId !== discordUserId && user.banned;
    });
    if(matchingUsers.length == 0) {
      return false;
    }

    // Ban
    await this.ban(discordUserId);
    return true;
  }

  public static async unban(discordUserId: string): Promise<void> {
    await UserDatabaseService.setBanned(discordUserId, false);

    // TODO: Unban all with same verified student ID
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