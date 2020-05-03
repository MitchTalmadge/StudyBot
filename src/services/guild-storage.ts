import { GuildStorage, IGuildStorage } from "src/models/database/guild-storage";
import { Course } from "src/models/course";
import { CourseUtils } from "src/utils/course";
import { GuildContext } from "src/guild-context";
import { Major } from "src/models/major";

export class GuildStorageService {
  public static async findOrCreateGuildStorage(guildContext: GuildContext): Promise<IGuildStorage> {
    // Find existing storage.
    let storage = await GuildStorage.findOne({ guildId: guildContext.guild.id }).exec();
    if(storage) {
      return storage;
    }

    // Create a new storage.
    let majors = new Map<string, {}>();
    Object.keys(guildContext.majors).forEach(majorPrefix => {
      majors.set(majorPrefix, {});
    });
    storage = await new GuildStorage(<IGuildStorage>{
      guildId: guildContext.guild.id,
      majors,
    }).save();
    return storage;
  }

  public static async getAllRoles(guildContext: GuildContext): Promise<Map<string, string>> {
    const storage = await this.findOrCreateGuildStorage(guildContext);
    const roles = new Map<string, string>();
    storage.majors.forEach(major => {
      major.roles.forEach((roleId, courseKey) => {
        roles.set(courseKey, roleId);
      });
    });

    return roles;
  }

  public static async getRolesForMajor(guildContext: GuildContext, major: Major): Promise<Map<string, string>> {
    const storage = await this.findOrCreateGuildStorage(guildContext);
    const majorData = storage.majors.get(major.prefix);

    return majorData.roles;
  }

  public static async addRole(guildContext: GuildContext, course: Course, roleId: string): Promise<void> {
    const storage = await this.findOrCreateGuildStorage(guildContext);
    storage.majors.get(course.major.prefix).roles.set(CourseUtils.convertToString(course), roleId);
    await storage.save();
  }

  public static async removeRole(guildContext: GuildContext, course: Course): Promise<void> {
    const storage = await this.findOrCreateGuildStorage(guildContext);
    storage.majors.get(course.major.prefix).roles.delete(CourseUtils.convertToString(course));
    await storage.save();
  }
}