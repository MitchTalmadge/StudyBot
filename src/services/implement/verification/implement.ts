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

  public static async guarantee(guildContext: GuildContext) {
    guildContext.guildLog("Guaranteeing verification implement...");
    const implement = await VerificationImplementService.getOrCreateVerificationImplement(guildContext);
    let update = false;

    // Role
    if(!await guildContext.guild.roles.fetch(implement.roleId)) {
      implement.roleId = (await VerificationRoleImplementService.createRole(guildContext)).id;
      guildContext.guildLog("Created missing verification role.");
      update = true;
    }

    if(update) {
      await GuildStorageDatabaseService.setVerificationImplement(guildContext, implement);
    }
  }
}