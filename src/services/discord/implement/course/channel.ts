import * as Discord from "discord.js";
import { Course } from "models/course";
import { CourseUtils } from "utils/course";
import { GuildContext } from "guild-context";

export class CourseChannelImplementDiscordService {
  public static async createMainChannel(guildContext: GuildContext, course: Course, categoryId: string, mainRoleId: string, taRoleId: string, verificationRoleId: string): Promise<Discord.TextChannel> {
    const channel = await guildContext.guild.channels.create(
      CourseUtils.getMainChannelName(course),
      {
        type: "text",
        topic: `:information_source: ${course.title}`,
        parent: categoryId,
        position: 1,
        permissionOverwrites: [
          {
            type: "role",
            id: guildContext.guild.roles.everyone.id,
            // TODO: only deny speak if verification enabled
            deny: ["VIEW_CHANNEL", "CREATE_INSTANT_INVITE", "SEND_MESSAGES", "ADD_REACTIONS"]
          },
          // TODO: only add verification role if enabled
          {
            type: "role",
            id: verificationRoleId,
            allow: ["SEND_MESSAGES", "ADD_REACTIONS"]
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
          },
        ],
        reason: "StudyBot automatic channel creation.",
      }
    );

    return channel;
  }

  public static async createVoiceChannel(guildContext: GuildContext, course: Course, categoryId: string, mainRoleId: string, taRoleId: string, verificationRoleId: string): Promise<Discord.VoiceChannel> {
    const channel = await guildContext.guild.channels.create(
      CourseUtils.getVoiceChannelName(course),
      {
        type: "voice",
        parent: categoryId,
        position: 1,
        permissionOverwrites: [
          {
            type: "role",
            id: guildContext.guild.roles.everyone.id,
            // TODO: only deny speak if verification enabled
            deny: ["VIEW_CHANNEL", "STREAM", "SPEAK"]
          },
          // TODO: only add verification role if enabled
          {
            type: "role",
            id: verificationRoleId,
            allow: ["SPEAK"]
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