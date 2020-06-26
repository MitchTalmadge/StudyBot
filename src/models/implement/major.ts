import { ICourseImplement } from "./course";

/**
 * Discord implementation of a major.
 */
export interface IMajorImplement {
  categoryIdsMatrix: { categoryIds: string[] }[];
  courseImplements: Map<string, ICourseImplement>
}