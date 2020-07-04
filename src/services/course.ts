import { GuildContext } from "guild-context";
import _ from "lodash";
import { Course } from "models/course";
import { Major } from "models/major";
import { CourseUtils } from "utils/course";

import { IWebCatalogService } from "./web-catalog/web-catalog";

export class CourseService {
  /**
   * Attempts to update the course list using the web catalog.
   */
  public static async fetchCourseList(guildContext: GuildContext, webCatalogService: IWebCatalogService): Promise<{ [majorPrefix: string]: Course[] }> {
    let courses: { [majorPrefix: string]: Course[] } = {};
    const coursePromises: Promise<Course[]>[] = [];
    _.forIn(guildContext.majors, major => {
      coursePromises.push(webCatalogService.getCourses(major));
    });
    await Promise.all(coursePromises)
      .then(allCourses => {
        allCourses.forEach((courseList, index) => {
          const majorPrefix: string = Object.keys(guildContext.majors)[index];
          guildContext.guildLog(`${courseList.length} '${majorPrefix.toUpperCase()}' courses retrieved from the web catalog.`);

          courses[majorPrefix] = courseList;
        });
      });

    return courses;
  }

  /**
   * Given a number and major, finds a matching course object from that major's course list.
   * If the course list is empty, all numbers are considered valid.
   * @param guildContext The guild context.
   * @param number The number to search for.
   * @param major The major to look through.
   * @returns The course if valid, undefined if not.
   */
  public static async getCourseFromNumber(guildContext: GuildContext, number: string, major: Major): Promise<Course> {
    const majorCourses = guildContext.courses[major.prefix];
    if (majorCourses.length === 0) {
      return {
        key: CourseUtils.getKey(number, major),
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
   * @param guildContext The guild context.
   * @param list The list of numbers to search for.
   * @param major The major to look through.
   * @returns For each number: the course found if valid, or undefined if not.
   */
  public static getCoursesFromNumberList(guildContext: GuildContext, list: string[], major: Major): Promise<{ validCourses: Course[], invalidCourseNames: string[] }> {
    let promises: Promise<Course>[] = [];
    list.forEach(num => {
      promises.push(this.getCourseFromNumber(guildContext, num, major));
    });

    return Promise.all(promises)
      .then(courses => {
        const mapping: { validCourses: Course[], invalidCourseNames: string[] } = { validCourses: [], invalidCourseNames: [] };
        courses.forEach((course, index) => {
          if (course)
            mapping.validCourses.push(course);
          else
            mapping.invalidCourseNames.push(`${major.prefix}-${list[index]}`);
        });

        return mapping;
      });
  }

  public static getCoursesFromNumberListsByMajor(guildContext: GuildContext, numbersByMajor: { [majorPrefix: string]: string[] }): Promise<{ [majorPrefix: string]: { validCourses: Course[], invalidCourseNames: string[] } }> {
    const courseResolverPromises: Promise<{ validCourses: Course[], invalidCourseNames: string[] }>[] = [];
    _.forIn(numbersByMajor, (courseNumbers, majorPrefix) => {
      courseResolverPromises.push(this.getCoursesFromNumberList(guildContext, courseNumbers, guildContext.majors[majorPrefix]));
    });

    return Promise.all(courseResolverPromises)
      .then(allCourses => {
        const mapping: { [majorPrefix: string]: { validCourses: Course[], invalidCourseNames: string[] } } = {};
        allCourses.forEach((courses, index) => {
          mapping[Object.keys(numbersByMajor)[index]] = courses;
        });

        return mapping;
      });
  }
}
