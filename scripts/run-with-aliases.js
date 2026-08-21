import { register } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const target = process.argv[2];
if (!target) throw new Error("A script path is required.");
register(new URL("./alias-loader.js", import.meta.url), import.meta.url);
await import(pathToFileURL(path.resolve(target)).href);
