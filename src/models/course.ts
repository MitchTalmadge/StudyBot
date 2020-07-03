import { Major } from "./major";

export interface PartialCourse {
  key: string;
  major: Major;
}

export interface Course extends PartialCourse {
  title?: string;
  number: string; // Not a number type in order to preserve appearance of number.
}