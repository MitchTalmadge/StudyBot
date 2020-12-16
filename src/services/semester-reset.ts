import { GuildContext } from "guild-context";
import moment from "moment";
import schedule from "node-schedule";

import { UserDatabaseService } from "./database/user";
import { MemberUpdateService } from "./member-update";

export class SemesterResetService {
  private static readonly RESET_DATES: {startOf: string, resetDate: moment.Moment}[] = [
    {
      startOf: "spring",
      resetDate: moment("01/05", "MM/DD")
    },
    {
      startOf: "summer",
      resetDate: moment("05/17", "MM/DD")
    },
    {
      startOf: "fall",
      resetDate: moment("08/18", "MM/DD")
    },
    {
      startOf: "fake",
      resetDate: moment("12/16", "MM/DD")
    }
  ] 

  
  private job: schedule.Job;
  
  
  constructor(private guildContext: GuildContext) {
    // TODO: Configurable timezone
    this.job = schedule.scheduleJob("Semester Reset Check", { rule: "47 2 * * *", tz: "America/Denver" }, () => this.checkSemesterReset());
    this.guildContext.guildLog("Semester reset check is scheduled daily starting at", moment(this.job.nextInvocation().toISOString()).format());
  }

  private checkSemesterReset() {
    // TODO: Configurable reset dates
    this.guildContext.guildLog("Checking if semester reset is today...");
    let now = moment();
    let matchingDates = SemesterResetService.RESET_DATES.filter(date => {
      return date.resetDate.month == now.month && date.resetDate.date() == now.date();
    });

    if(matchingDates.length == 0) {
      this.guildContext.guildLog("No reset today.");
      return;
    }

    if(matchingDates.length > 1) {
      this.guildContext.guildError("Multiple dates matched today; this shouldn't happen!", matchingDates);
      return;
    }

    let matchingDate = matchingDates[0];
    this.doSemesterReset(matchingDate.startOf)
      .catch(err => this.guildContext.guildError("Failed to complete semester reset:", err));
  }

  private async doSemesterReset(startOf: string) {
    this.guildContext.guildLog(`!!! Semester reset for start of ${startOf} semester initiated!`);

    let usersToReset = (await UserDatabaseService.getAllUsers()).filter(user => {
      let guild = user.guilds.get(this.guildContext.guild.id);
      return guild && guild.courses.length > 0 && moment.duration(moment(guild.coursesLastUpdated).diff(moment())).asDays() < 30;
    });
    let userIdsToReset = usersToReset.map(user => user.discordUserId);

    this.guildContext.guildLog(`${usersToReset.length} users will have their course assignments reset.`);

    let membersToReset = (await this.guildContext.guild.members.fetch()).array().filter(member => {
      return userIdsToReset.includes(member.user.id);
    });

    if(membersToReset.length != userIdsToReset.length) {
      this.guildContext.guildError(`Caution: Of the ${usersToReset.length} users to reset, ${membersToReset.length} were found.`);
    }

    await MemberUpdateService.queueUnassignAllCoursesManyMembers(this.guildContext, membersToReset);
    // TODO: Announcement

    this.guildContext.guildLog("!!! Semester reset complete!");
  }
}