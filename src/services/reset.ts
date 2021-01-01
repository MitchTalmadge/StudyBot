import { GuildContext } from "guild-context";
import moment from "moment";

import { UserDatabaseService } from "./database/user";
import { MemberUpdateService } from "./member-update";

export class ResetService {  
  constructor(private guildContext: GuildContext) {
  }

  /**
   * Resets the course assignments for all users who have not had their
   * courses updated in the last [gracePeriodDays] days.
   * 
   * Removes any courses that no longer have any assigned users.
   * 
   * @returns The number of members who had their courses unassigned.
   */
  public async resetCourseAssignments(gracePeriodDays = 30): Promise<number> {
    this.guildContext.guildLog("!!! Reset initiated!");

    // Figure out who has not updated their assignments recently.
    let usersToReset = (await UserDatabaseService.getAllUsers()).filter(user => {
      let guild = user.guilds.get(this.guildContext.guild.id);
      return guild?.courses.length > 0 && moment.duration(moment().diff(moment(guild?.coursesLastUpdated))).asDays() > gracePeriodDays;
    });
    let userIdsToReset = usersToReset.map(user => user.discordUserId);

    this.guildContext.guildLog(`${usersToReset.length} users will have their course assignments reset.`);

    // Attempt to associate each Discord User ID with a real Member instance.
    let membersToReset = (await this.guildContext.guild.members.fetch()).array().filter(member => {
      return userIdsToReset.includes(member.user.id);
    });

    if(membersToReset.length != userIdsToReset.length) {
      this.guildContext.guildError(`Caution: Of the ${usersToReset.length} users to reset, ${membersToReset.length} were found.`);
    }

    // Begin unassignment.
    // This will automatically clean up any un-used courses as well.
    await MemberUpdateService.queueUnassignAllCoursesManyMembers(this.guildContext, membersToReset);
    
    this.guildContext.guildLog("!!! Reset complete!");

    return membersToReset.length;
  }
}