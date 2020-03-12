import { Course } from "src/models/course";
import { IWebCatalogService } from "./web-catalog/web-catalog";
import { ReplaySubject } from "rxjs";
import { GuildContext } from "src/guild-context";

export class CourseService {
  /**
   * The list of allowed courses that users can be assigned to.
   * May be empty if the list could not be populated automatically.
   */
  public courseList$ = new ReplaySubject<Course[]>(1);

  constructor(
    private guildContext: GuildContext,
    private webCatalogService: IWebCatalogService) {
    this.updateCourseList();
  }

  /**
   * Attempts to update the course list using the web catalog.
   */
  public async updateCourseList(): Promise<Course[]> {
    try {
      const courses = await this.webCatalogService.getCourses(this.guildContext.major);
      console.log(`${courses.length} courses retrieved from the web catalog.`);

      this.courseList$.next(courses);
      return courses;
    } catch (err) {
      console.error("Failed to get course list from the web catalog.");
      console.error(err);

      this.courseList$.next([]);
      return [];
    }
  }
}
