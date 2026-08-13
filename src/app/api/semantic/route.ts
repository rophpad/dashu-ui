import { requireSession } from "@/lib/api-auth";
import { NextResponse } from "next/server";
import {
  clearSemanticLayer,
  resolveSemanticLayer,
  sanitiseLayer,
  saveSemanticLayer,
} from "@/lib/semantic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;

  const state = await resolveSemanticLayer();
  return NextResponse.json(state);
}

export async function PUT(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const layer = sanitiseLayer(body);

  try {
    const scope = await saveSemanticLayer(layer);
    return NextResponse.json({ ok: true, scope, layer, source: "saved" });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

/** Discard the saved layer for this database and fall back to the file. */
export async function DELETE() {
  const denied = await requireSession();
  if (denied) return denied;

  await clearSemanticLayer();
  return NextResponse.json({ ok: true, ...(await resolveSemanticLayer()) });
}
