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
    message.setReject(
      "Your email to post@howery.review did not include any attachments. " +
        "To post a review, please attach a Word document (.docx or .doc) to your email and send it again.",
    );
    return;
  }

  const subject = parsed.subject ?? "untitled";
  const slug = slugify(subject);
  const timestamp = new Date().toISOString();

  const reviewAttachment = parsed.attachments.find(
    (a) =>
      a.mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      a.filename?.endsWith(".docx") ||
      a.filename?.endsWith(".doc"),
  );

  if (!reviewAttachment) {
    message.setReject(
      "Your email to post@howery.review included attachments, but none of them were a Word document. " +
        "Please attach your review as a .docx or .doc file and send it again. " +
        "If you saved your review as a PDF or other format, please re-save it as a Word document first.",
    );
    return;
  }

  const key = `reviews/${slug}/review.docx`;
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
        body: body,
        labels: ["help-request"],
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    console.error(`GitHub API error: ${response.status} ${text}`);
    throw new Error(`Failed to create GitHub issue: ${response.status}`);
  }

  const issue = (await response.json()) as {
    number: number;
    html_url: string;
  };
  console.log(`Created GitHub issue #${issue.number}: ${issue.html_url}`);
}

const ALLOWED_SENDERS = ["howeryp@hotmail.com", "joyangda@gmail.com"];

export async function handleEmail(
  message: ForwardableEmailMessage,
  env: Env,
) {
  if (!ALLOWED_SENDERS.includes(message.from)) {
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
    message.setReject(
      `The address "${message.to}" is not recognized. ` +
        "To post a review, send your email to post@howery.review. " +
        "If you need help, send your email to help@howery.review instead.",
    );
  }
}
