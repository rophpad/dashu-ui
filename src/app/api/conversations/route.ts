import { NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/lib/auth";
import { readConversations, writeConversations } from "@/lib/conversations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({ conversations: await readConversations(user.id) });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[dashu] could not load conversations:", error);
    return NextResponse.json({ error: "Could not load conversations." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as { conversations?: unknown };
    if (!body.conversations || typeof body.conversations !== "object" || Array.isArray(body.conversations)) {
      return NextResponse.json({ error: "Invalid conversations." }, { status: 400 });
    }
    await writeConversations(user.id, body.conversations as Record<string, never[]>);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[dashu] could not save conversations:", error);
    return NextResponse.json({ error: "Could not save conversations." }, { status: 500 });
  }
}
