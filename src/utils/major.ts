import { Major } from "models/major";

export class MajorUtils {
  public static getTextCategoryName(major: Major): string {
    return `${major.prefix}-chat`;
  }
  
  public static getVoiceCategoryName(major: Major): string {
    return `${major.prefix}-voice`;
  }
}