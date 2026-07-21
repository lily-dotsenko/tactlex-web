import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import { withApiErrors } from "@/lib/http/api-response";
import { createAudioStorage } from "@/server/services/audio-storage";
import { notFound } from "@/server/services/errors";

export const runtime = "nodejs";

export const GET = withApiErrors(async (_request, { params }) => {
  const { id: rawId } = await params;
  const id = z.uuid().parse(rawId);
  const asset = await prisma.audioAsset.findFirst({
    where: {
      id,
      archivedAt: null,
      term: { status: "PUBLISHED", archivedAt: null },
    },
    select: { id: true, objectKey: true, mimeType: true, checksum: true },
  });
  if (!asset) throw notFound("Аудіозапис не знайдено.");

  const stored = await createAudioStorage().get(asset.objectKey);
  const body = stored?.body ?? stored;
  return new NextResponse(body, {
    headers: {
      "Cache-Control": "public, max-age=86400, immutable",
      "Content-Type": asset.mimeType,
      ETag: `"${asset.checksum}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
});
