import { GuildContext } from "guild-context";
import { IVerificationImplement } from "models/implement/verification";
import { GuildStorageDatabaseService } from "services/database/guild-storage";

import { VerificationRoleImplementService } from "./role";

export class VerificationImplementService {
  public static async getOrCreateVerificationImplement(guildContext: GuildContext): Promise<IVerificationImplement> {
    const implement = await GuildStorageDatabaseService.getVerificationImplement(guildContext);
    if(implement)
      return implement;

    return await this.createVerificationImplement(guildContext);
  }

  private static async createVerificationImplement(guildContext: GuildContext): Promise<IVerificationImplement> {
    const roleId = (await VerificationRoleImplementService.createRole(guildContext)).id;
    
    const implement: IVerificationImplement = {
      roleId
    };

    await GuildStorageDatabaseService.setVerificationImplement(guildContext, implement);
    return implement;
  }
}