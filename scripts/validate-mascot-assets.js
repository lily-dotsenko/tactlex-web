import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve("public/brand/morkva");
const required = new Set([
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
]);

const files = (await readdir(root)).filter((name) => name.endsWith(".png"));
const missing = [...required].filter((name) => !files.includes(name));
if (missing.length) throw new Error(`Missing mascot assets: ${missing.join(", ")}`);

const targets = [
  ...files.map((name) => ({ name, file: path.join(root, name) })),
  { name: "morkva-anchor.png", file: path.resolve("public/brand/morkva-anchor.png") },
  { name: "icon.png", file: path.resolve("public/icon.png") },
];

for (const { name, file } of targets) {
  const fileStats = await stat(file);
  if (fileStats.size > 400 * 1024) {
    throw new Error(`${name} is too large for the mobile bundle (${fileStats.size} bytes).`);
  }
  const image = sharp(file);
  const metadata = await image.metadata();
  if (!metadata.hasAlpha || metadata.channels !== 4) {
    throw new Error(`${name} does not contain a real alpha channel.`);
  }
  if (metadata.width > 768 || metadata.height > 768) {
    throw new Error(`${name} exceeds the supported mascot canvas size.`);
  }
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let transparentPixels = 0;
  for (let index = 3; index < data.length; index += info.channels) {
    if (data[index] === 0) transparentPixels += 1;
  }
  const transparentRatio = transparentPixels / (info.width * info.height);
  if (transparentRatio < 0.08) {
    throw new Error(`${name} has too little transparent canvas (${transparentRatio.toFixed(3)}).`);
  }
  const corners = [
    3,
    (info.width - 1) * info.channels + 3,
    info.width * (info.height - 1) * info.channels + 3,
    (info.width * info.height - 1) * info.channels + 3,
  ];
  if (corners.some((index) => data[index] > 8)) {
    throw new Error(`${name} has an opaque corner and may contain a baked background.`);
  }
}

console.log(`Validated ${targets.length} transparent mascot assets.`);
