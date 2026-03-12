import mammoth from "mammoth";
import pdfParse from "pdf-parse";

export interface Review {
  title: string;
  slug: string;
  date: string;
}

async function getReviewFile(bucket: R2Bucket, slug: string): Promise<{ obj: R2Object; type: "docx" | "pdf" } | null> {
  // Try .docx first
  let obj = await bucket.get(`reviews/${slug}/review.docx`);
  if (obj) return { obj, type: "docx" };

  // Try .pdf
  obj = await bucket.get(`reviews/${slug}/review.pdf`);
  if (obj) return { obj, type: "pdf" };

  return null;
}

async function convertPdfToHtml(buffer: ArrayBuffer): Promise<string> {
  const data = await pdfParse(buffer);

  // Extract text and format as simple HTML
  const paragraphs = data.text
    .split('\n')
    .filter((line: string) => line.trim())
    .map((line: string) => `<p>${escapeHtml(line)}</p>`)
    .join('');

  return paragraphs;
}

function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

export async function listReviews(bucket: R2Bucket): Promise<Review[]> {
  const listed = await bucket.list({ prefix: "reviews/", delimiter: "/" });

  const reviews: Review[] = [];
  for (const prefix of listed.delimitedPrefixes) {
    const slug = prefix.replace("reviews/", "").replace("/", "");
    const file = await getReviewFile(bucket, slug);
    if (!file) continue;

    reviews.push({
      title: file.obj.customMetadata?.title ?? slug,
      slug,
      date: file.obj.customMetadata?.date ?? file.obj.uploaded.toISOString(),
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
  const file = await getReviewFile(bucket, slug);
  if (!file) return null;

  const buffer = await file.obj.arrayBuffer();

  let html: string;
  if (file.type === "docx") {
    const result = await mammoth.convertToHtml({ buffer: Buffer.from(buffer) });
    html = result.value;
  } else {
    html = await convertPdfToHtml(buffer);
  }

  return {
    title: file.obj.customMetadata?.title ?? slug,
    date: file.obj.customMetadata?.date ?? file.obj.uploaded.toISOString(),
    html,
  };
}
