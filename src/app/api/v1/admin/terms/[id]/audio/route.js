import { apiData, withApiErrors } from "@/lib/http/api-response";
import { requireAudioUploadsEnabled } from "@/lib/audio/config";
import { createAudioStorage } from "@/server/services/audio-storage";
import { audioMetadataSchema } from "@/server/services/admin-content-validation";
import {
  ADMIN_HEADERS,
  adminContent,
  authorizeAdminMutation,
  uuidParam,
} from "@/app/api/v1/admin/_shared";
import { DomainError } from "@/server/services/errors";

const MAX_AUDIO_BYTES = 8 * 1_024 * 1_024;

export const runtime = "nodejs";

export const POST = withApiErrors(async (request, { params }) => {
  const principal = await authorizeAdminMutation(request, "audio.manage", "ADMIN_AUDIO", {
    maxBytes: MAX_AUDIO_BYTES + 128 * 1_024,
  });
  requireAudioUploadsEnabled();
  const form = await request.formData();
  const file = form.get("file");
  if (!file || typeof file.arrayBuffer !== "function") {
    throw new DomainError("AUDIO_REQUIRED", "Виберіть аудіофайл.", 422);
  }
  if (file.size > MAX_AUDIO_BYTES) {
    throw new DomainError("AUDIO_TOO_LARGE", "Аудіофайл перевищує 8 МіБ.", 413);
  }
  const metadata = audioMetadataSchema.parse({
    locale: form.get("locale") || "EN",
    kind: form.get("kind") || "HUMAN_RECORDING",
    attribution: form.get("attribution") || null,
    isPrimary: form.get("isPrimary") === "true",
  });
  const buffer = Buffer.from(await file.arrayBuffer());
  const storage = createAudioStorage();
  const stored = await storage.put(buffer, { mimeType: file.type });
  const { id } = await params;

  try {
    const asset = await adminContent.createAudioAsset(principal.userId, uuidParam.parse(id), {
      ...metadata,
      provider: process.env.AUDIO_STORAGE_DRIVER === "s3" ? "S3_COMPATIBLE" : "LOCAL",
      objectKey: stored.key,
      mimeType: file.type,
      byteSize: stored.byteSize,
      checksum: stored.checksum,
    });
    return apiData(asset, { status: 201, headers: ADMIN_HEADERS });
  } catch (error) {
    await storage.delete(stored.key).catch(() => undefined);
    throw error;
  }
});
