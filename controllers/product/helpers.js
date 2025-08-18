import prisma from "../../config/prisma.js";

// Helpers
export const slugify = (str) =>
  str
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

export async function uniqueSlug(base, model) {
  let slug = slugify(base);
  let i = 1;
  // eslint-disable-next-line no-await-int-loop
  // eslint-disable-next-line no-await-in-loop
  while (await prisma[model].findUnique({ where: { slug } })) {
    slug = `${slugify(base)}-${i++}`;
  }
  return slug;
}
