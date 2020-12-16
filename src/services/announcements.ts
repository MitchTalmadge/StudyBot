import * as Discord from "discord.js";
import { GuildContext } from "guild-context";
import { exit } from "process";

export class AnnouncementsService {
  private announcementsChannel: Discord.TextChannel;

  constructor(guildContext: GuildContext) {
    let announcementsChannel = guildContext.guild.channels.resolve(guildContext.guildConfig.announcementsChannelId);
    if(announcementsChannel.type != "text") {
      guildContext.guildError("FATAL! Announcements channel is not a text channel!");
      exit(1);
    }

    this.announcementsChannel = <Discord.TextChannel>announcementsChannel;
  }

  public async makeAnnouncement(message: string): Promise<void> {
    await this.announcementsChannel.send(message);
  }
}