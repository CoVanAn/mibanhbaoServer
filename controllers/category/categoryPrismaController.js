import prisma from "../../config/prisma.js";

// Helpers
const toSlug = (name) => name.trim().toLowerCase().replace(/\s+/g, "-");
async function uniqueCategorySlug(base, excludeId) {
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

async function validateNoCycle(newParentId, selfId) {
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

// POST /api/category/add
export const addCategory = async (req, res) => {
  try {
    const { name, parentId, position = 0 } = req.body;
    if (!name)
      return res.status(400).json({ success: false, message: "name required" });

    // slug derive from name
    const slugBase = name.trim().toLowerCase().replace(/\s+/g, "-");
    let slug = slugBase;
    let i = 1;
    // eslint-disable-next-line no-await-in-loop
    while (await prisma.category.findUnique({ where: { slug } })) {
      slug = `${slugBase}-${i++}`;
    }

    const created = await prisma.category.create({
      data: {
        name,
        slug,
        parentId: parentId ? Number(parentId) : null,
        position: Number(position) || 0,
      },
    });

    return res.json({ success: true, id: created.id });
  } catch (err) {
    console.error("addCategory(prisma) error:", err);
    return res.status(500).json({ success: false, message: "Error" });
  }
};

// GET /api/category/list
export const listCategory = async (req, res) => {
  try {
    const includeInactive = String(req.query.includeInactive || "") === "1";
    const items = await prisma.category.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ parentId: "asc" }, { position: "asc" }, { name: "asc" }],
    });
    return res.json(items);
  } catch (err) {
    console.error("listCategory(prisma) error:", err);
    return res.status(500).json({ message: "error" });
  }
};

// GET /api/category/:idOrSlug
export const getCategory = async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    const where = /^\d+$/.test(idOrSlug)
      ? { id: Number(idOrSlug) }
      : { slug: String(idOrSlug) };
    const cat = await prisma.category.findFirst({ where });
    if (!cat) return res.status(404).json({ message: "Not found" });
    return res.json(cat);
  } catch (err) {
    console.error("getCategory error:", err);
    return res.status(500).json({ message: "error" });
  }
};

// PATCH /api/category/:id
export const updateCategory = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "invalid id" });

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Not found" });

    const { name, parentId, position, isActive } = req.body;

    // Compute updates
    const data = {};
    if (name && name !== existing.name) {
      data.name = name;
      data.slug = await uniqueCategorySlug(name, id);
    }
    if (position !== undefined) data.position = Number(position) || 0;
    if (isActive !== undefined)
      data.isActive =
        typeof isActive === "boolean" ? isActive : String(isActive) === "true";

    if (parentId !== undefined) {
      const pid =
        parentId === null || parentId === "" ? null : Number(parentId);
      if (pid !== null && Number.isNaN(pid)) {
        return res
          .status(400)
          .json({ message: "parentId must be a number or null" });
      }
      if (pid) {
        const ok = await validateNoCycle(pid, id);
        if (!ok)
          return res
            .status(400)
            .json({ message: "Invalid parent: cycle detected" });
        const parent = await prisma.category.findUnique({ where: { id: pid } });
        if (!parent)
          return res.status(400).json({ message: "parentId not found" });
      }
      data.parentId = pid;
    }

    const updated = await prisma.category.update({ where: { id }, data });
    return res.json({ success: true, id: updated.id });
  } catch (err) {
    console.error("updateCategory error:", err);
    return res.status(500).json({ message: "error" });
  }
};

// DELETE /api/category/:id
export const removeCategory = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "invalid id" });
    // Block delete if category has children
    const [childCount, linkCount] = await Promise.all([
      prisma.category.count({ where: { parentId: id } }),
      prisma.productCategory.count({ where: { categoryId: id } }),
    ]);
    if (childCount > 0) {
      return res
        .status(400)
        .json({
          message: `Category có ${childCount} danh mục con. Không thể xóa.`,
        });
    }
    if (linkCount > 0) {
      return res
        .status(400)
        .json({
          message: `Category đang liên kết với ${linkCount} sản phẩm. Không thể xóa.`,
        });
    }
    await prisma.category.delete({ where: { id } });
    return res.json({ success: true });
  } catch (err) {
    console.error("removeCategory error:", err);
    // If constraint errors occur, surface as 400
    return res.status(400).json({ message: "cannot delete category" });
  }
};

export default {
  addCategory,
  listCategory,
  getCategory,
  updateCategory,
  removeCategory,
};
