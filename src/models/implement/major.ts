import { ICourseImplement } from "./course";

/**
 * Discord implementation of a major.
 */
export interface IMajorImplement {
  categoryId: string;
  courseImplements: Map<string, ICourseImplement>
}