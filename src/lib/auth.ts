/**
 * Authentication utilities for the edit admin page.
 * Uses HMAC-SHA256 signed cookies for session management.
 */

const COOKIE_NAME = "edit_session";
const COOKIE_MAX_AGE = 86400 * 7; // 7 days

/**
 * Sign a token using HMAC-SHA256.
 * @param password - The password/key to use for signing
 * @returns Base64url-encoded HMAC signature
 */
export async function signToken(password: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode("edit")
  );

  // Base64url encode
  const bytes = new Uint8Array(signature);
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Verify authentication by checking the signed session cookie.
 * @param request - The incoming request
 * @param password - The password to verify against
 * @returns True if the cookie is valid
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
    const expectedToken = await signToken(password);
    return sessionCookie === expectedToken;
  } catch {
    return false;
  }
}

/**
 * Generate a Set-Cookie header value for the session.
 * @param token - The signed token
 * @returns Cookie header value
 */
export function createSessionCookie(token: string): string {
  const expiresDate = new Date(Date.now() + COOKIE_MAX_AGE * 1000);
  // Note: Secure flag is omitted for development mode. Remove in production or use environment variable.
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}; Expires=${expiresDate.toUTCString()}`;
}
