import * as Discord from "discord.js";
import { GuildContext } from "guild-context";
import { Course } from "models/course";
import { CourseImplementChannelType } from "models/implement/course";
import { CourseUtils } from "utils/course";

export class CourseChannelImplementService {
  public static async createChannelByType(
    guildContext: GuildContext,
    type: CourseImplementChannelType,
    course: Course,
    categoryId: string,
    mainRoleId: string,
    taRoleId: string,
    verificationRoleId: string): Promise<Discord.Channel> {
    switch (type) {
      case CourseImplementChannelType.CHAT:
        return this.createChatChannel(guildContext, course, categoryId, mainRoleId, taRoleId, verificationRoleId);
      case CourseImplementChannelType.VOICE:
        return this.createVoiceChannel(guildContext, course, categoryId, mainRoleId, taRoleId, verificationRoleId);
    }
  }

  public static async createChatChannel(
    guildContext: GuildContext, 
    course: Course, 
    categoryId: string, 
    mainRoleId: string, 
    taRoleId: string, 
    verificationRoleId: string): Promise<Discord.TextChannel> {
    const channel = await guildContext.guild.channels.create(
      CourseUtils.getChatChannelName(course),
      {
        type: "text",
        topic: `:information_source: ${course.title}`,
        parent: categoryId,
        position: 0,
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
        reason: "StudyBot automatic course channel creation.",
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
        position: 0,
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
        reason: "StudyBot automatic course channel creation.",
      }
    );

    return channel;
  }
}