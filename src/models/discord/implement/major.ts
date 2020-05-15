import { ICourseImplementDiscord } from "./course";

export interface IMajorImplementDiscord {
  textCategoryId: string;
  voiceCategoryId: string;
  courseImplements: Map<string, ICourseImplementDiscord>
}