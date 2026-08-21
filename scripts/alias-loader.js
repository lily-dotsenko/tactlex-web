import path from "node:path";
import { pathToFileURL } from "node:url";

export async function resolve(specifier, context, nextResolve) {
  if (!specifier.startsWith("@/")) return nextResolve(specifier, context);
  const relative = specifier.slice(2);
  const target = path.resolve("src", path.extname(relative) ? relative : `${relative}.js`);
  return nextResolve(pathToFileURL(target).href, context);
}
