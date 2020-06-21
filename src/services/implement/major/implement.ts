import * as Discord from "discord.js";
import { CourseImplementConstants } from "../../../constants/implement/course";
import { DiscordConstants } from "constants/discord";
import { DiscordUtils } from "utils/discord";
import { GuildContext } from "guild-context";
import { GuildStorageDatabaseService } from "services/database/guild-storage";
import { ICourseImplement } from "models/implement/course";
import { IMajorImplement } from "models/implement/major";
import { Major } from "models/major";
import { MajorCategoryImplementService } from "./category";

export class MajorImplementService {
  /**
   * How many channels are allowed in each Major category.
   * Space is reserved to allow us to swap channels around when sorting the overflow categories.
   */
  private static readonly MAX_CHANNELS_PER_CATEGORY =
    (DiscordConstants.MAX_CHANNELS_PER_CATEGORY - CourseImplementConstants.CHANNELS_PER_COURSE_IMPLEMENT);

  public static async getMajorImplementIfExists(guildContext: GuildContext, major: Major): Promise<IMajorImplement | undefined> {
    const implement = await GuildStorageDatabaseService.getMajorImplement(guildContext, major);
    if (implement) {
      return implement;
    }
    return undefined;
  }

  private static async createEmptyMajorImplement(guildContext: GuildContext, major: Major): Promise<IMajorImplement> {
    const implement: IMajorImplement = {
      categoryIds: [],
      courseImplements: new Map<string, ICourseImplement>()
    };

    await GuildStorageDatabaseService.setMajorImplement(guildContext, major, implement);
    return implement;
  }

  /**
   * Determines the ID of the Major category where a new Course implement's channels 
   * should be placed in order to not cause Discord errors due to too many channels 
   * being in one category.
   * @param guildContext The guild context.
   * @param major The major.
   * @return The ID of an existing Major category where the channels will fit.
   */
  public static async getCategoryIdForNewCourseImplement(guildContext: GuildContext, major: Major): Promise<string> {
    let implement = await this.getMajorImplementIfExists(guildContext, major);
    if (!implement) {
      implement = await this.createEmptyMajorImplement(guildContext, major);
    }

    guildContext.guildDebug("Major category requested for new course implement.");
    const categoryIndex = this.findCategoryIndexForNewCourseImplement(guildContext, implement);

    implement = await this.scaleOutCategories(guildContext, major, categoryIndex + 1);
    return implement.categoryIds[categoryIndex];
  }

  /**
   * Recursively searches for an empty spot in existing Major categories 
   * that a new course implement can be placed into.
   * @param guildContext The guild context.
   * @param majorImplement The major implement.
   * @param currentIndex Used to keep track of recursion; initially set to 0.
   * @returns The index to be used for the new course implement. 
   *  This index may be greater than the actual number of existing categories.
   */
  private static findCategoryIndexForNewCourseImplement(guildContext: GuildContext, majorImplement: IMajorImplement, currentIndex: number = 0): number {
    if (currentIndex === majorImplement.categoryIds.length) {
      guildContext.guildDebug(`All previous Major categories are full. Will create and use Major category ${currentIndex}.`);
      return currentIndex;
    }

    const category: Discord.CategoryChannel = <Discord.CategoryChannel>guildContext.guild.channels.resolve(majorImplement.categoryIds[currentIndex]);
    const channelsInCategory = category.children.size;
    const channelsRemaining = this.MAX_CHANNELS_PER_CATEGORY - channelsInCategory;
    if (channelsRemaining >= CourseImplementConstants.CHANNELS_PER_COURSE_IMPLEMENT) {
      guildContext.guildDebug(`There are ${channelsRemaining} channels left. Will use Major category ${currentIndex}.`);
      return currentIndex;
    }

    return this.findCategoryIndexForNewCourseImplement(guildContext, majorImplement, currentIndex + 1);
  }

  /**
   * Ensures the creation of at least enough categories to meet the count provided.
   * @param guildContext The guild context.
   * @param major The major.
   * @param count The number of categories needed.
   * @returns A promise that resolves the updated major implement.
   */
  private static async scaleOutCategories(guildContext: GuildContext, major: Major, count: number): Promise<IMajorImplement> {
    const implement = await GuildStorageDatabaseService.getMajorImplement(guildContext, major);
    const numToCreate = count - implement.categoryIds.length;
    guildContext.guildDebug(`Scaling out to ${count} categories (${numToCreate <= 0 ? "None" : numToCreate} to create.)`);
    for (let i = 0; i < numToCreate; i++) {
      await DiscordUtils.rateLimitAvoidance();
      const categoryId = (await MajorCategoryImplementService.createCategory(guildContext, major)).id;
      implement.categoryIds.push(categoryId);
    }
    await GuildStorageDatabaseService.setMajorImplement(guildContext, major, implement);
    return implement;
  }

  public static async deleteMajorImplementIfEmpty(guildContext: GuildContext, major: Major): Promise<void> {
    const implement = await this.getMajorImplementIfExists(guildContext, major);
    if (!implement) {
      return;
    }

    if (implement.courseImplements.size > 0) {
      return;
    }

    //await DiscordUtils.rateLimitAvoidance();
    //await guildContext.guild.channels.resolve(implement.categoryId).delete();

    //await GuildStorageDatabaseService.setMajorImplement(guildContext, major, undefined);
  }

  /**
   * Re-sorts all aspects of the major implement (channels, roles) based on names.
   * @param guildContext The guild context.
   * @param major The major.
   * @returns A promise that resolves when sorting is complete.
   */
  public static async sortMajorImplement(guildContext: GuildContext, major: Major): Promise<void> {
    const implement = await this.getMajorImplementIfExists(guildContext, major);
    if (!implement) {
      return;
    }

    // Channels
    // const category = <Discord.CategoryChannel>guildContext.guild.channels.resolve(implement.categoryId);

    // const channelPositions: Discord.ChannelPosition[] = [];
    // channelPositions.push(...this.createChannelPositionsByName(category.children.array()));

    // await guildContext.guild.setChannelPositions(channelPositions);
    // await DiscordUtils.rateLimitAvoidance();

    //TODO: Roles
  }

  private static createChannelPositionsByName(channels: Discord.GuildChannel[]): Discord.ChannelPosition[] {
    return channels
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c, i) => {
        return {
          channel: c,
          position: i
        };
      });
  }
}