import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import {
  getAiSettings,
  publicAiSettings,
  saveAiSettings,
  type AiMode,
} from "@/lib/ai-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  return NextResponse.json(publicAiSettings(await getAiSettings(user.id)));
}

export async function PUT(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const mode = body.mode as AiMode;
  if (mode !== "managed" && mode !== "openrouter" && mode !== "local") {
    return NextResponse.json({ error: "Choose a supported AI provider." }, { status: 400 });
  }

  const current = await getAiSettings(user.id);
  const openrouter = (body.openrouter ?? {}) as Record<string, unknown>;
  const local = (body.local ?? {}) as Record<string, unknown>;
  const next = {
    mode,
    openrouter: {
      model: typeof openrouter.model === "string" ? openrouter.model : current.openrouter.model,
      apiKey:
        typeof openrouter.apiKey === "string" && openrouter.apiKey.trim()
          ? openrouter.apiKey
          : current.openrouter.apiKey,
    },
    local: {
      baseUrl: typeof local.baseUrl === "string" ? local.baseUrl : current.local.baseUrl,
      model: typeof local.model === "string" ? local.model : current.local.model,
      apiKey:
        typeof local.apiKey === "string" && local.apiKey.trim()
          ? local.apiKey
          : current.local.apiKey,
    },
  };

  if (mode === "openrouter" && (!next.openrouter.model.trim() || !next.openrouter.apiKey.trim())) {
    return NextResponse.json({ error: "OpenRouter requires an API key and model." }, { status: 400 });
  }
  if (mode === "local" && (!next.local.baseUrl.trim() || !next.local.model.trim())) {
    return NextResponse.json({ error: "Local AI requires a base URL and model." }, { status: 400 });
  }

  const saved = await saveAiSettings(user.id, next);
  return NextResponse.json({ ok: true, ...publicAiSettings(saved) });
}
