import { ICourseImplement } from "./course";

/**
 * Discord implementation of a major.
 */
export interface IMajorImplement {
  categoryIds: string[];
  courseImplements: Map<string, ICourseImplement>
}