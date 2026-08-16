/**
 * A single shared password, because this is one person's tracker rather than a
 * multi-user product. Vercel's own deployment protection covers this on paid
 * plans; on the free plan the app would otherwise be readable and editable by
 * anyone who has the URL.
 *
 * The gate is off when ARTITRACK_PASSWORD is unset or empty, which keeps local
 * development and the test suite unobstructed.
 */

export const SESSION_COOKIE = "artitrack_session";
export const LOGIN_PATH = "/login";

/** Paths that must stay reachable, or the login page can't render or be submitted. */
const ALWAYS_ALLOWED = [
  LOGIN_PATH,
  "/_next/",
  "/favicon",
  "/icon",
  "/apple-icon",
  "/manifest",
  // Scheduled jobs authenticate with their own secret, not the browser cookie.
  "/api/cron/",
];

export function isPasswordSet(password: string | undefined): boolean {
  return typeof password === "string" && password.length > 0;
}

/**
 * Session value for a password: an HMAC keyed by the password itself.
 *
 * Storing a derived value rather than the password means the cookie never
 * carries it, and changing the password invalidates every existing session.
 */
export async function sessionTokenFor(password: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode("artitrack-session-v1"),
  );
  return [...new Uint8Array(signature)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Compares without leaking where two values start to differ. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Whether a request may proceed. Pure, so the rules are testable without
 * standing up middleware.
 */
export function isRequestAllowed({
  pathname,
  cookieValue,
  expectedToken,
  passwordSet,
}: {
  pathname: string;
  cookieValue: string | undefined;
  expectedToken: string | undefined;
  passwordSet: boolean;
}): boolean {
  if (!passwordSet) return true;
  if (ALWAYS_ALLOWED.some((prefix) => pathname.startsWith(prefix))) return true;
  if (!cookieValue || !expectedToken) return false;
  return safeEqual(cookieValue, expectedToken);
}
