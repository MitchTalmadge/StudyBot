import { Course } from "src/models/course";
import { GuildContext } from "src/guild-context";
import { IWebCatalogService } from "./web-catalog/web-catalog";
import { Major } from "src/models/major";
import { ReplaySubject } from "rxjs";
import _ from "lodash";
import { first } from "rxjs/operators";

export class CourseService {
  /**
   * The list of allowed courses that users can be assigned to.
   * May be empty if the list could not be populated automatically.
   */
  public courseLists$ = new ReplaySubject<{ [majorPrefix: string]: Course[] }>(1);

  constructor(
    private guildContext: GuildContext,
    private webCatalogService: IWebCatalogService) {
  }

  /**
   * Attempts to update the course list using the web catalog.
   */
  public async updateCourseLists(): Promise<{ [majorPrefix: string]: Course[] }> {
    try {
      let courses: { [majorPrefix: string]: Course[] } = {};
      const coursePromises: Promise<Course[]>[] = [];
      _.forIn(this.guildContext.majors, major => {
        coursePromises.push(this.webCatalogService.getCourses(major));
      });
      Promise.all(coursePromises)
        .then(allCourses => {
          allCourses.forEach((courseList, index) => {
            const majorPrefix: string = Object.keys(this.guildContext.majors)[index];
            console.log(`${courseList.length} '${majorPrefix.toUpperCase()}' courses retrieved from the web catalog.`);

            courses[majorPrefix] = courseList;
          });
        });

      this.courseLists$.next(courses);
      return courses;
    } catch (err) {
      console.error("Failed to get course lists from the web catalog.");
      console.error(err);

      let emptyCourses: { [majorPrefix: string]: Course[] } = {};
      _.forIn(this.guildContext.majors, major => {
        emptyCourses[major.prefix] = [];
      });

      this.courseLists$.next(emptyCourses);
      return emptyCourses;
    }
  }

  /**
   * Given a number and major, finds a matching course object from that major's course list.
   * If the course list is empty, all numbers are considered valid.
   * @param number The number to search for.
   * @param major The major to look through.
   * @returns The course if valid, undefined if not.
   */
  public async getCourseFromNumber(number: string, major: Major): Promise<Course> {
    const courses = await this.courseLists$.pipe(first()).toPromise();
    const majorCourses = courses[major.prefix];
    if (majorCourses.length === 0) {
      return {
        major: major,
        number: number
      };
    }

    const course = majorCourses.find(c => c.number === number.toLowerCase());
    return course;
  }

  /**
   * Given a list of numbers and a major, finds and returns matching course objects from
   *  that major's course list, in the same order as given.
   * If the course list is empty, all numbers are considered valid.
   * @param list The list of numbers to search for.
   * @param major The major to look through.
   * @returns For each number: the course found if valid, or undefined if not.
   */
  public getCoursesFromNumberList(list: string[], major: Major): Promise<{validCourses: Course[], invalidCourseNames: string[]}> {
    let promises: Promise<Course>[] = [];
    list.forEach(num => {
      promises.push(this.getCourseFromNumber(num, major));
    });

    return Promise.all(promises)
      .then(courses => {
        const mapping: {validCourses: Course[], invalidCourseNames: string[]} = {validCourses: [], invalidCourseNames: []};
        courses.forEach((course, index) => {
          if(course)
            mapping.validCourses.push(course);
          else
            mapping.invalidCourseNames.push(`${major.prefix}-${list[index]}`);
        }); 

        return mapping;
      });
  }

  public getCoursesFromNumberListsByMajor(numbersByMajor: {[majorPrefix: string]: string[]}): Promise<{[majorPrefix: string]: {validCourses: Course[], invalidCourseNames: string[]}}> {
    const courseResolverPromises: Promise<{validCourses: Course[], invalidCourseNames: string[]}>[] = [];
    _.forIn(numbersByMajor, (courseNumbers, majorPrefix) => {
      courseResolverPromises.push(this.getCoursesFromNumberList(courseNumbers, this.guildContext.majors[majorPrefix]));
    });

    return Promise.all(courseResolverPromises)
      .then(allCourses => {
        const mapping: {[majorPrefix: string]: {validCourses: Course[], invalidCourseNames: string[]}} = {};
        allCourses.forEach((courses, index) => {
          mapping[Object.keys(numbersByMajor)[index]] = courses;
        });

        return mapping;
      });
  }
}
