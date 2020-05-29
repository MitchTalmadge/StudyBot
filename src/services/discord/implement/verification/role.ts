import * as Discord from "discord.js";
import { GuildContext } from "guild-context";
import { VerificationUtils } from "utils/verification";

export class VerificationRoleImplementDiscordService {
  public static async createRole(guildContext: GuildContext): Promise<Discord.Role> {
    const role = await guildContext.guild.roles.create({
      data: {
        name: VerificationUtils.getRoleName(),
        hoist: true,
        color: "3498DB",
        mentionable: false,
        position: 1
      }
    });

    return role;
  }
}