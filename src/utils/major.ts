import { CourseImplementChannelType } from "models/implement/course";
import { Major } from "models/major";

export class MajorUtils {
  public static getCategoryName(major: Major, type: CourseImplementChannelType): string {
    switch (type) {
      case CourseImplementChannelType.CHAT:
        return `${major.prefix}-chat`;
      case CourseImplementChannelType.VOICE:
        return `${major.prefix}-voice`;
    }
  }
}