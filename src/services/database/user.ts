import * as Discord from "discord.js";
import { IUser, User, IUserCourseAssignment } from "src/models/database/user";
import { Course } from "src/models/course";
import { CourseUtils } from "src/utils/course";
import { GuildContext } from "src/guild-context";
import { RoleAssignmentDiscordService } from "../discord/role-assignment";
import _ from "lodash";
import moment from "moment";

export class UserDatabaseService {
  private static async findOrCreateUser(discordUser: Discord.User): Promise<IUser> {
    let user = await User.findOne({ discordUserId: discordUser.id }).exec();
    if (!user) {
      user = await new User(
        <IUser>{
          discordUserId: discordUser.id
        }).save();
    }

    return user;
  }

  public static async addCoursesToMember(guildContext: GuildContext, discordMember: Discord.GuildMember, courses: Course[]): Promise<void> {
    let user = await this.findOrCreateUser(discordMember.user);

    const serializedCourses: IUserCourseAssignment[] =
      courses.map(course =>
        <IUserCourseAssignment>{
          courseKey: CourseUtils.convertToString(course),
          isTA: false
        });

    let guildData = user.guilds.get(guildContext.guild.id);
    if (!guildData) {
      user.guilds.set(guildContext.guild.id, {
        courses: serializedCourses,
        coursesLastUpdated: moment()
      });
      user = await user.save();
    } else {
      guildData.courses = _.union(guildData.courses, serializedCourses);
      user = await user.save();
    }

    RoleAssignmentDiscordService.queueCourseRolesAddition(guildContext, discordMember, courses);

    return;
  }

  public static async removeCoursesFromMember(guildContext: GuildContext, discordMember: Discord.GuildMember, courses: Course[]): Promise<void> {
    let user = await this.findOrCreateUser(discordMember.user);

    const courseKeys = courses.map(course => CourseUtils.convertToString(course));

    let guildData = user.guilds.get(guildContext.guild.id);
    if (!guildData) {
      user.guilds.set(guildContext.guild.id, {
        courses: [],
        coursesLastUpdated: moment()
      });
      user = await user.save();
    } else {
      guildData.courses = _.differenceWith(guildData.courses, courseKeys, ((course, key) => course.courseKey === key));
      user = await user.save();
    }

    RoleAssignmentDiscordService.queueCourseRolesRemoval(guildContext, discordMember, courses);

    return;
  }

  public static async getUsersByCourse(guildContext: GuildContext, course: Course): Promise<IUser[]> {
    const key = `guilds.${guildContext.guild.id}.courses`;
    const users = await User.find({ [key]: CourseUtils.convertToString(course) }).exec();

    return users;
  }
}