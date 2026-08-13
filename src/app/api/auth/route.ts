import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,

  canSignIn,
  createSessionToken,
  createUser,
  currentUser,
  listUsers,
  normaliseEmail,
  signupAllowed,
  toPublic,
  validatePassword,
  verifyCredentials,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Session state, used by the client to decide what to render. */
export async function GET() {
  const users = await listUsers();
  return NextResponse.json({
    user: await currentUser(),
    canSignIn: await canSignIn(),
    /** No account yet: the first visitor creates it. */
    needsSetup: users.length === 0,
    allowSignup: await signupAllowed(),
  });
}

function setSession(response: NextResponse, token: string, request: Request): NextResponse {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure:
      (request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol) === "https",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}

/**
 * `{ action: "signin" | "signup" | "signout", … }`
 *
 * Sign-up is open only while the instance has no accounts.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const action = String(body.action ?? "");

  if (action === "signout") {
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  }

  if (action !== "signin" && action !== "signup") {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }


  const email = normaliseEmail(String(body.email ?? ""));
  const password = String(body.password ?? "");

  if (!email || !password) {
    return NextResponse.json(
      { error: "Enter an email address and password." },
      { status: 400 },
    );
  }

  if (action === "signup") {
    if (!(await signupAllowed())) {
      return NextResponse.json(
        {
          error: "Sign-ups are closed after the initial account is created.",
        },
        { status: 403 },
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "That email doesn't look right." },
        { status: 400 },
      );
    }
    const problem = validatePassword(password);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });

    try {
      const user = await createUser({ name: String(body.name ?? ""), email, password });
      return setSession(
        NextResponse.json({ ok: true, user: toPublic(user) }),
        await createSessionToken(user.id),
        request,
      );
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 400 });
    }
  }

  if (!(await canSignIn())) {
    return NextResponse.json(
      {
        error: "This instance has no account yet — create the first one to get started.",
        kind: "needs_setup",
      },
      { status: 409 },
    );
  }

  const user = await verifyCredentials(email, password);
  if (!user) {
    // Deliberately vague: don't reveal which accounts exist.
    return NextResponse.json(
      { error: "That email and password don't match." },
      { status: 401 },
    );
  }

  return setSession(
    NextResponse.json({ ok: true, user: toPublic(user) }),
    await createSessionToken(user.id),
    request,
  );
}
