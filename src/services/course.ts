import { Course } from "src/models/course";
import { GuildContext } from "src/guild-context";
import { IWebCatalogService } from "./web-catalog/web-catalog";
import { ReplaySubject } from "rxjs";
import { first } from "rxjs/operators";

export class CourseService {
  /**
   * The list of allowed courses that users can be assigned to.
   * May be empty if the list could not be populated automatically.
   */
  public courseList$ = new ReplaySubject<Course[]>(1);

  constructor(
    private guildContext: GuildContext,
    private webCatalogService: IWebCatalogService) {
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

  /**
   * Given a number, finds a matching course object from the course list.
   * If the course list is empty, all numbers are considered valid.
   * @param number The number to search for.
   * @returns The course if valid, undefined if not.
   */
  public async getCourseFromNumber(number: string): Promise<Course> {
    const courses = await this.courseList$.pipe(first()).toPromise();
    if (courses.length === 0) {
      return {
        major: this.guildContext.major,
        number: number
      };
    }

    const course = courses.find(c => c.number === number.toLowerCase());
    return course;
  }

  /**
   * Given a list of numbers, finds and returns matching course objects from the course list,
   *  in the same order as given.
   * If the course list is empty, all numbers are considered valid.
   * @param list The list of numbers to search for.
   * @returns For each number: the course found if valid, or undefined if not.
   */
  public async getCoursesFromNumberList(list: string[]): Promise<Course[]> {
    let promises: Promise<Course>[] = [];
    list.forEach(num => {
      promises.push(this.getCourseFromNumber(num));
    });

    return Promise.all(promises);
  }
}
