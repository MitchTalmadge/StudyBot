import { ICourseImplementDiscord } from "./course";

export interface IMajorImplementDiscord {
  categoryId: string;
  courseImplements: Map<string, ICourseImplementDiscord>
}