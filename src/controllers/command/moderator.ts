import * as Discord from "discord.js";
import { GuildContext } from "guild-context";
import { VerificationStatus } from "models/verification-status";
import { BanService } from "services/ban";
import { ConfigService } from "services/config";
import { UserDatabaseService } from "services/database/user";
import { MemberUpdateService } from "services/member-update";
import { ResetService } from "services/reset";
import { VerificationService } from "services/verification/verification";
import { VerifierServiceFactory } from "services/verification/verifier-factory";
import { DiscordMessageUtils } from "utils/discord-message";

import { CommandController } from "./command-controller";

export class ModeratorCommandController extends CommandController {
  resetting = false;

  pendingResets: {[discordId: string]: {days: number}} = {};

  constructor(guildContext: GuildContext, private resetService: ResetService) {
    super(guildContext);
  }

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
      case "whois":
        this.runWhoisCommand(message, tokens);
        break;
      case "verify":
        this.runVerifyCommand(message, tokens);
        break;
      case "reset":
        this.runResetCommand(message, tokens);
        break;
      default:
        this.displayHelp(message);
        break;
    }
  }

  private displayHelp(message: Discord.Message) {
    DiscordMessageUtils.sendReply(message, 
      "here are the valid commands:"
      + "\n`!!ban <Discord User ID or Mention>`"
      + "\n\tPerforms a virtual network-wide ban of the user, and anyone else who verifies with the same student ID now or in the future."
      + "\n`!!unban <Discord User ID or Mention>`"
      + "\n\tRemoves the virtual ban from the network for the user."
      + "\n`!!whois <Discord User ID or Mention>`" 
      + "\n\tGives info about a user in the server (verification status, etc.)"
      + "\n`!!verify email|manual <Student ID> <Discord User ID or Mention>`"
      +" \n\tEither re-send a verification email, or forcefully assign the given student ID to the user."
      + "\n`!!reset [days]`"
      + "\n\tPerforms a full reset of all course assignments for anyone who has not updated their courses in the last [days] days. (Defaults to 30 days)."
      + "\n\tOnly affects this guild; not the entire network."
    );
  }

  private async runBanCommand(message: Discord.Message, tokens: string[]) {
    if(tokens.length != 2) {
      DiscordMessageUtils.sendReply(message, "please mention or give the ID of one user.");
      return;
    }
    const mentionMatch = tokens[1].match(/\d+/);
    if(!mentionMatch) {
      DiscordMessageUtils.sendReply(message, "please mention or give the ID of one user.");
      return;
    }

    const userId = mentionMatch[0];
    await BanService.ban(userId);
    DiscordMessageUtils.sendReply(message, `the user with ID ${userId} has been banned from the network.`);
  }

  private async runUnbanCommand(message: Discord.Message, tokens: string[]) {
    if(tokens.length != 2) {
      DiscordMessageUtils.sendReply(message, "please mention or give the ID of one user.");
      return;
    }
    const mentionMatch = tokens[1].match(/\d+/);
    if(!mentionMatch) {
      DiscordMessageUtils.sendReply(message, "please mention or give the ID of one user.");
      return;
    }

    const userId = mentionMatch[0];
    await BanService.unban(userId);
    DiscordMessageUtils.sendReply(message, `the user with ID ${userId} has been unbanned from the network.`);
  }

  private async runWhoisCommand(message: Discord.Message, tokens: string[]) {
    if(tokens.length != 2) {
      DiscordMessageUtils.sendReply(message, "please mention or give the ID of one user.");
      return;
    }
    const mentionMatch = tokens[1].match(/\d+/);
    if(!mentionMatch) {
      DiscordMessageUtils.sendReply(message, "please mention or give the ID of one user.");
      return;
    }

    const userId = mentionMatch[0];
    const user = await UserDatabaseService.getUserIfExists(userId);
    if(!user) {
      DiscordMessageUtils.sendReply(message, `the user with ID ${userId} does not exist in the database.`);
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

    DiscordMessageUtils.sendReply(message, reply);
  }

  private async runVerifyCommand(message: Discord.Message, tokens: string[]) {
    if(!ConfigService.getConfig().verification.enabled) {
      DiscordMessageUtils.sendReply(message, "verification is disabled for this network.");
      return;
    }
    const verifier = VerifierServiceFactory.getVerifier(ConfigService.getConfig().verification.verifier);

    if(tokens.length != 4) {
      DiscordMessageUtils.sendReply(message, "please supply the correct arguments. See !!help.");
      return;
    }

    const studentId = tokens[2];

    const mentionMatch = tokens[3].match(/\d+/);
    if(!mentionMatch) {
      DiscordMessageUtils.sendReply(message, "please mention or give the ID of one user.");
      return;
    }

    const userId = mentionMatch[0];
    const member = this.guildContext.guild.members.resolve(userId);
    if(!member) {
      DiscordMessageUtils.sendReply(message, `the user with ID ${userId} doesn't appear to be a part of this guild.`);
      return;
    }
    
    switch(tokens[1].toLowerCase()) {
      case "email":
        if(!verifier.looksLikeStudentID(studentId)) {
          DiscordMessageUtils.sendReply(message, "the student ID you provided doesn't look right. An email cannot be sent to the user.");
          return;
        }
        await VerificationService.initiateByEmail(member.user, studentId);
        DiscordMessageUtils.sendReply(message, "a verification email has just been sent to the user. They can enter the code in that email into the verification channel to finish verification.");
        break;
      case "manual":
        await VerificationService.setVerifiedStatusManually(userId, studentId);
        await MemberUpdateService.queueMarkVerified(this.guildContext, member);
        DiscordMessageUtils.sendReply(message, `the user is now verified with student ID ${studentId}.`);
        break;
      default:
        DiscordMessageUtils.sendReply(message, `${tokens[1]} is not a valid verification mode. Pick either email or manual.`);
        return;
    }
  }

  private async runResetCommand(message: Discord.Message, tokens: string[]) {
    if(this.resetting) {
      DiscordMessageUtils.sendReply(message, "a reset is currently in progress, please wait.");
      return;
    }

    const pendingReset = this.pendingResets[message.author.id];
    if(pendingReset) {
      if(tokens.length == 2) {
        if(tokens[1] === "confirm") {
          // Here we go...
          this.resetting = true;
          delete this.pendingResets[message.author.id];
          DiscordMessageUtils.sendReply(message, `now resetting all course assignments older than ${pendingReset.days} days. Please wait...`);
          try {
            const numReset = await this.resetService.resetCourseAssignments(pendingReset.days);
            DiscordMessageUtils.sendReply(message, `reset complete! ${numReset} members have had their course assignments removed.`);
          } catch (err) {
            console.error("Failed to run course assignment reset by command:", err);
            DiscordMessageUtils.sendReply(message, `uh oh, something went wrong and the reset may not have completed. The error is: ${err}`);
          }
          this.resetting = false;
          return;
        }
      }
    }    
    
    let days = 30;
    if(tokens.length == 2) {
      let parsedDays = Number.parseInt(tokens[1]);
      if(isNaN(parsedDays)) {
        DiscordMessageUtils.sendReply(message, `I could not parse \`${tokens[1]}\` into a number of days. Please check your input.`);
        return;
      }
      days = parsedDays;
    }
    
    this.pendingResets[message.author.id] = { days };
    DiscordMessageUtils.sendReply(
      message, 
      `you have requested a reset of all course assignments older than ${days} days.\n`
      + "If this is correct, say `!!reset confirm` and the reset will begin immediately. Please take a backup of the database first."
    );
  }
}