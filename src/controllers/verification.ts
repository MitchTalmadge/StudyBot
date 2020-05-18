import * as Discord from "discord.js";
import { ConfigService } from "src/services/config";
import { GuildContext } from "src/guild-context";
import { VerifierService } from "src/services/verification/verifier";
import { VerifierServiceFactory } from "src/services/verification/verifier-factory";
import { EmailService } from "src/services/email";

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
      this.verifier.sendVerificationEmail(studentId, message.author, "12345")
        .then(() => {
          message.reply("Email sent!");
        })
        .catch(err => {
          console.error("Failed to send verification email:", err);
          message.reply("There was an error.");
        });
    }
  }
}