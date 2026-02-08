import prisma from "../../config/prisma.js";

// Helpers
export const slugify = (str) => {
  // Convert Vietnamese characters to ASCII
  const from = "àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ";
  const to = "aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiioooooooooooooooooouuuuuuuuuuuyyyyyd";
  
  let result = str.toString().trim().toLowerCase();
  for (let i = 0; i < from.length; i++) {
    result = result.replace(new RegExp(from[i], 'g'), to[i]);
  }
  
  return result
    .replace(/\s+/g, "-")           // Replace spaces with -
    .replace(/[^a-z0-9-]/g, "")     // Remove invalid chars
    .replace(/-+/g, "-")            // Collapse multiple dashes
    .replace(/^-|-$/g, "");          // Trim dashes from ends
};

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
