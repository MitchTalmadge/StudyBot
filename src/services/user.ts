import * as Discord from "discord.js";
import { IUser, User } from "src/models/database/user";
import { Course } from "src/models/course";
import { GuildContext } from "src/guild-context";
import moment from "moment";

export class UserService {
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

    let guildData = user.guilds.get(this.guildContext.guild.id);
    if (!guildData) {
      user.guilds.set(this.guildContext.guild.id, {
        courseNumbers: courses.map(course => course.number),
        coursesLastUpdated: moment()
      });
      user = await user.save();
    } else {
      courses.forEach(course => {
        if (guildData.courseNumbers.includes(course.number))
          return;

        guildData.courseNumbers.push(course.number);
      });

      user = await user.save();
    }

    // TODO: Role service assignments

    return;
  }

  public async removeCoursesFromMember(discordMember: Discord.GuildMember, courses: Course[]): Promise<void> {
    let user = await this.findOrCreateUser(discordMember.user);

    let guildData = user.guilds.get(this.guildContext.guild.id);
    if (!guildData) {
      user.guilds.set(this.guildContext.guild.id, {
        courseNumbers: [],
        coursesLastUpdated: moment()
      });
      user = await user.save();
    } else {
      guildData.courseNumbers = guildData.courseNumbers.filter(courseNumber => !courses.some(course => course.number === courseNumber));
      user = await user.save();
    }

    // TODO: Role service assignments

    return;
  }
}