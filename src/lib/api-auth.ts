import { NextResponse } from "next/server";
import { currentUser } from "./auth";

/**
 * The real gate for API routes. Returns a 401 response to hand straight back,
 * or null when the request is authenticated.
 */
export async function requireSession(): Promise<NextResponse | null> {
  if (await currentUser()) return null;
  return NextResponse.json(
    { error: "Sign in to continue.", kind: "unauthorized" },
    { status: 401 },
  );
}
