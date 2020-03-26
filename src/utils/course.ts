import { Course } from "src/models/course";
import { MajorMap } from "src/models/major-map";

export class CourseUtils {
  public static parseCourseNumberList(list: string): { [majorPrefix: string]: string[] } {
    const regex = /([a-z]*)[-|\s]?(\d+)/;

    // Break into whole tokens ("cs1410", "phys2220")
    let tokens = list.toLowerCase().match(RegExp(regex, "g"));

    // Break into parts and categorize ("cs", "1410"; "phys", "2220")
    let result: { [majorPrefix: string]: string[] } = {};
    tokens.forEach(token => {
      const parts = token.match(regex);
      if (!result[parts[1]]) {
        // Create category.
        result[parts[1]] = [parts[2]];
      } else {
        // Add to existing category if not a duplicate.
        if (!result[parts[1]].includes(parts[2])) {
          result[parts[1]].push(parts[2]);
        }
      }
    });

    return result;
  }

  /**
   * Converts a Course instance to a string representation.
   * @param course 
   */
  public static convertToString(course: Course): string {
    return `${course.major.prefix}-${course.number}`;
  }

}