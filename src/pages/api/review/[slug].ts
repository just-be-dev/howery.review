import type { APIRoute } from "astro";
import { verifyAuth } from "../../../lib/auth";
import { env } from "cloudflare:workers";

export const PATCH: APIRoute = async ({ request, params }) => {
  const password = env.EDIT_PASSWORD;
  if (!password || !(await verifyAuth(request, password))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const slug = params.slug;
  if (!slug) {
    return new Response(JSON.stringify({ error: "Missing slug" }), {
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
  const password = env.EDIT_PASSWORD;
  if (!password || !(await verifyAuth(request, password))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const slug = params.slug;
  if (!slug) {
    return new Response(JSON.stringify({ error: "Missing slug" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const bucket = env.ATTACHMENTS as R2Bucket;
    const key = `reviews/${slug}/review.docx`;

    await bucket.delete(key);

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
