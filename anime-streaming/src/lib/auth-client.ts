/**
 * Typed client for the Spring auth server.
 *
 * Security model (matches the backend):
 *  - The access token (RS256 JWT) is held only in memory — never localStorage —
 *    so an XSS payload can't exfiltrate a long-lived credential.
 *  - The refresh token lives in an httpOnly + Secure + SameSite=Strict cookie the
 *    JS can't read; we rotate it via /refresh.
 *  - /refresh and /logout require a double-submit CSRF token: we echo the readable
 *    `anifire_csrf` cookie in the `X-CSRF-Token` header.
 */

const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";
const AUTH = `${API_BASE}/api/v1/auth`;

export interface AuthUser {
  id: number;
  email: string;
  displayName: string | null;
  role: string;
  emailVerified: boolean;
}

export type SocialProvider = "google" | "microsoft" | "apple";

interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: AuthUser;
}

export class AuthError extends Error {
  code: string;
  status: number;
  fields?: Record<string, string>;
  constructor(message: string, code: string, status: number, fields?: Record<string, string>) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.status = status;
    this.fields = fields;
  }
}

// ── in-memory access token ──────────────────────────────────────────────
let accessToken: string | null = null;
let accessExpiresAt = 0;

function setSession(res: AuthResponse): AuthUser {
  accessToken = res.accessToken;
  accessExpiresAt = Date.now() + res.expiresIn * 1000 - 5_000; // refresh 5s early
  return res.user;
}

export function clearSession(): void {
  accessToken = null;
  accessExpiresAt = 0;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

async function parse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}) as Record<string, unknown>);
  if (!res.ok) {
    throw new AuthError(
      (data.message as string) || "Request failed.",
      (data.error as string) || "error",
      res.status,
      data.fields as Record<string, string> | undefined
    );
  }
  return data as T;
}

// ── public API ──────────────────────────────────────────────────────────
export async function register(input: {
  email: string;
  password: string;
  displayName?: string;
}): Promise<{ message: string }> {
  const res = await fetch(`${AUTH}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parse(res);
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<AuthUser> {
  const res = await fetch(`${AUTH}/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return setSession(await parse<AuthResponse>(res));
}

export async function socialLogin(provider: SocialProvider): Promise<AuthUser> {
  const res = await fetch(`${AUTH}/social-login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider }),
  });
  return setSession(await parse<AuthResponse>(res));
}

export async function refresh(): Promise<AuthUser | null> {
  const csrf = readCookie("anifire_csrf");
  if (!csrf) return null;
  let res: Response;
  try {
    res = await fetch(`${AUTH}/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "X-CSRF-Token": csrf },
    });
  } catch {
    // Network error (backend down / CORS / offline) — treat as logged out.
    clearSession();
    return null;
  }
  if (!res.ok) {
    clearSession();
    return null;
  }
  return setSession((await res.json()) as AuthResponse);
}

export async function logout(): Promise<void> {
  const csrf = readCookie("anifire_csrf");
  try {
    await fetch(`${AUTH}/logout`, {
      method: "POST",
      credentials: "include",
      headers: csrf ? { "X-CSRF-Token": csrf } : {},
    });
  } catch {
    // Network error — clear locally anyway; the server cookie will expire.
  } finally {
    clearSession();
  }
}

/** Returns a valid access token, transparently refreshing if needed. */
async function validToken(): Promise<string | null> {
  if (accessToken && Date.now() < accessExpiresAt) return accessToken;
  await refresh();
  return accessToken;
}

export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const token = await validToken();
  if (!token) {
    throw new AuthError("Please sign in first.", "unauthorized", 401);
  }
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(input, {
    ...init,
    credentials: "include",
    headers,
  });
}

export async function getMe(): Promise<AuthUser | null> {
  const token = await validToken();
  if (!token) return null;
  let res: Response;
  try {
    res = await fetch(`${AUTH}/me`, {
      credentials: "include",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // Network error (backend down / CORS / offline) — treat as logged out.
    return null;
  }
  if (res.status === 401) {
    const user = await refresh();
    if (!user) return null;
    return user;
  }
  if (!res.ok) return null;
  return (await res.json()) as AuthUser;
}

// ── profile ─────────────────────────────────────────────────────────────
export interface Profile {
  id: number;
  email: string;
  displayName: string | null;
  role: string;
  emailVerified: boolean;
  bio: string | null;
  location: string | null;
  birthday: string | null; // ISO date (yyyy-mm-dd)
  avatarUrl: string | null;
  bannerUrl: string | null;
  level: number;
  points: number;
  profileViews: number;
  likes: number;
  friends: number;
  posts: number;
  commentsCount: number;
  createdAt: string | null;
  lastLoginAt: string | null;
}

export type ProfileUpdate = Partial<
  Pick<
    Profile,
    "displayName" | "bio" | "location" | "birthday" | "avatarUrl" | "bannerUrl"
  >
>;

export async function getProfile(): Promise<Profile | null> {
  try {
    const res = await authFetch(`${AUTH}/me/profile`);
    if (!res.ok) return null;
    return (await res.json()) as Profile;
  } catch {
    return null;
  }
}

export async function updateProfile(patch: ProfileUpdate): Promise<Profile> {
  const res = await authFetch(`${AUTH}/me/profile`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
  return parse<Profile>(res);
}

export async function randomizeProfile(): Promise<Profile> {
  const res = await authFetch(`${AUTH}/me/profile/randomize`, { method: "POST" });
  return parse<Profile>(res);
}

export async function verifyEmail(token: string): Promise<{ message: string }> {
  const res = await fetch(`${AUTH}/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  return parse(res);
}

export async function resendVerification(email: string): Promise<{ message: string }> {
  const res = await fetch(`${AUTH}/resend-verification`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return parse(res);
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  const res = await fetch(`${AUTH}/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return parse(res);
}

export async function resetPassword(
  token: string,
  password: string
): Promise<{ message: string }> {
  const res = await fetch(`${AUTH}/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });
  return parse(res);
}

export { API_BASE };
