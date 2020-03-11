import { Course } from 'src/models/course';
import { Major } from 'src/models/major';
import { CatalogScraper } from './catalog-scraper';

export class UtahCatalogScraper extends CatalogScraper {
  public getCourses(major: Major): Course[] {
    return [];
  }
}
