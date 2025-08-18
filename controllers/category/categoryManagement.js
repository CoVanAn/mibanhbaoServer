import prisma from "../../config/prisma.js";
import { uniqueCategorySlug, validateNoCycle } from "./categoryHelpers.js";

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
    console.error("removeCategory error:", err);
    // If constraint errors occur, surface as 400
    return res.status(400).json({ message: "cannot delete category" });
  }
};
