import * as Discord from "discord.js";
import { GuildContext } from "src/guild-context";
import { Major } from "src/models/major";

export class MajorCategoryImplementDiscordService {
  public static async createMajorCategory(guildContext: GuildContext, major: Major): Promise<Discord.CategoryChannel> {
    const category = await guildContext.guild.channels.create(
      `${major.prefix}-courses`,
      {
        type: "category",
        permissionOverwrites: [
          {
            type: "role",
            id: guildContext.guild.roles.everyone.id,
            deny: ["VIEW_CHANNEL", "CREATE_INSTANT_INVITE"]
          },
        ],
        reason: "StudyBot automatic major category creation.",
      }
    );

    return category;
  }
}