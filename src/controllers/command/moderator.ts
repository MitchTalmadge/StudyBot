import * as Discord from "discord.js";
import { VerificationStatus } from "models/verification-status";
import { BanService } from "services/ban";
import { ConfigService } from "services/config";
import { UserDatabaseService } from "services/database/user";
import { MemberUpdateService } from "services/member-update";
import { VerificationService } from "services/verification/verification";
import { VerifierServiceFactory } from "services/verification/verifier-factory";

import { CommandController } from "./command-controller";

export class ModeratorCommandController extends CommandController {
  public onMessageReceived(message: Discord.Message): void {
    if(message.channel.id !== this.guildContext.guildConfig.moderatorCommandChannelId)
      return;

    if(!message.content.startsWith("!!")) 
      return;

    const tokens = message.content.toLowerCase().split(/\s+/);
    tokens[0] = tokens[0].substr(2);

    switch(tokens[0]) {
      case "ban":
        this.runBanCommand(message, tokens);
        break;
      case "unban":
        this.runUnbanCommand(message, tokens);
        break;
      case "verify":
        this.runVerifyCommand(message, tokens);
        break;
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
      + "\t`!!whois <Discord User ID or Mention>`\t\tGives info about a user in the server (verification status, etc.)\n"
      + "\t`!!verify email|manual <Student ID> <Discord User ID or Mention>`\t\tEither re-send a verification email, or forcefully assign the given student ID to the user.");
  }

  

  private async runBanCommand(message: Discord.Message | Discord.PartialMessage, tokens: string[]) {
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
    await BanService.ban(userId);
    message.reply(`the user with ID ${userId} has been banned from the network.`);
  }

  private async runUnbanCommand(message: Discord.Message | Discord.PartialMessage, tokens: string[]) {
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
    await BanService.unban(userId);
    message.reply(`the user with ID ${userId} has been unbanned from the network.`);
  }

  private async runVerifyCommand(message: Discord.Message | Discord.PartialMessage, tokens: string[]) {
    if(!ConfigService.getConfig().verification.enabled) {
      message.reply("verification is disabled for this network.");
      return;
    }
    const verifier = VerifierServiceFactory.getVerifier(ConfigService.getConfig().verification.verifier);

    if(tokens.length != 4) {
      message.reply("please supply the correct arguments. See !!help.");
      return;
    }

    const studentId = tokens[2];

    const mentionMatch = tokens[3].match(/\d+/);
    if(!mentionMatch) {
      message.reply("please mention or give ID of one user.");
      return;
    }

    const userId = mentionMatch[0];
    const member = this.guildContext.guild.members.resolve(userId);
    if(!member) {
      message.reply(`the user with ID ${userId} doesn't appear to be a part of this guild.`);
      return;
    }
    
    switch(tokens[1].toLowerCase()) {
      case "email":
        if(!verifier.looksLikeStudentID(studentId)) {
          message.reply("the student ID you provided doesn't look right. An email cannot be sent to the user.");
          return;
        }
        await VerificationService.initiateByEmail(member.user, studentId);
        message.reply("a verification email has just been sent to the user. They can enter the code in that email into the verification channel to finish verification.");
        break;
      case "manual":
        await VerificationService.setVerifiedStatusManually(userId, studentId);
        await MemberUpdateService.queueMarkVerified(this.guildContext, member);
        message.reply(`the user is now verified with student ID ${studentId}.`);
        break;
      default:
        message.reply(`${tokens[1]} is not a valid verification mode. Pick either email or manual.`);
        return;
    }
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
    + `- Banned: ${user.banned}\n`
    + `- Network Status: ${guildStrings.length == 0 ? "Not a member of any network guild." : ""}\n`
    + guildStrings.join("\n");

    message.reply(reply);
  }
}