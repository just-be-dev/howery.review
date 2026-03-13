/**
 * Authentication utilities for the edit admin page.
 * Uses HMAC-SHA256 signed cookies with timestamped tokens.
 */

const COOKIE_NAME = "edit_session";
const COOKIE_MAX_AGE = 86400 * 7; // 7 days

async function importKey(password: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function base64urlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Sign a timestamped token using HMAC-SHA256.
 * Token format: `<issuedAt>.<base64url-signature>`
 */
export async function signToken(password: string): Promise<string> {
  const issuedAt = Date.now();
  const key = await importKey(password);
  const payload = `edit:${issuedAt}`;
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );
  return `${issuedAt}.${base64urlEncode(signature)}`;
}

/**
 * Verify authentication by checking the signed session cookie.
 * Uses crypto.subtle.verify for timing-safe comparison.
 */
export async function verifyAuth(
  request: Request,
  password: string
): Promise<boolean> {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return false;

  const cookies = Object.fromEntries(
    cookieHeader.split("; ").map((c) => {
      const [name, ...rest] = c.split("=");
      return [name, rest.join("=")];
    })
  );

  const sessionCookie = cookies[COOKIE_NAME];
  if (!sessionCookie) return false;

  try {
    const dotIndex = sessionCookie.indexOf(".");
    if (dotIndex === -1) return false;

    const issuedAtStr = sessionCookie.slice(0, dotIndex);
    const sig = sessionCookie.slice(dotIndex + 1);

    const issuedAt = parseInt(issuedAtStr, 10);
    if (isNaN(issuedAt)) return false;

    // Reject expired tokens
    if (Date.now() - issuedAt > COOKIE_MAX_AGE * 1000) return false;

    const key = await importKey(password);
    const payload = `edit:${issuedAt}`;
    const sigBytes = base64urlDecode(sig);

    // crypto.subtle.verify is timing-safe
    return crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes as ArrayBufferView<ArrayBuffer>,
      new TextEncoder().encode(payload)
    );
  } catch {
    return false;
  }
}

/**
 * Generate a Set-Cookie header value for the session.
 */
export function createSessionCookie(token: string): string {
  const expiresDate = new Date(Date.now() + COOKIE_MAX_AGE * 1000);
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${COOKIE_MAX_AGE}; Expires=${expiresDate.toUTCString()}`;
}

/**
 * Constant-time string comparison using HMAC to avoid timing side-channels.
 */
export async function constantTimeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [hashA, hashB] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a)),
    crypto.subtle.digest("SHA-256", encoder.encode(b)),
  ]);
  const bytesA = new Uint8Array(hashA);
  const bytesB = new Uint8Array(hashB);
  let result = 0;
  for (let i = 0; i < bytesA.length; i++) {
    result |= bytesA[i]! ^ bytesB[i]!;
  }
  return result === 0;
}

/**
 * Validate that a slug is safe for use in R2 key paths.
 * Rejects path traversal attempts and invalid characters.
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(slug);
}

/**
 * Verify the request Origin header matches the expected host.
 * Returns true if the origin is valid or if no origin is present (same-origin non-fetch).
 */
export function verifyOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // Same-origin requests may omit Origin
  try {
    const requestUrl = new URL(request.url);
    const originUrl = new URL(origin);
    return originUrl.host === requestUrl.host;
  } catch {
    return false;
  }
}
