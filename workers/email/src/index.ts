import PostalMime from "postal-mime";

const GITHUB_REPO = "just-be-dev/howery.review";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function handlePostEmail(
  message: ForwardableEmailMessage,
  parsed: Awaited<ReturnType<typeof PostalMime.parse>>,
  env: Env,
) {
  if (!parsed.attachments.length) {
    message.setReject("No attachments found");
    return;
  }

  const subject = parsed.subject ?? "untitled";
  const slug = slugify(subject);
  const timestamp = new Date().toISOString();

  const reviewAttachment = parsed.attachments.find(
    (a) =>
      a.mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      a.mimeType === "application/pdf" ||
      a.filename?.endsWith(".docx") ||
      a.filename?.endsWith(".doc") ||
      a.filename?.endsWith(".pdf"),
  );

  if (!reviewAttachment) {
    message.setReject("No Word document or PDF attachment found");
    return;
  }

  const isPdf =
    reviewAttachment.mimeType === "application/pdf" ||
    reviewAttachment.filename?.endsWith(".pdf");
  const extension = isPdf ? "pdf" : "docx";

  const key = `reviews/${slug}/review.${extension}`;
  await env.ATTACHMENTS.put(key, reviewAttachment.content, {
    httpMetadata: { contentType: reviewAttachment.mimeType },
    customMetadata: {
      title: subject,
      slug,
      from: message.from,
      date: timestamp,
    },
  });

  console.log(`Stored review: ${key} (title: "${subject}", slug: "${slug}")`);

  for (const attachment of parsed.attachments) {
    if (attachment === reviewAttachment) continue;
    const filename = attachment.filename ?? "unnamed";
    const attachKey = `reviews/${slug}/${filename}`;
    await env.ATTACHMENTS.put(attachKey, attachment.content, {
      httpMetadata: { contentType: attachment.mimeType },
    });
    console.log(`Stored extra attachment: ${attachKey}`);
  }
}

async function handleHelpEmail(
  parsed: Awaited<ReturnType<typeof PostalMime.parse>>,
  env: Env,
) {
  const subject = parsed.subject ?? "Help request";
  const body = parsed.text ?? parsed.html ?? "(no body)";

  const issueBody = body;

  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/issues`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "howery-review-email-worker",
      },
      body: JSON.stringify({
        title: subject,
        body: issueBody,
        labels: ["help-request"],
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    console.error(`GitHub API error: ${response.status} ${text}`);
    throw new Error(`Failed to create GitHub issue: ${response.status}`);
  }

  const issue = (await response.json()) as { number: number; html_url: string };
  console.log(`Created GitHub issue #${issue.number}: ${issue.html_url}`);
}

export default {
  async email(
    message: ForwardableEmailMessage,
    env: Env,
    ctx: ExecutionContext,
  ) {
    const allowedSenders = ["howeryp@hotmail.com", "joyangda@gmail.com"];
    if (!allowedSenders.includes(message.from)) {
      message.setReject("Unauthorized sender");
      return;
    }

    const rawEmail = await new Response(message.raw).arrayBuffer();
    const parsed = await PostalMime.parse(rawEmail);

    if (message.to === "post@howery.review") {
      await handlePostEmail(message, parsed, env);
    } else if (message.to === "help@howery.review") {
      await handleHelpEmail(parsed, env);
    } else {
      message.setReject("Unknown recipient");
    }
  },
} satisfies ExportedHandler<Env>;
