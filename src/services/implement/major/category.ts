import * as Discord from "discord.js";
import { GuildContext } from "guild-context";
import { Major } from "models/major";
import { MajorUtils } from "utils/major";

export class MajorCategoryImplementService {
  public static async createTextCategory(guildContext: GuildContext, major: Major): Promise<Discord.CategoryChannel> {
    const category = await guildContext.guild.channels.create(
      MajorUtils.getTextCategoryName(major),
      {
        type: "category",
        permissionOverwrites: [
          {
            type: "role",
            id: guildContext.guild.roles.everyone.id,
            deny: ["VIEW_CHANNEL"]
          }
        ],
        reason: "StudyBot automatic major text category creation.",
      }
    );

    return category;
  }

  public static async createVoiceCategory(guildContext: GuildContext, major: Major): Promise<Discord.CategoryChannel> {
    const category = await guildContext.guild.channels.create(
      MajorUtils.getVoiceCategoryName(major),
      {
        type: "category",
        permissionOverwrites: [
          {
            type: "role",
            id: guildContext.guild.roles.everyone.id,
            deny: ["VIEW_CHANNEL"]
          }
        ],
        reason: "StudyBot automatic major voice category creation.",
      }
    );

    return category;
  }
}