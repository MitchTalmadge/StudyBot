import { Major } from "./major";

export interface Course {
  title?: string;
  number: string; // Not a number type in order to preserve appearance of number.
  major: Major;
}