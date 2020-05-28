import * as Discord from "discord.js";
import { ConfigService } from "services/config";
import { GuildContext } from "guild-context";
import { UserDatabaseService } from "services/database/user";
import { VerifierService } from "services/verification/verifier";
import { VerifierServiceFactory } from "services/verification/verifier-factory";

export class VerificationController {
  public static readonly CHANNEL_NAME = "get-verified";

  private enabled: boolean;

  private verifier: VerifierService;

  constructor(
    private guildContext: GuildContext
  ) { 
    this.enabled = ConfigService.getConfig().verification.enabled;
    if(this.enabled) {
      this.verifier = VerifierServiceFactory.getVerifier(ConfigService.getConfig().verification.verifier);
    }
  }

  public onMessageReceived(message: Discord.Message | Discord.PartialMessage): void {
    if(!this.enabled) {
      return;
    }

    const studentId = message.content.trim();
    if(this.verifier.checkPattern(studentId)) {
      UserDatabaseService.generateAndStoreVerificationCode(message.author)
        .then(verificationCode => {
          return this.verifier.sendVerificationEmail(studentId, message.author, verificationCode);
        })
        .then(() => {
          message.reply("A verification link has been sent to your university email address. All you have to do now is click this link to finish verification!");
        })
        .catch(err => {
          console.error("Failed to send verification email:", err);
          message.reply("Sorry! Something went wrong while trying to send a verification email.");
        });
    }
  }
}