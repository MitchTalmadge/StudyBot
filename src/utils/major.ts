import { Major } from "models/major";

export class MajorUtils {
  public static getCategoryName(major: Major): string {
    return `${major.prefix}-courses`;
  }
}