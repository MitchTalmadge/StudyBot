import * as Discord from "discord.js";
import { DiscordUtils } from "utils/discord";

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
    console.log(`Sending verification code ${code} to ${DiscordUtils.describeUserForLogs(user)} by email.`);
    const greeting = this.getRandomGreeting();
    return EmailService.sendEmail(this.convertStudentIDToEmailAddress(studentId),
      `Discord Verification Code (${code})`,
      `${greeting}, ${user.username}! Here's your code for the server: ${code}. Just type it into the verification channel to continue!\n\nIf you did not expect this email, please disregard it; it was probably just the result of a typo.`
    );
  }

  private static greetings = ["Hey", "Hi there", "Hiya", "Hello", "Howdy", "Aloha"];

  private getRandomGreeting(): string {
    return VerifierService.greetings[Math.floor(Math.random() * VerifierService.greetings.length)];
  }
}

