import * as Discord from "discord.js";
import { GuildContext } from "guild-context";
import { CourseImplementChannelType } from "models/implement/course";
import { Major } from "models/major";
import { MajorUtils } from "utils/major";

export class MajorCategoryImplementService {
  private static async createCategory(guildContext: GuildContext, name: string): Promise<Discord.CategoryChannel> {
    const category = await guildContext.guild.channels.create(
      name,
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

  public static async createCategoryOfType(guildContext: GuildContext, major: Major, type: CourseImplementChannelType): Promise<Discord.CategoryChannel> {
    return await this.createCategory(guildContext, MajorUtils.getCategoryName(major, type));
  }
}