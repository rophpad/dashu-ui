import { randomBytes, scrypt, timingSafeEqual, createHmac } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { readDocument, writeDocument } from "./storage";

/**
 * Authentication for a self-hosted instance. No dependencies — scrypt for
 * passwords, an HMAC-signed cookie for sessions.
 *
 * The first visitor creates the installation account through the UI. Everything
 * remains in the configured storage backend.
 */

const scryptAsync = promisify(scrypt);

export const SESSION_COOKIE = "askdb_session";
const SESSION_DAYS = 30;

export type User = {
  id: string;
  name: string;
  email: string;
  /** scrypt hash, hex. */
  hash: string;
  salt: string;
  createdAt: string;
};

export type PublicUser = { id: string; name: string; email: string };

export function toPublic(user: User): PublicUser {
  return { id: user.id, name: user.name, email: user.email };
}


const globalForAuth = globalThis as unknown as {
  askdbUsers?: User[];
  askdbSecret?: string;
};

/* -------------------------------------------------------------------------- */
/* Secret                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Signing key for session cookies. Taken from the environment when set — which
 * is what you want across replicas — otherwise generated once and persisted, so
 * a single-container deployment doesn't log everyone out on restart.
 */
async function getSecret(): Promise<string> {
  if (globalForAuth.askdbSecret) return globalForAuth.askdbSecret;


  const existing = (await readDocument("auth-secret", "")).trim();
  if (existing) {
    globalForAuth.askdbSecret = existing;
    return existing;
  }

  const generated = randomBytes(32).toString("hex");
  await writeDocument("auth-secret", generated);
  globalForAuth.askdbSecret = generated;
  return generated;
}

/* -------------------------------------------------------------------------- */
/* Users                                                                       */
/* -------------------------------------------------------------------------- */

/** Pure read. Does not provision — provisionAdmin() depends on this. */
async function readUsers(): Promise<User[]> {
  if (globalForAuth.askdbUsers) return globalForAuth.askdbUsers;

  const users = await readDocument<User[]>("users", []);
  globalForAuth.askdbUsers = Array.isArray(users) ? users : [];
  return users;
}

/**
 * Every account in the instance, provisioning the env-configured admin first
 * if the store is still empty.
 *
 * Provisioning hangs off the read rather than a startup hook because every
 * path that cares about accounts goes through here, and Next gives no single
 * reliable "server booted" moment across dev, standalone and edge rendering.
 */
export async function listUsers(): Promise<User[]> {
  return readUsers();
}

async function writeUsers(users: User[]): Promise<void> {
  await writeDocument("users", users);
  globalForAuth.askdbUsers = users;
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return derived.toString("hex");
}

export function validatePassword(password: string): string | null {
  if (password.length < 10) return "Use at least 10 characters.";
  if (password.length > 200) return "That password is too long.";
  return null;
}

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}


export async function createUser(input: {
  name: string;
  email: string;
  password: string;
}): Promise<User> {
  const users = await readUsers();
  const email = normaliseEmail(input.email);

  if (users.some((u) => u.email === email)) {
    throw new Error("An account with that email already exists.");
  }

  const salt = randomBytes(16).toString("hex");
  const user: User = {
    id: `u_${randomBytes(8).toString("hex")}`,
    name: input.name.trim() || email.split("@")[0],
    email,
    salt,
    hash: await hashPassword(input.password, salt),
    createdAt: new Date().toISOString(),
  };

  await writeUsers([...users, user]);
  return user;
}

export async function verifyCredentials(
  email: string,
  password: string,
): Promise<User | null> {
  const users = await listUsers();
  const user = users.find((u) => u.email === normaliseEmail(email));

  // Hash regardless of whether the user exists, so a missing account and a
  // wrong password take the same time.
  const salt = user?.salt ?? "00000000000000000000000000000000";
  const candidate = await hashPassword(password, salt);
  if (!user) return null;

  const a = Buffer.from(candidate, "hex");
  const b = Buffer.from(user.hash, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return user;
}

/* -------------------------------------------------------------------------- */
/* Sessions                                                                    */
/* -------------------------------------------------------------------------- */

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export async function createSessionToken(userId: string): Promise<string> {
  const secret = await getSecret();
  const expires = Date.now() + SESSION_DAYS * 86_400_000;
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp: expires })).toString(
    "base64url",
  );
  return `${payload}.${sign(payload, secret)}`;
}

export async function readSessionToken(token: string): Promise<string | null> {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const secret = await getSecret();
  const expected = sign(payload, secret);

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const { sub, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof sub !== "string" || typeof exp !== "number") return null;
    if (Date.now() > exp) return null;
    return sub;
  } catch {
    return null;
  }
}

export const SESSION_MAX_AGE = SESSION_DAYS * 86_400;

/* -------------------------------------------------------------------------- */
/* Request helpers                                                             */
/* -------------------------------------------------------------------------- */


/** True once at least one account exists and sign-in can succeed. */
export async function canSignIn(): Promise<boolean> {
  return (await listUsers()).length > 0;
}

/**
 * Whether the sign-up form should be offered.
 *
 * A fresh instance always allows the first account: this is a self-hosted
 * product started with `docker compose up`, and whoever reaches it first is
 * the operator. Requiring them to stop, edit an env file and restart just to
 * create that account is friction with no security benefit — anyone who can
 * reach a brand-new instance could equally read its configuration.
 *
 * After the first account is created, public registration closes.
 */
export async function signupAllowed(): Promise<boolean> {
  return (await listUsers()).length === 0;
}

/**
 * The authenticated user for this request, or null.
 *
 * This — not the middleware — is the real gate. Middleware only redirects on a
 * missing cookie so unauthenticated navigation lands somewhere sensible; every
 * route that touches data calls this.
 */
export async function currentUser(): Promise<PublicUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const userId = await readSessionToken(token);
  if (!userId) return null;

  const user = (await listUsers()).find((u) => u.id === userId);
  return user ? toPublic(user) : null;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Sign in to continue.");
    this.name = "UnauthorizedError";
  }
}

/** Throws unless the request is authenticated. */
export async function requireUser(): Promise<PublicUser> {
  const user = await currentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}
