import * as Discord from "discord.js";
import { Course } from "src/models/course";
import { CourseUtils } from "src/utils/course";
import { GuildContext } from "src/guild-context";

export class CourseChannelImplementDiscordService {
  public static async createMainCourseChannel(guildContext: GuildContext, course: Course, categoryId: string, mainRoleId: string, taRoleId: string): Promise<Discord.TextChannel> {
    const channel = await guildContext.guild.channels.create(
      CourseUtils.convertToString(course),
      {
        type: "text",
        topic: `:information_source: ${course.title}`,
        parent: categoryId,
        position: 1,
        permissionOverwrites: [
          {
            type: "role",
            id: guildContext.guild.roles.everyone.id,
            deny: ["VIEW_CHANNEL", "CREATE_INSTANT_INVITE"]
          },
          {
            type: "role",
            id: mainRoleId,
            allow: ["VIEW_CHANNEL"]
          },
          {
            type: "role",
            id: taRoleId,
            allow: ["VIEW_CHANNEL", "MANAGE_MESSAGES"]
          }
        ],
        reason: "StudyBot automatic channel creation.",
      }
    );

    return channel;
  }

  public static async createVoiceCourseChannel(guildContext: GuildContext, course: Course, categoryId: string, mainRoleId: string, taRoleId: string): Promise<Discord.VoiceChannel> {
    const channel = await guildContext.guild.channels.create(
      `${CourseUtils.convertToString(course)}-voice`,
      {
        type: "voice",
        parent: categoryId,
        position: 1,
        permissionOverwrites: [
          {
            type: "role",
            id: guildContext.guild.roles.everyone.id,
            deny: ["VIEW_CHANNEL", "STREAM"]
          },
          {
            type: "role",
            id: mainRoleId,
            allow: ["VIEW_CHANNEL"]
          },
          {
            type: "role",
            id: taRoleId,
            allow: ["VIEW_CHANNEL", "MUTE_MEMBERS", "DEAFEN_MEMBERS", "PRIORITY_SPEAKER", "STREAM"]
          }
        ],
        reason: "StudyBot automatic channel creation.",
      }
    );

    return channel;
  }  
}