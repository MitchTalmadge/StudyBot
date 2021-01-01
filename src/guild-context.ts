import { CommandController } from "controllers/command/command-controller";
import { DevCommandController } from "controllers/command/dev";
import { ModeratorCommandController } from "controllers/command/moderator";
import * as Discord from "discord.js";
import _ from "lodash";
import { Course } from "models/course";
import { VerificationStatus } from "models/verification-status";
import { AnnouncementsService } from "services/announcements";
import { BanService } from "services/ban";
import { UserDatabaseService } from "services/database/user";
import { HealthAssuranceService } from "services/health-assurance";
import { MemberUpdateService } from "services/member-update";
import { ResetService } from "services/reset";
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
  private announcementsService: AnnouncementsService;

  private resetService: ResetService;

  private courseSelectionController: CourseSelectionChannelController;
  
  private verificationController: VerificationChannelController;

  private commandControllers: CommandController[] = [];

  /**
   * The list of allowed courses that users can be assigned to.
   * May be empty if the list could not be populated automatically.
   */
  public coursesByMajor: { [majorPrefix: string]: Course[] };

  public verificationRoleId: string;

  private initComplete = false;

  constructor(
    public guild: Discord.Guild,
    public guildConfig: GuildConfig,
    public majors: MajorMap) {
    this.init()
      .catch(err => {
        this.guildError("Failed to initialize guild:", err);
      });
  }

  private async init(): Promise<void> {
    this.guildLog("Initializing course lists...");
    this.coursesByMajor = await CourseService.fetchCourseList(this, new WebCatalogFactory().getWebCatalog(this.guildConfig.webCatalog))
      .catch(err => {
        this.guildError("Failed to get course lists from the web catalog:", err);

        let courses: { [majorPrefix: string]: Course[] } = {};

        _.forIn(this.majors, major => {
          courses[major.prefix] = [];
        });

        return courses;
      });
    
    this.guildLog("Performing startup health checks...");
    await this.initHealth();

    this.guildLog("Initializing services...");
    this.initServices();

    this.guildLog("Initializing controllers...");
    this.initControllers();

    this.guildLog("Initialization complete.");
    this.initComplete = true;
  }

  private async initHealth(): Promise<void> {
    let has = new HealthAssuranceService(this);
    this.verificationRoleId = await has.guaranteeVerificationRole();
    await has.guaranteeCourseImplements();
    await has.identifyAndFixHealthIssues();
  }

  private initServices(): void {
    this.announcementsService = new AnnouncementsService(this);
    this.resetService = new ResetService(this);
  }

  private initControllers(): void {
    this.courseSelectionController = new CourseSelectionChannelController(this);
    this.verificationController = new VerificationChannelController(this);

    this.commandControllers.push(new DevCommandController(this));
    this.commandControllers.push(new ModeratorCommandController(this, this.resetService));
  }

  public onMessageReceived(message: Discord.Message): void {
    if(!this.initComplete) {
      this.guildLog(`Message ID ${message.id} from ${DiscordUtils.describeUserForLogs(message.author)} dropped because init is not complete.`);
      return;
    }

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
    MemberUpdateService.queueLeaveGuild(this, member.user.id);
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