import * as Discord from "discord.js";
import { GuildContext } from "guild-context";
import { Major } from "models/major";
import { MajorUtils } from "utils/major";

export class MajorCategoryImplementService {
  public static async createCategory(guildContext: GuildContext, major: Major): Promise<Discord.CategoryChannel> {
    const category = await guildContext.guild.channels.create(
      MajorUtils.getCategoryName(major),
      {
        type: "category",
        permissionOverwrites: [
          {
            type: "role",
            id: guildContext.guild.roles.everyone.id,
            deny: ["VIEW_CHANNEL"]
          }
        ],
        reason: "StudyBot automatic major category creation.",
      }
    );

    return category;
  }
}