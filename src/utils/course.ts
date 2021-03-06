import * as crypto from "crypto";
import { PartialCourse } from "models/course";
import { CourseImplementChannelType } from "models/implement/course";
import { Major } from "models/major";
import { ConfigService } from "services/config";

export class CourseUtils {
  public static parseCourseNumberList(list: string): { [majorPrefix: string]: string[] } {
    const regex = /([a-z]*)[-|\s]?(\d+)/;

    // Break into whole tokens ("cs1410", "phys2220")
    let tokens = list.toLowerCase().match(RegExp(regex, "g"));

    // Break into parts and categorize ("cs", "1410"; "phys", "2220")
    let result: { [majorPrefix: string]: string[] } = {};

    if(!tokens) // No matches found.
      return result;
      
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

  public static getKey(courseNumber: string, major: Major): string {
    return `${major.prefix}-${courseNumber}`;
  }

  public static getMainRoleName(course: PartialCourse): string {
    if (ConfigService.getConfig().enablePrivacyMode) {
      const hash = crypto.createHash("sha256");
      return hash.update(course.key).digest("hex").substr(0, 10);
    } else {
      return course.key;
    }
  }

  public static getTARoleName(course: PartialCourse): string {
    return `${course.key}-ta`;
  }

  public static getChannelNameByType(course: PartialCourse, type: CourseImplementChannelType): string {
    switch(type) {
      case CourseImplementChannelType.CHAT:
        return course.key;
      case CourseImplementChannelType.VOICE:
        return `${course.key}-voice`;
    }
  }
}