import * as Discord from "discord.js";
import { ConfigService } from "services/config";
import { UserDatabaseService } from "services/database/user";

import { VerifierServiceFactory } from "./verifier-factory";

export class VerificationService {
  /**
   * Generates a code and sends it by email for the user to complete verification.
   */
  public static async initiateByEmail(discordUser: Discord.User, studentId: string) {
    const verifier = VerifierServiceFactory.getVerifier(ConfigService.getConfig().verification.verifier);

    // Generate code
    const verificationCode = await UserDatabaseService.generateAndStoreVerificationCode(discordUser.id, studentId);
    
    // Send code
    await verifier.sendVerificationEmail(studentId, discordUser, verificationCode);
  }

  /**
   * Marks the user as verified in the database with the given student ID. 
   * Does not apply verification role automatically.
   */
  public static async setVerifiedStatusManually(discordUserId: string, studentId: string) {
    await UserDatabaseService.setUserVerified(discordUserId, studentId);
  }
}