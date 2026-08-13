import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { createDashboard, listDashboards } from "@/lib/dashboards";
import { config } from "@/lib/config";

const WORKSPACE_ID = "configured";

function activeWorkspaceId(): string | null {
  return config.databaseUrl ? WORKSPACE_ID : null;
}

function hasProAccess(): boolean {
  return Boolean(config.cloudUrl && config.cloudCredential);
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;

  const workspaceId = activeWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ dashboards: [], kind: "not_configured" });
  }

  const dashboards = await listDashboards(workspaceId);
  return NextResponse.json({
    // Existing dashboards stay readable without cloud access; only creation is gated.
    pro: hasProAccess(),
    dashboards: dashboards.map((d) => ({
      id: d.id,
      name: d.name,
      cardCount: d.cards.length,
      updatedAt: d.updatedAt,
    })),
  });
}

export async function POST(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  const workspaceId = activeWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json(
      { error: "Connect a database first.", kind: "not_configured" },
      { status: 409 },
    );
  }

  let body: { name?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!hasProAccess()) {
    return NextResponse.json(
      {
        error: "Saved dashboards require DASHU_CLOUD_CREDENTIAL.",
        kind: "license",
        problem: "Set DASHU_CLOUD_CREDENTIAL to enable managed AI and Pro features.",
      },
      { status: 402 },
    );
  }

  const dashboard = await createDashboard(
    workspaceId,
    typeof body.name === "string" ? body.name : "",
  );
  return NextResponse.json({ ok: true, dashboard });
}
