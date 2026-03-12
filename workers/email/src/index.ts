import PostalMime from "postal-mime";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default {
  async email(
    message: ForwardableEmailMessage,
    env: Env,
    ctx: ExecutionContext,
  ) {
    if (message.to !== "post@howery.review") {
      message.setReject("Unknown recipient");
      return;
    }

    if (!["howeryp@hotmail.com", "joyangda@gmail.com"].includes(message.from)) {
      message.setReject("Unauthorized sender");
      return;
    }

    const rawEmail = await new Response(message.raw).arrayBuffer();
    const parsed = await PostalMime.parse(rawEmail);

    if (!parsed.attachments.length) {
      message.setReject("No attachments found");
      return;
    }

    const subject = parsed.subject ?? "untitled";
    const slug = slugify(subject);
    const timestamp = new Date().toISOString();

    // Find the first Word document or PDF attachment
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

    // Determine file extension based on MIME type or filename
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

    // Store any additional attachments (images, etc.) alongside the review
    for (const attachment of parsed.attachments) {
      if (attachment === reviewAttachment) continue;
      const filename = attachment.filename ?? "unnamed";
      const attachKey = `reviews/${slug}/${filename}`;
      await env.ATTACHMENTS.put(attachKey, attachment.content, {
        httpMetadata: { contentType: attachment.mimeType },
      });
      console.log(`Stored extra attachment: ${attachKey}`);
    }
  },
} satisfies ExportedHandler<Env>;
