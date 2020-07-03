import axios from "axios";
import { Course } from "models/course";
import { Major } from "models/major";
import { CourseUtils } from "utils/course";

import { IWebCatalogService } from "./web-catalog";

/**
 * Obtains course lists from the University of Utah web catalog.
 */
export class UtahWebCatalogService implements IWebCatalogService {
  public async getCourses(major: Major): Promise<Course[]> {
    const currentCatalogRes = await axios.get("https://utah.kuali.co/api/v1/catalog/public/catalogs/current");
    if(currentCatalogRes.status != 200) {
      throw new Error(`Could not get current catalog. Status code not OK: ${currentCatalogRes.status}`);
    }

    const catalogId: string = currentCatalogRes.data["_id"];
    if(!catalogId) {
      throw new Error("Could not get catalog ID.");
    }

    const catalogDataRes = await axios.get(`https://utah.kuali.co/api/v1/catalog/courses/${catalogId}`);
    if(catalogDataRes.status != 200) {
      throw new Error(`Could not get catalog data. Status code not OK: ${catalogDataRes.status}`);
    }

    let courses: Course[] = [];
    const catalogCourses = <KualiCourse[]>catalogDataRes.data;
    catalogCourses.forEach(catalogCourse => {
      if(catalogCourse.subjectCode.name.toLowerCase() !== major.prefix.toLowerCase())
        return;
      const courseNumber = catalogCourse.__catalogCourseId.substring(catalogCourse.subjectCode.name.length);
      courses.push({
        key: CourseUtils.getKey(courseNumber, major),
        major: major,
        number: courseNumber,
        title: catalogCourse.title,
      });
    });

    return courses;
  }
}

interface KualiCourse {
  __catalogCourseId: string;
  title: string;
  subjectCode: {
    name: string;
    description: string;
  }
}
