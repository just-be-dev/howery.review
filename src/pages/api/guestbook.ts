import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const POST: APIRoute = async ({ request }) => {
  const origin = request.headers.get("Origin");
  const url = new URL(request.url);
  if (origin && origin !== url.origin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { name?: string; email?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const message = body.message?.trim();

  if (!name || !email || !message) {
    return Response.json({ error: "Name, email, and message are required." }, { status: 400 });
  }

  if (name.length > 100 || email.length > 254 || message.length > 2000) {
    return Response.json({ error: "Input too long." }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Invalid email address." }, { status: 400 });
  }

  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const { success } = await env.GUESTBOOK_RATE_LIMIT.limit({ key: ip });
  if (!success) {
    return Response.json({ error: "Too many submissions. Try again later." }, { status: 429 });
  }

  const db = env.DB;

  const banned = await db
    .prepare("SELECT 1 FROM banned_emails WHERE email = ? OR ip = ?")
    .bind(email, ip)
    .first();

  if (banned) {
    return Response.json({ error: "You are not allowed to post." }, { status: 403 });
  }

  const ai = env.AI;
  let flagged = false;
  let reason = "";

  try {
    const response = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        {
          role: "system",
          content:
            "You are a content moderator for a movie review blog's guestbook. " +
            "Evaluate the following guestbook submission and determine if it is spam, " +
            "contains inappropriate content (hate speech, slurs, harassment, explicit content), " +
            "or is clearly not a genuine guestbook message (e.g. ads, phishing, gibberish). " +
            "Respond with ONLY a JSON object: {\"flagged\": true/false, \"reason\": \"brief reason\"}. " +
            "Be lenient — allow casual messages, compliments, constructive criticism, and humor. " +
            "Only flag truly problematic content.",
        },
        {
          role: "user",
          content: `Name: ${name}\nMessage: ${message}`,
        },
      ],
      max_tokens: 100,
    });

    const text = (response as { response?: string }).response ?? "";
    const match = text.match(/\{[\s\S]*?\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      flagged = parsed.flagged === true;
      reason = parsed.reason ?? "";
    }
  } catch (err) {
    console.error("AI moderation error:", err);
    // If AI fails, allow the post through rather than blocking
  }

  if (flagged) {
    await db.batch([
      db.prepare("INSERT INTO banned_emails (email, ip, reason) VALUES (?, ?, ?)").bind(email, ip, reason),
      db.prepare("INSERT INTO flagged_entries (name, email, message, ip, reason) VALUES (?, ?, ?, ?, ?)").bind(name, email, message, ip, reason),
    ]);

    return Response.json(
      { error: "Your message was flagged as inappropriate and could not be posted." },
      { status: 422 },
    );
  }

  await db
    .prepare("INSERT INTO guestbook_entries (name, email, message) VALUES (?, ?, ?)")
    .bind(name, email, message)
    .run();

  return Response.json({ ok: true }, {
    status: 201,
    headers: {
      "Set-Cookie": "guestbook_signed=1; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax",
    },
  });
};
