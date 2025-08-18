import prisma from "../../config/prisma.js";

// Utility functions
const toSlug = (name) => name.trim().toLowerCase().replace(/\s+/g, "-");

export async function uniqueCategorySlug(base, excludeId) {
  const baseSlug = toSlug(base);
  let slug = baseSlug;
  let i = 1;
  // eslint-disable-next-line no-await-in-loop
  while (true) {
    // find category with same slug
    const found = await prisma.category.findUnique({ where: { slug } });
    if (!found || (excludeId && found.id === excludeId)) return slug;
    slug = `${baseSlug}-${i++}`;
  }
}

export async function validateNoCycle(newParentId, selfId) {
  if (!newParentId) return true;
  if (newParentId === selfId) return false;
  // walk upwards from newParentId to root; if encounter selfId, it's a cycle
  let cur = newParentId;
  // limit depth to avoid infinite loop in worst case
  for (let step = 0; step < 1000 && cur != null; step++) {
    const cat = await prisma.category.findUnique({ where: { id: cur } });
    if (!cat) return true; // parent not found; treat as safe
    if (cat.id === selfId) return false;
    cur = cat.parentId;
  }
  return true;
}
