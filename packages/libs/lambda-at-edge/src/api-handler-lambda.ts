// @ts-ignore
import manifest from "./manifest.json";
// @ts-ignore
import { basePath } from "./routes-manifest.json";
import cloudFrontCompat from "@sls-next/next-aws-cloudfront";
import { OriginRequestApiHandlerManifest } from "../types";

const normaliseUri = (uri: string): string => (uri === "/" ? "/index" : uri);

const router = (
  manifest: OriginRequestApiHandlerManifest
): ((path: string) => string | null) => {
  const {
    apis: { dynamic, nonDynamic }
  } = manifest;

  return (path: string): string | null => {
    if (basePath && path.startsWith(basePath))
      path = path.slice(basePath.length);

    if (nonDynamic[path]) {
      return nonDynamic[path];
    }

    for (const route in dynamic) {
      const { file, regex } = dynamic[route];

      const re = new RegExp(regex, "i");
      const pathMatchesRoute = re.test(path);

      if (pathMatchesRoute) {
        return file;
      }
    }

    return null;
  };
};

export const handler = async (event: any, context: any) => {
  try {

    const request = event.request;
    const uri = normaliseUri(request.uri);

    const pagePath = router(manifest)(uri);

    if (!pagePath) {
      return {
        status: "404"
      };
    }

    // eslint-disable-next-line
    const page = require(`./${pagePath}`);
    const { req, res, responsePromise } = cloudFrontCompat(event);

    page.default(req, res);

    if (responsePromise) {
      return responsePromise;
    }

  } catch (e) {
    return {
      status: "500",
      body: JSON.stringify({
        "result": null,
        "error": e
      })
    }
  }
}