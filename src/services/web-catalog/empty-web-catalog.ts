import { Course } from "models/course";
import { IWebCatalogService } from "./web-catalog";
import { Major } from "models/major";

/**
 * Provides an empty array of courses as a fallback for when no web catalogs are configured to be used.
 */
export class EmptyWebCatalogService implements IWebCatalogService {
  public async getCourses(_major: Major): Promise<Course[]> {
    return [];
  }
}
