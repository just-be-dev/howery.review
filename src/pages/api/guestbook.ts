import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export interface GuestbookEntry {
  id: string;
  name: string;
  location?: string;
  website?: string;
  message: string;
  timestamp: string;
}

const GUESTBOOK_KEY = "guestbook/entries.json";

async function getEntries(bucket: R2Bucket): Promise<GuestbookEntry[]> {
  const obj = await bucket.get(GUESTBOOK_KEY);
  if (!obj) return [];
  const text = await obj.text();
  try {
    return JSON.parse(text) as GuestbookEntry[];
  } catch {
    return [];
  }
}

async function saveEntries(bucket: R2Bucket, entries: GuestbookEntry[]): Promise<void> {
  await bucket.put(GUESTBOOK_KEY, JSON.stringify(entries), {
    httpMetadata: { contentType: "application/json" },
  });
}

export const GET: APIRoute = async () => {
  try {
    const bucket = env.ATTACHMENTS;
    const entries = await getEntries(bucket);
    return new Response(JSON.stringify(entries), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Guestbook GET error:", error);
    return new Response(JSON.stringify([]), {
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const bucket = env.ATTACHMENTS;
    const body = (await request.json()) as {
      name?: string;
      location?: string;
      website?: string;
      message?: string;
    };

    const { name, location, website, message } = body;

    if (!name?.trim() || !message?.trim()) {
      return new Response(JSON.stringify({ error: "Name and message are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (name.length > 100 || message.length > 2000) {
      return new Response(JSON.stringify({ error: "Input too long" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate website URL if provided — only allow http/https
    let sanitizedWebsite: string | undefined;
    if (website?.trim()) {
      try {
        const url = new URL(website.trim());
        if (url.protocol === "http:" || url.protocol === "https:") {
          sanitizedWebsite = url.toString();
        }
      } catch {
        // Invalid URL, ignore
      }
    }

    const entries = await getEntries(bucket);

    const entry: GuestbookEntry = {
      id: crypto.randomUUID(),
      name: name.trim(),
      location: location?.trim() || undefined,
      website: sanitizedWebsite,
      message: message.trim(),
      timestamp: new Date().toISOString(),
    };

    entries.push(entry);
    await saveEntries(bucket, entries);

    return new Response(JSON.stringify(entry), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Guestbook POST error:", error);
    return new Response(JSON.stringify({ error: "Failed to save entry" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
