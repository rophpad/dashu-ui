import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { config } from "@/lib/config";
import { resolveLicense } from "@/lib/license";
import { storageKind } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;
  return NextResponse.json({
    ...(await resolveLicense()),
    cloudUrl: config.cloudUrl,
    storage: storageKind(),
  });
}

export async function PUT() {
  return NextResponse.json(
    { error: "Pro access is managed by DASHU_CLOUD_CREDENTIAL; no licence key is needed." },
    { status: 405 },
  );
}

export const DELETE = PUT;
