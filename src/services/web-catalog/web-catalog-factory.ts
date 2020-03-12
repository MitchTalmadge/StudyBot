import { EmptyWebCatalogService } from "./empty-web-catalog";
import { UtahWebCatalogService } from "./utah-web-catalog";

export class WebCatalogFactory {
  public getWebCatalog(type: string) {
    if (!type) {
      return new EmptyWebCatalogService();
    }

    switch (type.toLowerCase()) {
      case "utah":
        return new UtahWebCatalogService();
      default:
        return new EmptyWebCatalogService();
    }
  }
}
