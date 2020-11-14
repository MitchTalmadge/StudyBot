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
    taRoleId: string): Promise<Discord.Channel> {
    switch (type) {
      case CourseImplementChannelType.CHAT:
        return this.createChatChannel(guildContext, course, categoryId, mainRoleId, taRoleId);
      case CourseImplementChannelType.VOICE:
        return this.createVoiceChannel(guildContext, course, categoryId, mainRoleId, taRoleId);
    }
  }

  public static async resetChannelPermissionsByType(
    guildContext: GuildContext,
    type: CourseImplementChannelType,
    mainRoleId: string,
    taRoleId: string,
    channel: Discord.GuildChannel
  ) {
    await channel.overwritePermissions(this.generateChannelPermissionsByType(guildContext, type, mainRoleId, taRoleId));
  }

  private static generateChannelPermissionsByType(
    guildContext: GuildContext,
    type: CourseImplementChannelType,
    mainRoleId: string,
    taRoleId: string
  ): Discord.OverwriteResolvable[] {
    switch(type) {
      case CourseImplementChannelType.CHAT:
        return [
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
          },
          {
            type: "role",
            id: guildContext.guildConfig.moderatorRoleId,
            allow: ["VIEW_CHANNEL"]
          }
        ];
      case CourseImplementChannelType.VOICE:
        return [
          {
            type: "role",
            id: guildContext.guild.roles.everyone.id,
            deny: ["VIEW_CHANNEL"],
            allow: ["SPEAK", "STREAM"]
          },
          {
            type: "role",
            id: mainRoleId,
            allow: ["VIEW_CHANNEL"]
          },
          {
            type: "role",
            id: taRoleId,
            allow: ["VIEW_CHANNEL", "MUTE_MEMBERS", "DEAFEN_MEMBERS", "PRIORITY_SPEAKER"]
          },
          {
            type: "role",
            id: guildContext.guildConfig.moderatorRoleId,
            allow: ["VIEW_CHANNEL"]
          }
        ];
    }    
  }

  public static async createChatChannel(
    guildContext: GuildContext, 
    course: Course, 
    categoryId: string, 
    mainRoleId: string, 
    taRoleId: string): Promise<Discord.TextChannel> {
    const channel = await guildContext.guild.channels.create(
      CourseUtils.getChatChannelName(course),
      {
        type: "text",
        topic: `:information_source: ${course.title}`,
        parent: categoryId,
        position: 0,
        permissionOverwrites: this.generateChannelPermissionsByType(guildContext, CourseImplementChannelType.CHAT, mainRoleId, taRoleId),
        reason: "StudyBot automatic course channel creation.",
      }
    );

    return channel;
  }

  public static async createVoiceChannel(
    guildContext: GuildContext, 
    course: Course, 
    categoryId: string, 
    mainRoleId: string, 
    taRoleId: string): Promise<Discord.VoiceChannel> {
    const channel = await guildContext.guild.channels.create(
      CourseUtils.getVoiceChannelName(course),
      {
        type: "voice",
        parent: categoryId,
        position: 0,
        permissionOverwrites: this.generateChannelPermissionsByType(guildContext, CourseImplementChannelType.VOICE, mainRoleId, taRoleId),
        reason: "StudyBot automatic course channel creation.",
      }
    );

    return channel;
  }
}