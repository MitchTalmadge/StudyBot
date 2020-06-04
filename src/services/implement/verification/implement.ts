import { DiscordUtils } from "utils/discord";
import { GuildContext } from "guild-context";
import { GuildStorageDatabaseService } from "services/database/guild-storage";
import { IVerificationImplement } from "models/implement/verification";
import { VerificationRoleImplementService } from "./role";

export class VerificationImplementService {
  public static async getOrCreateVerificationImplement(guildContext: GuildContext): Promise<IVerificationImplement> {
    const implement = await this.getVerificationImplementIfExists(guildContext);
    if(implement)
      return implement;

    return await this.createVerificationImplement(guildContext);
  }

  public static async getVerificationImplementIfExists(guildContext: GuildContext): Promise<IVerificationImplement | undefined> {
    const implement = await GuildStorageDatabaseService.getVerificationImplement(guildContext);
    if(implement) {
      return implement;
    }
    return undefined;
  }

  private static async createVerificationImplement(guildContext: GuildContext): Promise<IVerificationImplement> {
    await DiscordUtils.rateLimitAvoidance();
    const roleId = (await VerificationRoleImplementService.createRole(guildContext)).id;
    
    const implement: IVerificationImplement = {
      roleId
    };

    await GuildStorageDatabaseService.setVerificationImplement(guildContext, implement);
    return implement;
  }
}