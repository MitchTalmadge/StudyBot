import { CommandController } from "controllers/command/command-controller";
import { DevCommandController } from "controllers/command/dev";
import { ModeratorCommandController } from "controllers/command/moderator";
import * as Discord from "discord.js";
import _ from "lodash";
import { Course } from "models/course";
import { VerificationStatus } from "models/verification-status";
import { BanService } from "services/ban";
import { UserDatabaseService } from "services/database/user";
import { VerificationImplementService } from "services/implement/verification/implement";
import { MemberUpdateService } from "services/member-update";
import { DiscordUtils } from "utils/discord";

import { CourseSelectionChannelController } from "./controllers/channel/course-selection";
import { VerificationChannelController } from "./controllers/channel/verification";
import { GuildConfig } from "./models/config";
import { MajorMap } from "./models/major-map";
import { CourseService } from "./services/course";
import { WebCatalogFactory } from "./services/web-catalog/web-catalog-factory";

/**
 * For the purposes of the bot, wraps up everything it needs to know about one guild.
 * Since each guild would have its own major, users, roles, channels, etc., this helps keep things separate.
 */
export class GuildContext {
  private courseSelectionController: CourseSelectionChannelController;
  
  private verificationController: VerificationChannelController;

  private commandControllers: CommandController[] = [];

  /**
   * The list of allowed courses that users can be assigned to.
   * May be empty if the list could not be populated automatically.
   */
  public courses: { [majorPrefix: string]: Course[] };

  public verifiedRoleId: string;

  constructor(
    public guild: Discord.Guild,
    public guildConfig: GuildConfig,
    public majors: MajorMap) {
    this.init();
  }

  private async init(): Promise<void> {
    this.guildLog("Initializing verified role...");
    const verificationImplement = await VerificationImplementService.getOrCreateVerificationImplement(this);
    this.verifiedRoleId = verificationImplement.roleId;

    this.guildLog("Initializing course lists...");
    CourseService.fetchCourseList(this, new WebCatalogFactory().getWebCatalog(this.guildConfig.webCatalog))
      .then(courses => this.courses = courses)
      .catch(err => {
        this.guildError("Failed to get course lists from the web catalog.");
        console.error(err);

        _.forIn(this.majors, major => {
          this.courses[major.prefix] = [];
        });
      });

    this.initControllers();
  }

  private initControllers(): void {
    this.courseSelectionController = new CourseSelectionChannelController(this);
    this.verificationController = new VerificationChannelController(this);

    this.commandControllers.push(new DevCommandController(this));
    this.commandControllers.push(new ModeratorCommandController(this));
  }

  public onMessageReceived(message: Discord.Message | Discord.PartialMessage): void {
    // Channel Controllers
    if (message.channel instanceof Discord.TextChannel) {
      if (message.channel.id === this.guildConfig.courseSelectionChannelId) {
        this.courseSelectionController.onMessageReceived(message);
      } else if (message.channel.id === this.guildConfig.verificationChannelId) {
        this.verificationController.onMessageReceived(message);
      }
    }

    // Command Controllers
    this.commandControllers.forEach(commandController => commandController.onMessageReceived(message));
  }

  public onMemberJoin(member: Discord.GuildMember): void {
    BanService.kickIfBanned(member)
      .catch(err => {
        this.guildError(`Failed to ensure ${DiscordUtils.describeUserForLogs(member.user)} was kicked if banned:`, err);
      })
      .then(wasBanned => {
        if(!wasBanned) {
          return UserDatabaseService.findOrCreateUser(member.user.id, this);
        }
      })
      .catch(err => {
        this.guildError(`Failed to get user from DB on join for ${DiscordUtils.describeUserForLogs(member.user)}.`, err);
      })
      .then(user => {
        if(!user)
          return;

        if(user.verificationStatus == VerificationStatus.VERIFIED) {
          MemberUpdateService.queueMarkVerified(this, member);
        }
      });
  }

  public onMemberLeave(member: Discord.GuildMember): void {
    MemberUpdateService.queueUnassignAllCourses(this, member, false)
      .then(() => {
        UserDatabaseService.leaveGuild(this, member)
          .catch(err => {
            this.guildError(`Failed to clear guild from member ${DiscordUtils.describeUserForLogs(member.user)} on guild leave.`, err);
          });
      })
      .catch(err => {
        this.guildError(`Failed to unassign courses from member ${DiscordUtils.describeUserForLogs(member.user)} on guild leave.`, err);
      });
  }

  public guildLog(message: string, ...optionalParams: any): void {
    console.log(`[G: ${this.guild.name}] ${message}`, ...optionalParams);
  }
  
  public guildDebug(message: string, ...optionalParams: any): void {
    if(process.env.NODE_ENV === "development") {
      this.guildLog(`[DEBUG] ${message}`, ...optionalParams);
    }
  }

  public guildError(message: string, ...optionalParams: any): void {
    console.error(`[G: ${this.guild.name}] ${message}`, ...optionalParams);
  }
}