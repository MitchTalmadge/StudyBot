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
   * Attempts to update the course list using the web catalog.
   */
  public async updateCourseList(): Promise<Course[]> {
    try {
      const courses = await this.webCatalogService.getCourses({ prefix: process.env.MAJOR_PREFIX });
      console.log(`${courses.length} courses retrieved from the web catalog.`);

      this.courseList$.next(courses);
      return courses;
    } catch (err) {
      console.error("Failed to get course list from the web catalog.");
      console.error(err);

      this.courseList$.next(null);
      return null;
    }
  }
}
