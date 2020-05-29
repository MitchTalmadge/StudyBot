import * as Discord from "discord.js";
import { EmailService } from "../email";

/**
 * This service provides business logic for verifying student IDs of Discord members.
 */
export abstract class VerifierService {
  /**
   * Checks if an input matches the pattern of a student ID.
   * @param input The user's input.
   * @returns True if the input could pass as a student ID, false if not.
   */
  public abstract looksLikeStudentID(input: string): boolean;
  // TODO: Student ID sanitization

  public abstract convertStudentIDToEmailAddress(studentId: string): string;

  public sendVerificationEmail(studentId: string, user: Discord.User, code: string): Promise<void> {
    return EmailService.sendEmail(this.convertStudentIDToEmailAddress(studentId),
      "Discord Verification",
      `Hey, ${user.username}#${user.discriminator}!\n\nTo complete verification, just type the following code into the verification channel: ${code}\n\n\n(If you did not expect this email, please disregard it. It's likely that someone accidentally typed your student ID instead of their own.)`
    );
  }
}

