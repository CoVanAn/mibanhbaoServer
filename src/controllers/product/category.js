import prisma from "../../config/prisma.js";

// POST /api/product/:id/categories
export const setProductCategories = async (req, res, next) => {
  try {
    const pid = req.params.id;

    const { categoryIds } = req.body;
    if (!Array.isArray(categoryIds)) {
      return res.status(400).json({ message: "categoryIds phải là mảng" });
    }

    const existing = await prisma.product.findUnique({ where: { id: pid } });
    if (!existing)
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

    // Validate categories exist
    if (categoryIds.length > 0) {
      const categories = await prisma.category.findMany({
        where: { id: { in: categoryIds } },
      });
      if (categories.length !== categoryIds.length) {
        return res.status(400).json({ message: "Không tìm thấy một số danh mục" });
      }
    }

    // Clear and recreate links
    await prisma.productCategory.deleteMany({ where: { productId: pid } });
    if (categoryIds.length > 0) {
      await prisma.productCategory.createMany({
        data: categoryIds.map((cid) => ({ productId: pid, categoryId: cid })),
      });
    }

    return res.json({ success: true, message: "Cập nhật danh mục thành công" });
  } catch (err) {
    return next(err);
  }
};

// POST /api/product/:id/category/:categoryId
export const addProductCategory = async (req, res, next) => {
  try {
    const pid = req.params.id;
    const cid = req.params.categoryId;

    const [product, category] = await Promise.all([
      prisma.product.findUnique({ where: { id: pid } }),
      prisma.category.findUnique({ where: { id: cid } }),
    ]);
    if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    if (!category)
      return res.status(404).json({ message: "Không tìm thấy danh mục" });

    // Check if link already exists
    const existing = await prisma.productCategory.findUnique({
      where: { productId_categoryId: { productId: pid, categoryId: cid } },
    });
    if (existing) {
      return res.status(400).json({ message: "Liên kết đã tồn tại" });
    }

    await prisma.productCategory.create({
      data: { productId: pid, categoryId: cid },
    });

    return res.json({ success: true, message: "Thêm danh mục thành công" });
  } catch (err) {
    return next(err);
  }
};

// DELETE /api/product/:id/category/:categoryId
export const removeProductCategoryLink = async (req, res, next) => {
  try {
    const pid = req.params.id;
    const cid = req.params.categoryId;

    await prisma.productCategory.deleteMany({
      where: { productId: pid, categoryId: cid },
    });

    return res.json({ success: true, message: "Đã gỡ liên kết danh mục" });
  } catch (err) {
    return next(err);
  }
};
