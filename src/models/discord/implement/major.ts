import { ICourseImplementDiscord } from "./course";

/**
 * Discord implementation of a major.
 */
export interface IMajorImplementDiscord {
  textCategoryId: string;
  voiceCategoryId: string;
  courseImplements: Map<string, ICourseImplementDiscord>
}