// Note: This file is mainly for documentation.
// The actual application is an Astro site running on Cloudflare Workers.
// See astro.config.mjs for the build configuration.

const info: string = `
Howery.review - Review Platform
================================
This is an Astro-based review application that supports both:
- Word documents (.docx)
- PDF files (.pdf)

Reviews are stored in Cloudflare R2 storage.
See src/lib/reviews.ts for the review handling logic.
`;

console.log(info);