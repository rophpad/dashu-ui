import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { config } from "@/lib/config";
import { resolveLicense } from "@/lib/license";
import { activeWorkspace, listWorkspaces, toPublic } from "@/lib/workspaces";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;
  const [all, active, license] = await Promise.all([
    listWorkspaces(),
    activeWorkspace(),
    resolveLicense(),
  ]);
  return NextResponse.json({
    workspaces: all.map(toPublic),
    activeId: active?.id ?? null,
    schemas: config.schemas,
    license,
  });
}
