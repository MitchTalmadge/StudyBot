import * as Discord from "discord.js";
import { ChannelController } from "./channel-controller";
import { ConfigService } from "services/config";
import { GuildContext } from "guild-context";
import { UserDatabaseService } from "services/database/user";
import { VerificationStatus } from "models/verification-status";
import { VerifierService } from "services/verification/verifier";
import { VerifierServiceFactory } from "services/verification/verifier-factory";

export class VerificationChannelController extends ChannelController {
  public static readonly CHANNEL_NAME = "get-verified";

  private enabled: boolean;

  private verifier: VerifierService;

  constructor(guildContext: GuildContext) { 
    super(guildContext);

    this.enabled = ConfigService.getConfig().verification.enabled;
    if(this.enabled) {
      this.verifier = VerifierServiceFactory.getVerifier(ConfigService.getConfig().verification.verifier);
    }
  }

  public onMessageReceived(message: Discord.Message | Discord.PartialMessage): void {
    if(!this.enabled) {
      return;
    }

    const contents = message.content.trim();

    UserDatabaseService.getUserByDiscordUserId(message.author.id)
      .then(user => {
        if(user) {
          if(user.verificationStatus === VerificationStatus.VERIFIED) {
            message.reply("you are already verified!");
            return;
          } else if (user.verificationStatus === VerificationStatus.CODE_SENT) {
            if(contents.trim() === user.verificationCode) {
              message.reply("success! You will be able to speak momentarily.");
              UserDatabaseService.setUserVerified(message.author.id)
                .catch(err => {
                  console.error(`Could not set user with ID ${message.author.id} as verified`, err);
                  message.reply("sorry! There was an error while giving you the verified role. Please ask an admin for help!");
                });
              return;
            }
          }
        }

        if(this.verifier.looksLikeStudentID(contents)) {
          UserDatabaseService.generateAndStoreVerificationCode(message.author, contents)
            .then(verificationCode => {
              return this.verifier.sendVerificationEmail(contents, message.author, verificationCode);
            })
            .then(() => {
              message.reply("just one more step. A verification code has been sent to your university email address. All you have to do now is copy that code here to finish verification!");
            })
            .catch(err => {
              console.error("Failed to send verification email:", err);
              message.reply("sorry! Something went wrong while trying to send a verification email to your address.");
            });
        }
      })
      .catch(err => { 
        console.error(`Could not retrieve user object from DB while checking verification status for user with ID ${message.author.id}`, err);
        message.reply("sorry! There was an error while checking your verification status. Please try again or ask an admin for help!");
      });
  }
}