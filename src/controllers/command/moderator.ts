import * as Discord from "discord.js";
import { VerificationStatus } from "models/verification-status";
import { ConfigService } from "services/config";
import { UserDatabaseService } from "services/database/user";
import { DiscordUtils } from "utils/discord";

import { CommandController } from "./command-controller";

export class ModeratorCommandController extends CommandController {
  public onMessageReceived(message: Discord.Message | Discord.PartialMessage): void {
    if(!message.content.startsWith("!mod ")) {
      return;
    }

    if (!this.isModerator(message.member)) {
      this.guildContext.guildLog(`User ${DiscordUtils.describeUserForLogs(message.author)} tried to use a moderator command but was not a moderator.`);
      return;
    }

    const tokens = message.content.toLowerCase().split(/\s+/);
    if(tokens.length == 1) {
      message.reply("please supply a command.");
      return;
    }

    switch(tokens[1]) {
      case "whois":
        this.runWhoisCommand(message, tokens);
        break;
      default:
        this.guildContext.guildLog(`User ${DiscordUtils.describeUserForLogs(message.author)} tried to use a non-existent moderator command: ${tokens[0]}.`);
    }
  }

  private async runWhoisCommand(message: Discord.Message | Discord.PartialMessage, tokens: string[]) {
    if(tokens.length != 3) {
      message.reply("please mention or give ID of one user.");
      return;
    }
    const mentionMatch = tokens[2].match(/\d+/);
    if(!mentionMatch) {
      message.reply("please mention or give ID of one user.");
      return;
    }

    const userId = mentionMatch[0];
    const user = await UserDatabaseService.findOrCreateUser(userId);

    const guildStrings: string[] = [];
    let member: Discord.GuildMember;
    for(let guildEntry of user.guilds.entries()) {
      const guildId = guildEntry[0];
      const guild = this.guildContext.guild.client.guilds.resolve(guildId);
      const guildMeta = guildEntry[1];
      
      let guildString = `  - "${guild.name}" (ID ${guild.id})`;

      // Nickname
      member = guild.members.resolve(userId);
      guildString += `\n    - Display Name: ${member ? member.displayName : "Unknown."}`;

      // Courses
      guildString += "\n    - Courses:";
      if(guildMeta.courses.length == 0) {
        guildString += " None assigned.";
      } else {
        for(let course of guildMeta.courses) {
          guildString += `\n      - ${course.courseKey} (TA: ${course.isTA})`;
        }
      }

      guildStrings.push(guildString);
    }

    let reply = "";
    if(member) {
      reply = `details of ${member.user.username}#${member.user.discriminator} (ID ${userId}):\n`;
    } else {
      reply = `details of unresolved user (ID ${userId}):\n`;
    }
    
    reply +=  
    `- Verification Status: ${VerificationStatus[user.verificationStatus]}\n`
    + `  - Student ID: ${user.studentId}\n`
    + `- Network Status: ${guildStrings.length == 0 ? "Not a member of any network guild." : ""}\n`
    + guildStrings.join("\n");

    message.reply(reply);
  }

  private isModerator(member: Discord.GuildMember): boolean {
    const moderatorRoleName = ConfigService.getConfig().guilds[this.guildContext.guild.id].moderatorRoleName.toLowerCase();
    return member.roles.cache.some(r => r.name.toLowerCase() === moderatorRoleName);
  }
}