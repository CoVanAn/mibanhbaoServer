import prisma from "../../config/prisma.js";

// POST /api/product/:id/categories
export const setProductCategories = async (req, res) => {
  try {
    const pid = Number(req.params.id);
    if (!pid) return res.status(400).json({ message: "invalid id" });

    const { categoryIds } = req.body;
    if (!Array.isArray(categoryIds)) {
      return res.status(400).json({ message: "categoryIds must be array" });
    }

    const existing = await prisma.product.findUnique({ where: { id: pid } });
    if (!existing)
      return res.status(404).json({ message: "Product not found" });

    // Validate categories exist
    if (categoryIds.length > 0) {
      const categories = await prisma.category.findMany({
        where: { id: { in: categoryIds } },
      });
      if (categories.length !== categoryIds.length) {
        return res.status(400).json({ message: "Some categories not found" });
      }
    }

    // Clear and recreate links
    await prisma.productCategory.deleteMany({ where: { productId: pid } });
    if (categoryIds.length > 0) {
      await prisma.productCategory.createMany({
        data: categoryIds.map((cid) => ({ productId: pid, categoryId: cid })),
      });
    }

    return res.json({ success: true, message: "Categories updated" });
  } catch (err) {
    console.error("setProductCategories error:", err);
    return res.status(500).json({ message: "error" });
  }
};

// POST /api/product/:id/category/:categoryId
export const addProductCategory = async (req, res) => {
  try {
    const pid = Number(req.params.id);
    const cid = Number(req.params.categoryId);
    if (!pid || !cid)
      return res.status(400).json({ message: "invalid id or categoryId" });

    const [product, category] = await Promise.all([
      prisma.product.findUnique({ where: { id: pid } }),
      prisma.category.findUnique({ where: { id: cid } }),
    ]);
    if (!product) return res.status(404).json({ message: "Product not found" });
    if (!category)
      return res.status(404).json({ message: "Category not found" });

    // Check if link already exists
    const existing = await prisma.productCategory.findUnique({
      where: { productId_categoryId: { productId: pid, categoryId: cid } },
    });
    if (existing) {
      return res.status(400).json({ message: "Link already exists" });
    }

    await prisma.productCategory.create({
      data: { productId: pid, categoryId: cid },
    });

    return res.json({ success: true, message: "Category added" });
  } catch (err) {
    console.error("addProductCategory error:", err);
    return res.status(500).json({ message: "error" });
  }
};

// DELETE /api/product/:id/category/:categoryId
export const removeProductCategoryLink = async (req, res) => {
  try {
    const pid = Number(req.params.id);
    const cid = Number(req.params.categoryId);
    if (!pid || !cid)
      return res.status(400).json({ message: "invalid id or categoryId" });

    await prisma.productCategory.deleteMany({
      where: { productId: pid, categoryId: cid },
    });

    return res.json({ success: true, message: "Category link removed" });
  } catch (err) {
    console.error("removeProductCategoryLink error:", err);
    return res.status(500).json({ message: "error" });
  }
};
