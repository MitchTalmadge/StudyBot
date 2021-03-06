import { GuildContext } from "guild-context";
import { DiscordUtils } from "utils/discord";

import { BanService } from "./ban";
import { CourseService } from "./course";
import { GuildStorageDatabaseService } from "./database/guild-storage";
import { UserDatabaseService } from "./database/user";
import { CourseImplementService } from "./implement/course/implement";
import { MajorImplementService } from "./implement/major/implement";
import { VerificationImplementService } from "./implement/verification/implement";
import { MemberUpdateService } from "./member-update";

export class HealthAssuranceService {
  constructor(private guildContext: GuildContext) {
  }

  public async guaranteeVerificationRole(): Promise<string> {
    await VerificationImplementService.guarantee(this.guildContext);
    return (await VerificationImplementService.getOrCreateVerificationImplement(this.guildContext)).roleId;
  }

  public async guaranteeCourseImplements() {
    this.guildContext.guildLog("Guaranteeing course implements...");
    const guildStorage = await GuildStorageDatabaseService.findOrCreateGuildStorage(this.guildContext);
    for(let majorImplement of guildStorage.majorImplements) {
      await MajorImplementService.guarantee(this.guildContext, this.guildContext.majors[majorImplement[0]]);
      let courseImplements = majorImplement[1].courseImplements;
      for (let courseImplement of courseImplements) {
        let course = CourseService.findCourseByKey(this.guildContext, courseImplement[0]);
        if(!course) {
          this.guildContext.guildLog(`Cannot find course ${courseImplement[0]} by key. Will not guarantee.`);
          continue;
        }
        await CourseImplementService.guarantee(this.guildContext, course);
      }
    }

    // New channels could require re-sorting.
    await MajorImplementService.sortAll(this.guildContext);
  }

  public async identifyAndFixHealthIssues() {
    this.guildContext.guildLog("Identifying and fixing health issues...");

    const members = await this.guildContext.guild.members.fetch();
    for(let member of members.values()) {
      this.guildContext.guildLog(`Checking ${DiscordUtils.describeUserForLogs(member.user)}...`);
      // Don't check the bot itself.
      if(member.user.id === this.guildContext.guild.client.user.id)
        continue;

      // Ensure a user exists for every member in the server.
      await UserDatabaseService.findOrCreateUser(member.id, this.guildContext);
      
      // Make sure banned users did not slip in without our knowledge.
      await BanService.kickIfBanned(member);
    }

    // Synchronize roles.
    await MemberUpdateService.queueSynchronizeRolesManyMembers(
      this.guildContext, 
      members.array().filter(m => m.user.id !== this.guildContext.guild.client.user.id)
    );

    //const users = await UserDatabaseService.getAllUsers();
    
    // Check if any users have left this guild without our knowledge.
    /* let missingUserIds: string[] = [];
    for(let user of users) {
      if(user.guilds.has(this.guildContext.guild.id)) {
        if(!members.some(m => m.user.id === user.discordUserId)) {
          missingUserIds.push(user.discordUserId);
        }
      }
    }
    if(missingUserIds.length > 0) {
      await MemberUpdateService.queueLeaveGuildManyMembers(this.guildContext, missingUserIds);
    } */

    // Final sweep to ensure we clean up everything.
    await MajorImplementService.cleanUpImplements(this.guildContext);
  }
}