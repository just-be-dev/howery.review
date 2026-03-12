import mammoth from "mammoth";

export interface Review {
  title: string;
  slug: string;
  date: string;
}

export async function listReviews(bucket: R2Bucket): Promise<Review[]> {
  const listed = await bucket.list({ prefix: "reviews/", delimiter: "/" });

  const reviews: Review[] = [];
  for (const prefix of listed.delimitedPrefixes) {
    const slug = prefix.replace("reviews/", "").replace("/", "");
    const obj = await bucket.head(`reviews/${slug}/review.docx`);
    if (!obj) continue;

    reviews.push({
      title: obj.customMetadata?.title ?? slug,
      slug,
      date: obj.customMetadata?.date ?? obj.uploaded.toISOString(),
    });
  }

  // Sort newest first
  reviews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return reviews;
}

export async function getReview(
  bucket: R2Bucket,
  slug: string,
): Promise<{ title: string; date: string; html: string } | null> {
  const obj = await bucket.get(`reviews/${slug}/review.docx`);
  if (!obj) return null;

  const buffer = await obj.arrayBuffer();
  const result = await mammoth.convertToHtml({ buffer: Buffer.from(buffer) });

  return {
    title: obj.customMetadata?.title ?? slug,
    date: obj.customMetadata?.date ?? obj.uploaded.toISOString(),
    html: result.value,
  };
}
