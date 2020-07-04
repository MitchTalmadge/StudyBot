import { GuildContext } from "guild-context";
import { DiscordUtils } from "utils/discord";

import { BanService } from "./ban";
import { UserDatabaseService } from "./database/user";
import { MajorImplementService } from "./implement/major/implement";
import { MemberUpdateService } from "./member-update";

export class HealthAssuranceService {
  public static async identifyAndFixHealthIssues(guildContext: GuildContext) {
    guildContext.guildLog("Identifying and fixing health issues...");

    const members = await guildContext.guild.members.fetch();
    for(let member of members.values()) {
      // Don't check the bot itself.
      if(member.user.id === guildContext.guild.client.user.id)
        continue;

      // Ensure a user exists for every member in the server.
      await UserDatabaseService.findOrCreateUser(member.id, guildContext);
      
      // Make sure banned users did not slip in without our knowledge.
      await BanService.kickIfBanned(member);

      // Synchronize roles.
      await MemberUpdateService.queueSynchronizeRoles(guildContext, member)
        .catch(err => {
          guildContext.guildError(`Failed to synchronize roles for ${DiscordUtils.describeUserForLogs(member.user)}:`, err);
        });
    }

    const users = await UserDatabaseService.getAllUsers();
    for(let user of users) {
      // Check if the user has left this guild without our knowledge.
      if(user.guilds.has(guildContext.guild.id)) {
        if(!members.some(m => m.user.id === user.discordUserId)) {
          await MemberUpdateService.queueLeaveGuild(guildContext, user.discordUserId);
        }
      }
    }

    // Final sweep to ensure we clean up everything.
    await MajorImplementService.cleanUpImplements(guildContext);
  }
}