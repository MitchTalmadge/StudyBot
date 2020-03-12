import { Course } from "src/models/course";
import { IWebCatalogService } from "./web-catalog/web-catalog";
import { ReplaySubject } from "rxjs";

export class CourseService {
  /**
   * The list of allowed courses that users can be assigned to.
   * If null, then a course list could not be created automatically.
   */
  public courseList$ = new ReplaySubject<Course[]>(1);

  constructor(private webCatalogService: IWebCatalogService) {
  }

  /**
   * Attempts to update the course list using the web scraper.
   */
  public async updateCourseList(): Promise<Course[]> {
    try {
      const scrapedCourses = await this.webCatalogService.getCourses({ prefix: process.env.MAJOR_PREFIX });

      this.courseList$.next(scrapedCourses);
      return scrapedCourses;
    } catch (err) {
      console.error("Failed to get course list from web scraper. Falling back to allowing all courses by default.");
      console.error(err);

      this.courseList$.next(null);
      return null;
    }
  }
}
