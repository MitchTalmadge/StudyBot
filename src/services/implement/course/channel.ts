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
    let discordChannelType: any;
    let topic = null;

    switch (type) {
      case CourseImplementChannelType.CHAT:
        discordChannelType = "text";
        topic = course.title ? `:information_source: ${course.title}` : "";
        break;
      case CourseImplementChannelType.VOICE:
        discordChannelType = "voice";
        break;
    }

    const channel = await guildContext.guild.channels.create(
      CourseUtils.getChannelNameByType(course, type),
      {
        type: discordChannelType,
        topic: topic,
        parent: categoryId,
        position: 0,
        permissionOverwrites: this.generateChannelPermissionsByType(guildContext, type, mainRoleId, taRoleId),
        reason: "StudyBot automatic course channel creation.",
      }
    );

    return channel;
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
    let permissions: Discord.OverwriteResolvable[] = [];
    switch(type) {
      case CourseImplementChannelType.CHAT:
        permissions = [
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

        if(guildContext.guildConfig.studentAdvisoryCommittee) {
          permissions.push({
            type: "role",
            id: guildContext.guildConfig.studentAdvisoryCommittee.roleId,
            allow: ["VIEW_CHANNEL"]
          });
        }
        break;
      case CourseImplementChannelType.VOICE:
        permissions = [
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

        if(guildContext.guildConfig.studentAdvisoryCommittee) {
          permissions.push({
            type: "role",
            id: guildContext.guildConfig.studentAdvisoryCommittee.roleId,
            allow: ["VIEW_CHANNEL", "SPEAK", "STREAM"]
          });
        }
        break;
    }  
    
    return permissions;
  }
}