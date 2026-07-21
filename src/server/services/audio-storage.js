import crypto from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { DomainError } from "@/server/services/errors";

const AUDIO_SIGNATURES = {
  "audio/mpeg": (buffer) =>
    buffer.subarray(0, 3).toString("ascii") === "ID3" ||
    (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0),
  "audio/ogg": (buffer) => buffer.subarray(0, 4).toString("ascii") === "OggS",
  "audio/wav": (buffer) =>
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WAVE",
};

const EXTENSIONS = {
  "audio/mpeg": "mp3",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
};

export function validateAudioBuffer(buffer, mimeType, maxBytes = 8 * 1024 * 1024) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new DomainError("EMPTY_AUDIO", "Аудіофайл порожній.", 422);
  }
  if (buffer.length > maxBytes) {
    throw new DomainError("AUDIO_TOO_LARGE", "Аудіофайл перевищує дозволений розмір.", 413);
  }
  const signatureMatches = AUDIO_SIGNATURES[mimeType];
  if (!signatureMatches || !signatureMatches(buffer)) {
    throw new DomainError("INVALID_AUDIO", "Формат аудіофайлу не підтримується.", 422);
  }
}

export class LocalAudioStorage {
  constructor(rootPath) {
    this.rootPath = path.resolve(rootPath);
  }

  async put(buffer, { mimeType }) {
    validateAudioBuffer(buffer, mimeType);
    await mkdir(this.rootPath, { recursive: true });
    const key = `${crypto.randomUUID()}.${EXTENSIONS[mimeType]}`;
    await writeFile(this.resolveKey(key), buffer, { flag: "wx" });
    return {
      key,
      checksum: crypto.createHash("sha256").update(buffer).digest("hex"),
      byteSize: buffer.length,
    };
  }

  async get(key) {
    return readFile(this.resolveKey(key));
  }

  async delete(key) {
    await rm(this.resolveKey(key), { force: true });
  }

  resolveKey(key) {
    if (!/^[0-9a-f-]+\.(mp3|ogg|wav)$/iu.test(key)) {
      throw new DomainError("INVALID_STORAGE_KEY", "Некоректний ключ аудіофайлу.", 400);
    }
    const resolved = path.resolve(this.rootPath, key);
    if (path.dirname(resolved) !== this.rootPath) {
      throw new DomainError("INVALID_STORAGE_KEY", "Некоректний ключ аудіофайлу.", 400);
    }
    return resolved;
  }
}

export class S3CompatibleAudioStorage {
  constructor({ client, bucket, prefix = "audio/" }) {
    if (!client || !bucket) {
      throw new DomainError(
        "STORAGE_NOT_CONFIGURED",
        "S3-compatible audio storage requires a client and bucket.",
        503,
      );
    }
    this.client = client;
    this.bucket = bucket;
    this.prefix = prefix;
  }

  async put(buffer, { mimeType }) {
    validateAudioBuffer(buffer, mimeType);
    const key = `${this.prefix}${crypto.randomUUID()}.${EXTENSIONS[mimeType]}`;
    const checksum = crypto.createHash("sha256").update(buffer).digest("hex");
    await this.client.putObject({
      bucket: this.bucket,
      key,
      body: buffer,
      contentType: mimeType,
      checksum,
    });
    return { key, checksum, byteSize: buffer.length };
  }

  async get(key) {
    return this.client.getObject({ bucket: this.bucket, key });
  }

  async delete(key) {
    await this.client.deleteObject({ bucket: this.bucket, key });
  }
}

export function createAudioStorage({ s3Client, s3Bucket } = {}) {
  const driver = process.env.AUDIO_STORAGE_DRIVER ?? "local";
  if (driver === "local") {
    return new LocalAudioStorage(process.env.AUDIO_STORAGE_PATH ?? "./storage/audio");
  }
  if (driver === "s3") {
    return new S3CompatibleAudioStorage({ client: s3Client, bucket: s3Bucket });
  }
  throw new DomainError("UNKNOWN_STORAGE_DRIVER", "Невідомий audio storage driver.", 500);
}
