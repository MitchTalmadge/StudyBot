import { ICourseImplement } from "./course";

/**
 * Discord implementation of a major.
 */
export interface IMajorImplement {
  textCategoryId: string;
  voiceCategoryId: string;
  courseImplements: Map<string, ICourseImplement>
}