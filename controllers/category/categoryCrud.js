import prisma from "../../config/prisma.js";
import { uniqueCategorySlug } from "./helpers.js";

// POST /api/category/add
export const addCategory = async (req, res) => {
  try {
    const { name, parentId, position = 0 } = req.body;
    if (!name)
      return res.status(400).json({ success: false, message: "name required" });

    const slug = await uniqueCategorySlug(name);

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
