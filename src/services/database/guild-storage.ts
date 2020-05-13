import { GuildStorage, IGuildStorage } from "src/models/database/guild-storage";
import { Course } from "src/models/course";
import { CourseUtils } from "src/utils/course";
import { GuildContext } from "src/guild-context";
import { ICourseImplementDiscord } from "src/models/discord/implement/course";
import { IMajorImplementDiscord } from "src/models/discord/implement/major";
import { Major } from "src/models/major";

export class GuildStorageDatabaseService {
  public static async findOrCreateGuildStorage(guildContext: GuildContext): Promise<IGuildStorage> {
    // Find existing storage.
    let storage = await GuildStorage.findOne({ guildId: guildContext.guild.id }).exec();
    if (storage) {
      return storage;
    }

    // Create a new storage.
    let majorImplements = new Map<string, {}>();
    storage = await new GuildStorage(<IGuildStorage>{
      guildId: guildContext.guild.id,
      majorImplements,
    }).save();
    return storage;
  }

  public static async getMajorImplement(guildContext: GuildContext, major: Major): Promise<IMajorImplementDiscord> {
    const storage = await this.findOrCreateGuildStorage(guildContext);
    const majorData = storage.majorImplements.get(major.prefix);
    return majorData;
  }

  public static async setMajorImplement(guildContext: GuildContext, major: Major, implement: IMajorImplementDiscord): Promise<void> {
    const storage = await this.findOrCreateGuildStorage(guildContext);
    storage.majorImplements.set(major.prefix, implement);
    await storage.save();
  }

  public static async getCourseImplement(guildContext: GuildContext, course: Course): Promise<ICourseImplementDiscord> {
    const storage = await this.findOrCreateGuildStorage(guildContext);
    const majorImplement = storage.majorImplements.get(course.major.prefix);
    if(!majorImplement)
      return null;
    return majorImplement.courseImplements.get(CourseUtils.convertToString(course));
  }

  public static async setCourseImplement(guildContext: GuildContext, course: Course, implement: ICourseImplementDiscord): Promise<void> {
    const storage = await this.findOrCreateGuildStorage(guildContext);
    const majorImplement = storage.majorImplements.get(course.major.prefix);
    if(!majorImplement) {
      guildContext.guildError(`Tried to set a course implement when major implement does not exist. Couse: ${CourseUtils.convertToString(course)}`);
      return;
    }

    if (implement)
      majorImplement.courseImplements.set(CourseUtils.convertToString(course), implement);
    else
      majorImplement.courseImplements.delete(CourseUtils.convertToString(course));

    await storage.save();
  }
}