export class CourseUtils {
  public static parseCourseNumberList(list: string): string[] {
    return list.split(/[\s|,|a-z|\-]+/);
  }
}