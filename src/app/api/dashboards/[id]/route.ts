import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import {
  addCard,
  deleteDashboard,
  getDashboard,
  moveCard,
  removeCard,
  renameDashboard,
} from "@/lib/dashboards";
import type { ChartSpec } from "@/components/types";
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

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const denied = await requireSession();
  if (denied) return denied;

  const workspaceId = activeWorkspaceId();
  const { id } = await params;
  if (!workspaceId) return NextResponse.json({ error: "No workspace." }, { status: 409 });

  const dashboard = await getDashboard(id, workspaceId);
  if (!dashboard) {
    return NextResponse.json({ error: "No such dashboard." }, { status: 404 });
  }
  return NextResponse.json({ dashboard });
}

/**
 * One route, several verbs on the body:
 *   { name }                         rename
 *   { addCard: {...} }               append a saved question
 *   { removeCard: cardId }           drop one
 *   { moveCard: { id, direction } }  reorder
 */
export async function PATCH(request: Request, { params }: Params) {
  const denied = await requireSession();
  if (denied) return denied;

  const workspaceId = activeWorkspaceId();
  const { id } = await params;
  if (!workspaceId) return NextResponse.json({ error: "No workspace." }, { status: 409 });

  let body: {
    name?: unknown;
    addCard?: unknown;
    removeCard?: unknown;
    moveCard?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    let dashboard = await getDashboard(id, workspaceId);
    if (!dashboard) {
      return NextResponse.json({ error: "No such dashboard." }, { status: 404 });
    }

    if (typeof body.name === "string") {
      dashboard = await renameDashboard(id, workspaceId, body.name);
    }

    if (body.addCard && typeof body.addCard === "object") {
      if (!hasProAccess()) {
        return NextResponse.json(
          { error: "Saving questions requires DASHU_CLOUD_CREDENTIAL.", kind: "license" },
          { status: 402 },
        );
      }
      const card = body.addCard as Record<string, unknown>;
      const question = typeof card.question === "string" ? card.question : "";
      const sql = typeof card.sql === "string" ? card.sql : "";
      if (!question || !sql) {
        return NextResponse.json(
          { error: "A card needs both a question and its SQL." },
          { status: 400 },
        );
      }
      dashboard = await addCard(id, workspaceId, {
        title: typeof card.title === "string" ? card.title : question,
        question,
        sql,
        explanation: typeof card.explanation === "string" ? card.explanation : "",
        chart: (card.chart as ChartSpec) ?? {
          type: "none",
          labelColumn: "",
          valueColumn: "",
        },
      });
    }

    if (typeof body.removeCard === "string") {
      dashboard = await removeCard(id, workspaceId, body.removeCard);
    }

    if (body.moveCard && typeof body.moveCard === "object") {
      const move = body.moveCard as { id?: string; direction?: string };
      if (move.id && (move.direction === "up" || move.direction === "down")) {
        dashboard = await moveCard(id, workspaceId, move.id, move.direction);
      }
    }

    return NextResponse.json({ ok: true, dashboard });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const denied = await requireSession();
  if (denied) return denied;

  const workspaceId = activeWorkspaceId();
  const { id } = await params;
  if (!workspaceId) return NextResponse.json({ error: "No workspace." }, { status: 409 });

  await deleteDashboard(id, workspaceId);
  return NextResponse.json({ ok: true });
}
