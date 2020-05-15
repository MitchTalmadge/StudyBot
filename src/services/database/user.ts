import * as Discord from "discord.js";
import { IUser, User } from "src/models/database/user";
import { Course } from "src/models/course";
import { GuildContext } from "src/guild-context";
import { RoleAssignmentDiscordService } from "../discord/role-assignment";
import _ from "lodash";
import moment from "moment";

export class UserDatabaseService {
  constructor(private guildContext: GuildContext) { }

  private async findOrCreateUser(discordUser: Discord.User): Promise<IUser> {
    let user = await User.findOne({ discordUserId: discordUser.id }).exec();
    if (!user) {
      user = await new User(
        <IUser>{
          discordUserId: discordUser.id
        }).save();
    }

    return user;
  }

  public async addCoursesToMember(discordMember: Discord.GuildMember, courses: Course[]): Promise<void> {
    let user = await this.findOrCreateUser(discordMember.user);

    const serializedCourses = courses.map(course => {
      return {
        majorPrefix: course.major.prefix,
        number: course.number
      };
    });

    let guildData = user.guilds.get(this.guildContext.guild.id);
    if (!guildData) {
      user.guilds.set(this.guildContext.guild.id, {
        courses: serializedCourses,
        coursesLastUpdated: moment()
      });
      user = await user.save();
    } else {
      guildData.courses = _.unionBy(guildData.courses, serializedCourses, course => `${course.majorPrefix}-${course.number}`);
      user = await user.save();
    }

    RoleAssignmentDiscordService.queueCourseRolesAddition(this.guildContext, discordMember, courses);

    return;
  }

  public async removeCoursesFromMember(discordMember: Discord.GuildMember, courses: Course[]): Promise<void> {
    let user = await this.findOrCreateUser(discordMember.user);

    const serializedCourses = courses.map(course => {
      return {
        majorPrefix: course.major.prefix,
        number: course.number
      };
    });

    let guildData = user.guilds.get(this.guildContext.guild.id);
    if (!guildData) {
      user.guilds.set(this.guildContext.guild.id, {
        courses: [],
        coursesLastUpdated: moment()
      });
      user = await user.save();
    } else {
      guildData.courses = _.differenceBy(guildData.courses, serializedCourses, course => `${course.majorPrefix}-${course.number}`);
      user = await user.save();
    }

    RoleAssignmentDiscordService.queueCourseRolesRemoval(this.guildContext, discordMember, courses);

    return;
  }
}