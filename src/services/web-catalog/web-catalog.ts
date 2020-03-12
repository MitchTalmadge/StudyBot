import { Course } from "src/models/course";
import { Major } from "src/models/major";

/**
 * This service is intended to obtain course lists from web catalogs.
 */
export interface IWebCatalogService {
  getCourses(major: Major): Promise<Course[]>;
}


