import { Course } from 'src/models/course';
import { ReplaySubject } from 'rxjs';
import { UtahCatalogScraper } from './catalog/utah-catalog-scraper';

export class CourseService {
  public courseList$ = new ReplaySubject<Course[]>(1);

  constructor() {
    this.updateCourseList();
  }

  public async updateCourseList(): Promise<Course[]> {
    const scrapedCourses = await new UtahCatalogScraper().getCourses({ prefix: process.env.MAJOR_PREFIX });

    this.courseList$.next(scrapedCourses);
    return scrapedCourses;
  }
}
