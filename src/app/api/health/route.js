import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    return NextResponse.json({ status: "ok" }, { status: 200, headers: HEADERS });
  } catch (error) {
    console.error("Health check failed", {
      name: error?.name ?? "Error",
      code: typeof error?.code === "string" ? error.code : undefined,
    });
    return NextResponse.json({ status: "unavailable" }, { status: 503, headers: HEADERS });
  }
}
