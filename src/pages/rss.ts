import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { listReviews } from "../lib/reviews";
import { env } from "cloudflare:workers";

export const GET: APIRoute = async (context) => {
  const bucket = env.ATTACHMENTS;
  const reviews = await listReviews(bucket);

  return rss({
    title: "Howery's Review",
    description: "Motion Picture Critiques & Commentary",
    site: context.site!,
    items: reviews.map((review) => ({
      title: review.title,
      pubDate: new Date(review.date),
      link: `/${review.slug}/`,
    })),
    customData: `<language>en-us</language>`,
  });
};
