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
      const categoryId = (await MajorCategoryImplementService.createCategoryOfType(guildContext, major, type)).id;
      implement.categoryIdsMatrix[type].categoryIds.push(categoryId);
    }
    await GuildStorageDatabaseService.setMajorImplement(guildContext, major, implement);
    return implement;
  }

  /**
   * Removes all empty categories caused by members leaving courses.
   * @returns A promise that resolves when everything is cleaned up.
   */
  public static async cleanUp(guildContext: GuildContext, major: Major): Promise<void> {
    const implement = await this.getMajorImplementIfExists(guildContext, major);
    if (!implement) {
      return;
    }

    // Sorting will expose empty categories.
    await this.sortMajorImplement(guildContext, major);

    for(let type of CourseImplementChannelType.values()) {
      // Determine which categories are empty.
      const categoriesToRemove: Discord.CategoryChannel[] = [];
      for(let categoryId of implement.categoryIdsMatrix[type].categoryIds) {
        const category = <Discord.CategoryChannel>guildContext.guild.channels.resolve(categoryId);
        if(category.children.size == 0) {
          categoriesToRemove.push(category);
        }
      }

      // Delete empty categories. 
      implement.categoryIdsMatrix[type].categoryIds = implement.categoryIdsMatrix[type].categoryIds
        .filter(categoryId => !categoriesToRemove.find(category => category.id === categoryId));    
      await GuildStorageDatabaseService.setMajorImplement(guildContext, major, implement);
      await Promise.all(categoriesToRemove.map(category => category.delete("StudyBot automatic Major implement scale-in.")));
    }
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
    if(implement.categoryIdsMatrix[0].categoryIds.length == 0) {
      return;
    }

    // Channels
    const sortedCourseImplements = [...implement.courseImplements].sort((a, b) => a[0].localeCompare(b[0]));

    // Put the channels in the right categories.
    for(let i = 0; i < sortedCourseImplements.length; i++) {
      const courseImplement = sortedCourseImplements[i];
      guildContext.guildDebug(`Sorting ${courseImplement[0]}...`);
      const destinationCategoryIndex = Math.floor(i / this.MAX_CHANNELS_PER_CATEGORY);

      for(let type of CourseImplementChannelType.values()) {
        const channelId = courseImplement[1].channelIds[type];
        const sourceCategoryIndex = this.findCategoryIndexOfCourseChannel(guildContext, implement, channelId, type);
        if(sourceCategoryIndex == -1) {
          guildContext.guildError(`Tried to sort ${courseImplement[0]} but could not find it in the categories!`);
          continue;
        }
        if(destinationCategoryIndex === sourceCategoryIndex)
          continue;
        await this.migrateCourseChannel(guildContext, implement, channelId, sourceCategoryIndex, destinationCategoryIndex, type);
      }
    }

    // Sort the categories' children.
    const channelPositions: Discord.ChannelPosition[] = [];
    for(let type of CourseImplementChannelType.values()) {
      for(let categoryId of implement.categoryIdsMatrix[type].categoryIds) {
        let category = <Discord.CategoryChannel>guildContext.guild.channels.resolve(categoryId);
        channelPositions.push(...this.createChannelPositionsByName(category.children.array()));
      }
    }
    await guildContext.guild.setChannelPositions(channelPositions);
  
    // Sort the categories themselves.

    // Category sorting works by finding the current position of the first category,
    // then placing all other categories sequentially after that first category.
    // This "shoves" the other majors' categories down the list, where they will be sorted 
    // later by this same algorithm.
    const firstCategory = guildContext.guild.channels.resolve(implement.categoryIdsMatrix[0].categoryIds[0]);
    let nextAvailablePosition = firstCategory.position;
    for(let type of CourseImplementChannelType.values()) {
      for(let categoryId of implement.categoryIdsMatrix[type].categoryIds) {
        const category = guildContext.guild.channels.resolve(categoryId);
        await category.setPosition(nextAvailablePosition);
        nextAvailablePosition++;
      }
    }    

    // TODO: Roles
  }

  private static async migrateCourseChannel(
    guildContext: GuildContext, 
    implement: IMajorImplement, 
    channelId: string,
    sourceCategoryIndex: number,
    destinationCategoryIndex: number,
    type: CourseImplementChannelType): Promise<void> {
    const reason = "Studybot automatic channel sorting";
    const channel = guildContext.guild.channels.resolve(channelId);

    guildContext.guildDebug(`Channel ${channel.name} needs to be moved from category ${sourceCategoryIndex} to ${destinationCategoryIndex}.`);

    const sourceCategory = <Discord.CategoryChannel>guildContext.guild.channels.resolve(implement.categoryIdsMatrix[type].categoryIds[sourceCategoryIndex]);
    const destinationCategory = <Discord.CategoryChannel>guildContext.guild.channels.resolve(implement.categoryIdsMatrix[type].categoryIds[destinationCategoryIndex]);
    
    // Simply move if no swap is needed.
    if(destinationCategory.children.size < this.MAX_CHANNELS_PER_CATEGORY) {
      guildContext.guildDebug(`Moving ${channel.name}.`);
      await channel.setParent(destinationCategory, { reason });
      await DiscordUtils.refreshChannelsInCache(guildContext, [destinationCategory]);
      return;
    }

    // Get the channel to swap (the most efficient is the last channel in the category)
    const otherChannel = destinationCategory.children.reduce((prev, current) => {
      if(prev.position > current.position)
        return prev;
      return current;
    }, destinationCategory.children.first());

    // Swap across categories.
    guildContext.guildDebug(`Swapping ${channel.name} and ${otherChannel.name}.`);
    await channel.setParent(destinationCategory, { reason });
    await otherChannel.setParent(sourceCategory, { reason });
    await DiscordUtils.refreshChannelsInCache(guildContext, [destinationCategory, sourceCategory]);
  }

  private static findCategoryIndexOfCourseChannel(guildContext: GuildContext, majorImplement: IMajorImplement, channelId: string, type: CourseImplementChannelType): number {
    return majorImplement.categoryIdsMatrix[type].categoryIds.findIndex(categoryId => {
      const category = <Discord.CategoryChannel>guildContext.guild.channels.resolve(categoryId);
      return category.children.has(channelId);
    });
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