import prisma from "../../config/prisma.js";
import { uniqueCategorySlug, validateNoCycle } from "./helpers.js";
import { parsePositiveInt } from "../../utils/id.js";

// PATCH /api/category/:id
export const updateCategory = async (req, res, next) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) return res.status(400).json({ message: "ID không hợp lệ" });

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Không tìm thấy" });

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
          .json({ message: "parentId phải là số hoặc null" });
      }
      if (pid) {
        const ok = await validateNoCycle(pid, id);
        if (!ok)
          return res
            .status(400)
            .json({ message: "Danh mục cha không hợp lệ: phát hiện vòng lặp" });
        const parent = await prisma.category.findUnique({ where: { id: pid } });
        if (!parent)
          return res.status(400).json({ message: "Không tìm thấy parentId" });
      }
      data.parentId = pid;
    }

    const updated = await prisma.category.update({ where: { id }, data });
    return res.json({ success: true, id: updated.id });
  } catch (err) {
    return next(err);
  }
};

// DELETE /api/category/:id
export const removeCategory = async (req, res, next) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) return res.status(400).json({ message: "ID không hợp lệ" });

    // Block delete if category has children
    const [childCount, linkCount] = await Promise.all([
      prisma.category.count({ where: { parentId: id } }),
      prisma.productCategory.count({ where: { categoryId: id } }),
    ]);

    if (childCount > 0) {
      return res.status(400).json({
        message: `Category có ${childCount} danh mục con. Không thể xóa.`,
      });
    }

    if (linkCount > 0) {
      return res.status(400).json({
        message: `Category đang liên kết với ${linkCount} sản phẩm. Không thể xóa.`,
      });
    }

    await prisma.category.delete({ where: { id } });
    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
};

// Backward-compatible alias
export const deleteCategory = removeCategory;
