import { DiscordConstants } from "constants/discord";
import * as Discord from "discord.js";
import { GuildContext } from "guild-context";
import { CourseImplementChannelType, ICourseImplement } from "models/implement/course";
import { IMajorImplement } from "models/implement/major";
import { Major } from "models/major";
import { GuildStorageDatabaseService } from "services/database/guild-storage";
import { DiscordUtils } from "utils/discord";

import { MajorCategoryImplementService } from "./category";

export class MajorImplementService {
  /**
   * How many channels are allowed in each Major category.
   * Space is reserved to allow us to swap channels around when sorting the overflow categories.
   */
  private static readonly MAX_CHANNELS_PER_CATEGORY =
    (DiscordConstants.MAX_CHANNELS_PER_CATEGORY - 1);

  public static async getMajorImplementIfExists(guildContext: GuildContext, major: Major): Promise<IMajorImplement | undefined> {
    const implement = await GuildStorageDatabaseService.getMajorImplement(guildContext, major);
    if (implement) {
      return implement;
    }
    return undefined;
  }

  private static async createEmptyMajorImplement(guildContext: GuildContext, major: Major): Promise<IMajorImplement> {
    const implement: IMajorImplement = {
      categoryIdsMatrix: CourseImplementChannelType.values().map(_ => { return { categoryIds: [] }; }),
      courseImplements: new Map<string, ICourseImplement>()
    };

    await GuildStorageDatabaseService.setMajorImplement(guildContext, major, implement);
    return implement;
  }

  /**
   * Determines the IDs of the Major categories where a new Course implement's channels 
   * should be placed in order to not cause Discord errors due to too many channels 
   * being in one category.
   * @returns An array of category IDs in enum order.
   */
  public static async getCategoryIdsForNewCourseImplement(guildContext: GuildContext, major: Major): Promise<string[]> {
    let implement = await this.getMajorImplementIfExists(guildContext, major);
    if (!implement) {
      implement = await this.createEmptyMajorImplement(guildContext, major);
    }

    const channelIds: string[] = [];

    guildContext.guildDebug("Major category requested for new course implement.");
    for (let type of CourseImplementChannelType.values()) {
      const categoryIndex = this.findCategoryIndexForNewCourseChannel(guildContext, implement.categoryIdsMatrix[type].categoryIds);
      implement = await this.scaleOutCategories(guildContext, major, type, categoryIndex + 1);
      channelIds[type] = implement.categoryIdsMatrix[type].categoryIds[categoryIndex];
    }
    return channelIds;
  }

  /**
   * Recursively searches for an empty spot in existing Major categories 
   * that a new course implement can be placed into.
   * @param categoryIds The category IDs that will be used in the search.
   * @param currentIndex Used to keep track of recursion; initially set to 0.
   * @returns The index to be used for the new course implement. 
   *  This index may be greater than the actual number of existing categories.
   */
  private static findCategoryIndexForNewCourseChannel(guildContext: GuildContext, categoryIds: string[], currentIndex: number = 0): number {
    if (currentIndex === categoryIds.length) {
      guildContext.guildDebug(`All previous Major categories are full. Will create and use Major category ${currentIndex}.`);
      return currentIndex;
    }

    const category: Discord.CategoryChannel = <Discord.CategoryChannel>guildContext.guild.channels.resolve(categoryIds[currentIndex]);
    const channelsInCategory = category.children.size;
    const channelsRemaining = this.MAX_CHANNELS_PER_CATEGORY - channelsInCategory;
    if (channelsRemaining > 0) {
      guildContext.guildDebug(`There are ${channelsRemaining} channels left. Will use Major category ${currentIndex}.`);
      return currentIndex;
    }

    return this.findCategoryIndexForNewCourseChannel(guildContext, categoryIds, currentIndex + 1);
  }

  /**
   * Ensures the creation of at least enough categories to meet the count provided.
   * @param type The type of categories to create.
   * @param count The number of categories needed.
   * @returns A promise that resolves the updated major implement.
   */
  private static async scaleOutCategories(guildContext: GuildContext, major: Major, type: CourseImplementChannelType, count: number): Promise<IMajorImplement> {
    const implement = await GuildStorageDatabaseService.getMajorImplement(guildContext, major);
    const numToCreate = count - implement.categoryIdsMatrix[type].categoryIds.length;
    guildContext.guildDebug(`Scaling out to ${count} ${CourseImplementChannelType[type]} categories (${numToCreate <= 0 ? "None" : numToCreate} to create.)`);
    for (let i = 0; i < numToCreate; i++) {
      await DiscordUtils.rateLimitAvoidance();
      const categoryId = (await MajorCategoryImplementService.createCategoryOfType(guildContext, major, type)).id;
      implement.categoryIdsMatrix[type].categoryIds.push(categoryId);
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
   * @returns A promise that resolves when sorting is complete.
   */
  public static async sortMajorImplement(guildContext: GuildContext, major: Major): Promise<void> {
    const implement = await this.getMajorImplementIfExists(guildContext, major);
    if (!implement) {
      return;
    }

    // Channels
    // const sortedCourseImplements = [...implement.courseImplements].sort((a, b) => a[0].localeCompare(b[0]));

    // for(let i = 0; i < sortedCourseImplements.length; i++) {
    //   const courseImplement = sortedCourseImplements[i];


    //   const correctCategoryIndex = Math.floor(i / this.MAX_COURSE_IMPLEMENTS_PER_CATEGORY);
    //   const correctPosition = i % this.MAX_COURSE_IMPLEMENTS_PER_CATEGORY;


    // }

    // const category = <Discord.CategoryChannel>guildContext.guild.channels.resolve(implement.categoryId);

    // const channelPositions: Discord.ChannelPosition[] = [];
    // channelPositions.push(...this.createChannelPositionsByName(category.children.array()));

    // await guildContext.guild.setChannelPositions(channelPositions);
    // await DiscordUtils.rateLimitAvoidance();

    //TODO: Roles
  }
}