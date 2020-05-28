import * as Discord from "discord.js";
import { ConfigService } from "../config";
import { EmailService } from "../email";


/**
 * This service provides business logic for verifying student IDs of Discord members.
 */
export abstract class VerifierService {
  /**
   * Checks if an input looks like a student ID.
   * @param input The user's input.
   * @returns True if the input looks like a student ID, false if not.
   */
  public abstract checkPattern(input: string): boolean;

  public abstract convertToEmailAddress(studentId: string): string;

  public sendVerificationEmail(studentId: string, user: Discord.User, code: string): Promise<void> {
    const webConfig = ConfigService.getConfig().web;
    const verificationUrl = `${webConfig.publicUri}${webConfig.basename}/verify?code=${code}`;

    return EmailService.sendEmail(this.convertToEmailAddress(studentId),
      "Discord Verification",
      `Hello!\n\nWe have received a request to verify the student ID "${studentId}" for the Discord user "${user.username}#${user.discriminator}". If this is you, simply click the link below to complete verification. If not, there is nothing to be concerned about. It's more than likely that someone mistyped their student ID. You may safely delete this email.\n\n${verificationUrl}`
    );
  }
}

