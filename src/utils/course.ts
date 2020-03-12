export class CourseUtils {
  public static parseCourseNumberList(list: string): string[] {
    const numbers = list.trim().split(/[\s|,|a-z|\-]+/);
    return numbers.filter(number => number); // Removes empty strings from array.
  }
}