import prisma from "../../config/prisma.js";
import { uniqueCategorySlug } from "./helpers.js";

// POST /api/category/add
export const createCategory = async (req, res, next) => {
  try {
    const { name, parentId, position = 0 } = req.body;
    if (!name)
      return res
        .status(400)
        .json({ success: false, message: "Tên danh mục là bắt buộc" });

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
    return next(err);
  }
};

// GET /api/category/list
export const listCategories = async (req, res, next) => {
  try {
    const includeInactive = String(req.query.includeInactive || "") === "1";
    const items = await prisma.category.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ parentId: "asc" }, { position: "asc" }, { name: "asc" }],
    });
    return res.json(items);
  } catch (err) {
    return next(err);
  }
};

// GET /api/category/:idOrSlug
export const getCategory = async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;
    const where = /^\d+$/.test(idOrSlug)
      ? { id: Number(idOrSlug) }
      : { slug: String(idOrSlug) };
    const cat = await prisma.category.findFirst({ where });
    if (!cat)
      return res
        .status(404)
        .json({ success: false, message: "Danh mục không tồn tại" });
    return res.json(cat);
  } catch (err) {
    return next(err);
  }
};

// Backward-compatible aliases
export const addCategory = createCategory;
export const listCategory = listCategories;
