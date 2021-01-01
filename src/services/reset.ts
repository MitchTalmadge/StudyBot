import { GuildContext } from "guild-context";
import { CourseImplementChannelType } from "models/implement/course";
import moment from "moment";

import { GuildStorageDatabaseService } from "./database/guild-storage";
import { UserDatabaseService } from "./database/user";
import { HealthAssuranceService } from "./health-assurance";
import { MemberUpdateService } from "./member-update";

export class ResetService {  
  constructor(private guildContext: GuildContext, private healthAssuranceService: HealthAssuranceService) {
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
    this.guildContext.guildLog("!!! Resetting Course Assignments!");

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
    
    this.guildContext.guildLog("!!! Course Assignment Reset Complete!");

    return membersToReset.length;
  }

  public async wipeCourseChannels(): Promise<void> {
    this.guildContext.guildLog("!!! Wiping Course Channels!");

    // Delete all course text channels, since Discord does not expose a way to clear a channel.
    const guildStorage = await GuildStorageDatabaseService.findOrCreateGuildStorage(this.guildContext);
    for(let majorImplement of guildStorage.majorImplements) {
      let courseImplements = majorImplement[1].courseImplements;
      for (let courseImplement of courseImplements) {
        const channel = this.guildContext.guild.channels.resolve(courseImplement[1].channelIds[CourseImplementChannelType.CHAT]);
        if(channel) {
          await channel.delete("StudyBot Course Wipe");
        }
      }
    }

    // Re-build the deleted channels.
    await this.healthAssuranceService.guaranteeCourseImplements();

    this.guildContext.guildLog("!!! Course Channel Wipe Complete!");
  } 
}