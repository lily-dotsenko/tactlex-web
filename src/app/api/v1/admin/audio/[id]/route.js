import { NextResponse } from "next/server";

import { apiData, withApiErrors } from "@/lib/http/api-response";
import { createAudioStorage } from "@/server/services/audio-storage";
import {
  ADMIN_HEADERS,
  adminContent,
  authorizeAdmin,
  authorizeAdminMutation,
  uuidParam,
} from "@/app/api/v1/admin/_shared";

export const runtime = "nodejs";

export const GET = withApiErrors(async (request, { params }) => {
  await authorizeAdmin(request, "audio.manage");
  const { id } = await params;
  const asset = await adminContent.getAudioAsset(uuidParam.parse(id));
  const stored = await createAudioStorage().get(asset.objectKey);
  const body = stored?.body ?? stored;
  return new NextResponse(body, {
    headers: {
      ...ADMIN_HEADERS,
      "Content-Type": asset.mimeType,
      "Content-Disposition": `inline; filename="${asset.id}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
});

export const DELETE = withApiErrors(async (request, { params }) => {
  const principal = await authorizeAdminMutation(request, "audio.manage", "ADMIN_AUDIO");
  const { id } = await params;
  return apiData(await adminContent.archiveAudioAsset(principal.userId, uuidParam.parse(id)), {
    headers: ADMIN_HEADERS,
  });
});
