import type { APIRoute } from "astro";
import { signToken, createSessionCookie } from "../../lib/auth";
import { env } from "cloudflare:workers";

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json() as { password?: string };
    const password = body.password;

    if (!password) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/edit?error=1" },
      });
    }

    const expectedPassword = env.EDIT_PASSWORD;
    if (!expectedPassword) {
      console.error("EDIT_PASSWORD not configured");
      return new Response(null, {
        status: 302,
        headers: { Location: "/edit?error=1" },
      });
    }

    if (password !== expectedPassword) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/edit?error=1" },
      });
    }

    const token = await signToken(password);
    const cookie = createSessionCookie(token);

    return new Response(null, {
      status: 302,
      headers: {
        Location: "/edit",
        "Set-Cookie": cookie,
      },
    });
  } catch (error) {
    console.error("Auth error:", error);
    return new Response(null, {
      status: 302,
      headers: { Location: "/edit?error=1" },
    });
  }
};
