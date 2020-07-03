import * as Discord from "discord.js";
import { VerificationStatus } from "models/verification-status";
import { UserDatabaseService } from "services/database/user";

import { CommandController } from "./command-controller";

export class ModeratorCommandController extends CommandController {
  public onMessageReceived(message: Discord.Message | Discord.PartialMessage): void {
    if(message.channel.id !== this.guildContext.guildConfig.moderatorCommandChannelId)
      return;

    if(!message.content.startsWith("!!")) 
      return;

    const tokens = message.content.toLowerCase().split(/\s+/);
    tokens[0] = tokens[0].substr(2);

    switch(tokens[0]) {
      case "whois":
        this.runWhoisCommand(message, tokens);
        break;
      default:
        this.displayHelp(message);
        break;
    }
  }

  private displayHelp(message: Discord.Message | Discord.PartialMessage) {
    message.reply(
      "here are the valid commands:\n"
      + "\t`!!whois <Discord User ID or Mention>`\t\tGives info about a user in the server (verification status, etc.)\n");
  }

  private async runWhoisCommand(message: Discord.Message | Discord.PartialMessage, tokens: string[]) {
    if(tokens.length != 2) {
      message.reply("please mention or give ID of one user.");
      return;
    }
    const mentionMatch = tokens[1].match(/\d+/);
    if(!mentionMatch) {
      message.reply("please mention or give ID of one user.");
      return;
    }

    const userId = mentionMatch[0];
    const user = await UserDatabaseService.getUserIfExists(userId);
    if(!user) {
      message.reply(`the user with ID ${userId} does not exist in the database.`);
      return;
    }

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
}