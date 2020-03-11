import { Course } from 'src/models/course';
import { Major } from 'src/models/major';

export abstract class CatalogScraper {
  public abstract getCourses(major: Major): Course[];
}