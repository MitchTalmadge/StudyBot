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
    const user = await this.findOrCreateUser(discordMember.user);

    const serializedCourses: IUserCourseAssignment[] =
      courses.map(course =>
        <IUserCourseAssignment>{
          courseKey: CourseUtils.convertToString(course),
          isTA: false
        });

    const guildData = user.guilds.get(guildContext.guild.id);
    if (!guildData) {
      user.guilds.set(guildContext.guild.id, {
        courses: serializedCourses,
        coursesLastUpdated: moment()
      });
      await user.save();
    } else {
      guildData.courses = _.union(guildData.courses, serializedCourses);
      await user.save();
    }

    return RoleAssignmentDiscordService.queueCourseRolesAddition(guildContext, discordMember, courses);
  }

  public static async removeCoursesFromMember(guildContext: GuildContext, discordMember: Discord.GuildMember, courses: Course[]): Promise<void> {
    const user = await this.findOrCreateUser(discordMember.user);

    const courseKeys = courses.map(course => CourseUtils.convertToString(course));

    const guildData = user.guilds.get(guildContext.guild.id);
    if (!guildData) {
      user.guilds.set(guildContext.guild.id, {
        courses: [],
        coursesLastUpdated: moment()
      });
      await user.save();
    } else {
      guildData.courses = guildData.courses.filter(course => !courseKeys.includes(course.courseKey))
      await user.save();
    }

    return RoleAssignmentDiscordService.queueCourseRolesRemoval(guildContext, discordMember, courses);
  }

  public static async toggleTAStatusForMember(guildContext: GuildContext, discordMember: Discord.GuildMember, courses: Course[]): Promise<void> {
    const user = await this.findOrCreateUser(discordMember.user);
    
    const courseKeys = courses.map(course => CourseUtils.convertToString(course));

    const guildData = user.guilds.get(guildContext.guild.id);
    const taCourses: Course[] = [];
    const nonTACourses: Course[] = [];
    const selectedCourses = guildData.courses.filter(course => courseKeys.includes(course.courseKey));
    selectedCourses.forEach(course => {
      course.isTA = !course.isTA;
      if(course.isTA) {
        taCourses.push(courses[courseKeys.findIndex(c => c === course.courseKey)]);
      } else {
        nonTACourses.push(courses[courseKeys.findIndex(c => c === course.courseKey)]);
      }
    });

    await user.save();

    RoleAssignmentDiscordService.queueTARoleAssignments(guildContext, discordMember, taCourses, nonTACourses);
  }

  public static async getUsersByCourse(guildContext: GuildContext, course: Course): Promise<IUser[]> {
    const key = `guilds.${guildContext.guild.id}.courses.courseKey`;
    const users = await User.find({ [key]: CourseUtils.convertToString(course) }).exec();

    return users;
  }
}