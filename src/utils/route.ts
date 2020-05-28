import * as querystring from "querystring";
import { ConfigService } from "services/config";

export class RouteUtils {

  /**
   * Generates a URL that can be accessed publically using the configured settings.
   * @param apiPath The path (including /api) to the endpoint desired.
   * @param queryParams The parameters to include, if any.
   */
  public static generatePublicUrl(apiPath: string, queryParams: {[key: string]: string} = {}): string {
    const webConfig = ConfigService.getConfig().web;
    const queryStr = (queryParams && Object.keys(queryParams).length > 0) ? `?${querystring.stringify(queryParams)}` : "";

    let url = webConfig.publicUri;
    if(webConfig.basename) {
      url += `/${webConfig.basename}`;
    }
    url += `/${this.removeLeadingAndTrailingSlashes(apiPath)}${queryStr}`;

    return url;
  }

  public static removeLeadingAndTrailingSlashes(input: string): string {
    if(!input) {
      input = "";
    }
    if (input.startsWith("/")) {
      input = input.substr(1);
    }
    if(input.endsWith("/")) {
      input = input.substr(0, input.length - 1);
    }

    return input;
  }

}