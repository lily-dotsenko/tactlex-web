import { rename, rm } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const projectRoot = process.cwd();
const files = [
  "coach.png",
  "point.png",
  "listen.png",
  "think.png",
  "correct.png",
  "encourage.png",
  "victory.png",
  "guard.png",
  "reader.png",
  "rest.png",
].map((name) => path.join(projectRoot, "public", "brand", "morkva", name));

files.push(
  path.join(projectRoot, "public", "brand", "morkva-anchor.png"),
  path.join(projectRoot, "public", "icon.png"),
);

for (const file of files) {
  const temporary = `${file}.optimized`;
  await sharp(file)
    .resize({ width: 512, height: 512, fit: "inside", withoutEnlargement: true })
    .png({ compressionLevel: 9, adaptiveFiltering: true, palette: true, quality: 92 })
    .toFile(temporary);
  await rm(file);
  await rename(temporary, file);
}

console.log(`Optimized ${files.length} transparent mascot assets.`);
