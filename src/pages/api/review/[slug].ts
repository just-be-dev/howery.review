import type { APIRoute } from "astro";
import { verifyAuth, isValidSlug, verifyOrigin } from "../../../lib/auth";
import { env } from "cloudflare:workers";

export const PATCH: APIRoute = async ({ request, params }) => {
  if (!verifyOrigin(request)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const password = env.EDIT_PASSWORD;
  if (!password || !(await verifyAuth(request, password))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const slug = params.slug;
  if (!slug || !isValidSlug(slug)) {
    return new Response(JSON.stringify({ error: "Invalid slug" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json() as { title?: string; date?: string };
    const bucket = env.ATTACHMENTS as R2Bucket;

    const key = `reviews/${slug}/review.docx`;
    const obj = await bucket.get(key);

    if (!obj) {
      return new Response(JSON.stringify({ error: "Review not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const buffer = await obj.arrayBuffer();
    const newMetadata = {
      title: body.title ?? obj.customMetadata?.title ?? slug,
      date: body.date ?? obj.customMetadata?.date ?? new Date().toISOString(),
    };

    await bucket.put(key, buffer, {
      customMetadata: newMetadata,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("PATCH error:", error);
    return new Response(JSON.stringify({ error: "Failed to update review" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const DELETE: APIRoute = async ({ request, params }) => {
  if (!verifyOrigin(request)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const password = env.EDIT_PASSWORD;
  if (!password || !(await verifyAuth(request, password))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const slug = params.slug;
  if (!slug || !isValidSlug(slug)) {
    return new Response(JSON.stringify({ error: "Invalid slug" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const bucket = env.ATTACHMENTS as R2Bucket;
    const prefix = `reviews/${slug}/`;

    const listed = await bucket.list({ prefix });
    if (listed.objects.length > 0) {
      await bucket.delete(listed.objects.map((obj) => obj.key));
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("DELETE error:", error);
    return new Response(JSON.stringify({ error: "Failed to delete review" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
