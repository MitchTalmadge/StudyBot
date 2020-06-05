import * as Discord from "discord.js";
import { CommandController } from "./command-controller";
import { ConfigService } from "services/config";
import { DiscordUtils } from "utils/discord";

export class ModeratorCommandController extends CommandController {

  public onMessageReceived(message: Discord.Message | Discord.PartialMessage): void {
    if(!message.content.startsWith("!!")) {
      return;
    }

    if (!this.isModerator(message.member)) {
      this.guildContext.guildLog(`User ${DiscordUtils.describeUserForLogs(message.author)} tried to use a moderator command but was not a moderator.`);
      return;
    }

    const tokens = message.content.toLowerCase().split(/\s+/);
    tokens[0] = tokens[0].substr(2); // Remove "!!" prefix.

    switch(tokens[0]) {
      case "whois":
        this.runWhoisCommand(tokens);
        break;
      default:
        this.guildContext.guildLog(`User ${DiscordUtils.describeUserForLogs(message.author)} tried to use a non-existent moderator command: ${tokens[0]}.`);
    }
  }

  private runWhoisCommand(tokens: string[]) {
    // TODO
  }

  private isModerator(member: Discord.GuildMember): boolean {
    const moderatorRoleName = ConfigService.getConfig().guilds[this.guildContext.guild.id].moderatorRoleName.toLowerCase();
    return member.roles.cache.some(r => r.name.toLowerCase() === moderatorRoleName)
  }

}