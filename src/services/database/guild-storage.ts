import { GuildStorage, IGuildStorage } from "models/database/guild-storage";
import { Course } from "models/course";
import { CourseUtils } from "utils/course";
import { GuildContext } from "guild-context";
import { ICourseImplement } from "models/implement/course";
import { IMajorImplement } from "models/implement/major";
import { IVerificationImplement } from "models/implement/verification";
import { Major } from "models/major";

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

  public static async getMajorImplement(guildContext: GuildContext, major: Major): Promise<IMajorImplement | undefined> {
    const storage = await this.findOrCreateGuildStorage(guildContext);
    const majorData = storage.majorImplements.get(major.prefix);
    return majorData;
  }

  public static async setMajorImplement(guildContext: GuildContext, major: Major, implement: IMajorImplement): Promise<void> {
    const storage = await this.findOrCreateGuildStorage(guildContext);

    if(implement)
      storage.majorImplements.set(major.prefix, implement);
    else
      storage.majorImplements.delete(major.prefix);
      
    await storage.save();
  }

  public static async getCourseImplement(guildContext: GuildContext, course: Course): Promise<ICourseImplement | undefined> {
    const storage = await this.findOrCreateGuildStorage(guildContext);
    const majorImplement = storage.majorImplements.get(course.major.prefix);
    if(!majorImplement)
      return null;
    return majorImplement.courseImplements.get(CourseUtils.convertToString(course));
  }

  public static async setCourseImplement(guildContext: GuildContext, course: Course, implement: ICourseImplement): Promise<void> {
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

  public static async getVerificationImplement(guildContext: GuildContext): Promise<IVerificationImplement | undefined> {
    const storage = await this.findOrCreateGuildStorage(guildContext);
    return storage.verificationImplement;
  }

  public static async setVerificationImplement(guildContext: GuildContext, implement: IVerificationImplement): Promise<void> {
    const storage = await this.findOrCreateGuildStorage(guildContext);
    storage.verificationImplement = implement;
    await storage.save();
  }
}