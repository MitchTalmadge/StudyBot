import { DiscordUtils } from "utils/discord";
import { GuildContext } from "guild-context";
import { GuildStorageDatabaseService } from "services/database/guild-storage";
import { IVerificationImplementDiscord } from "models/discord/implement/verification";
import { VerificationRoleImplementDiscordService } from "./role";

export class VerificationImplementDiscordService {
  public static async getOrCreateVerificationImplement(guildContext: GuildContext): Promise<IVerificationImplementDiscord> {
    const implement = await this.getVerificationImplementIfExists(guildContext);
    if(implement)
      return implement;

    return await this.createVerificationImplement(guildContext);
  }

  public static async getVerificationImplementIfExists(guildContext: GuildContext): Promise<IVerificationImplementDiscord | undefined> {
    const implement = await GuildStorageDatabaseService.getVerificationImplement(guildContext);
    if(implement) {
      return implement;
    }
    return undefined;
  }

  private static async createVerificationImplement(guildContext: GuildContext): Promise<IVerificationImplementDiscord> {
    await DiscordUtils.rateLimitAvoidance();
    const roleId = (await VerificationRoleImplementDiscordService.createRole(guildContext)).id;
    
    const implement: IVerificationImplementDiscord = {
      roleId
    };

    await GuildStorageDatabaseService.setVerificationImplement(guildContext, implement);
    return implement;
  }
}