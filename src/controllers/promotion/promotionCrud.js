import prisma from "../../config/prisma.js";

/**
 * POST /api/promotion
 * Create a new promotion (ADMIN only)
 */
export async function createPromotion(req, res) {
  try {
    const {
      name,
      type,
      value,
      startsAt,
      endsAt,
      minSubtotal,
      maxUses,
      isActive,
      isGlobal,
    } = req.body;

    const promotion = await prisma.promotion.create({
      data: {
        name,
        type,
        value,
        startsAt,
        endsAt,
        minSubtotal: minSubtotal ?? null,
        maxUses: maxUses ?? null,
        isActive: isActive ?? true,
        isGlobal: isGlobal ?? false,
      },
    });

    return res.status(201).json({ success: true, data: promotion });
  } catch (err) {
    console.error("createPromotion error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
}

/**
 * GET /api/promotion
 * List all promotions with pagination (ADMIN/STAFF)
 */
export async function listPromotions(req, res) {
  try {
    const { page = 1, limit = 20, isActive, isGlobal } = req.query;

    const where = {};
    if (isActive !== undefined) where.isActive = isActive;
    if (isGlobal !== undefined) where.isGlobal = isGlobal;

    const [total, items] = await Promise.all([
      prisma.promotion.count({ where }),
      prisma.promotion.findMany({
        where,
        orderBy: { startsAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          categories: { select: { categoryId: true } },
          products: { select: { productId: true } },
          variants: { select: { variantId: true } },
        },
      }),
    ]);

    return res.json({
      success: true,
      data: items,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("listPromotions error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
}

/**
 * GET /api/promotion/:id
 * Get single promotion (ADMIN/STAFF)
 */
export async function getPromotion(req, res) {
  try {
    const { id } = req.params;
    const promotion = await prisma.promotion.findUnique({
      where: { id },
      include: {
        categories: { select: { categoryId: true } },
        products: { select: { productId: true } },
        variants: { select: { variantId: true } },
      },
    });

    if (!promotion) {
      return res
        .status(404)
        .json({ success: false, message: "Promotion not found" });
    }

    return res.json({ success: true, data: promotion });
  } catch (err) {
    console.error("getPromotion error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
}

/**
 * PATCH /api/promotion/:id
 * Update promotion (ADMIN only)
 */
export async function updatePromotion(req, res) {
  try {
    const { id } = req.params;
    const data = req.body;

    const promotion = await prisma.promotion.update({
      where: { id },
      data,
    });

    return res.json({ success: true, data: promotion });
  } catch (err) {
    if (err.code === "P2025") {
      return res
        .status(404)
        .json({ success: false, message: "Promotion not found" });
    }
    console.error("updatePromotion error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
}

/**
 * DELETE /api/promotion/:id
 * Delete promotion (ADMIN only)
 */
export async function deletePromotion(req, res) {
  try {
    const { id } = req.params;
    await prisma.promotion.delete({ where: { id } });
    return res.json({ success: true, message: "Promotion deleted" });
  } catch (err) {
    if (err.code === "P2025") {
      return res
        .status(404)
        .json({ success: false, message: "Promotion not found" });
    }
    console.error("deletePromotion error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
}

/**
 * GET /api/promotion/active
 * Get active promotions for a given productId and/or variantId (public)
 */
export async function getActivePromotions(req, res) {
  try {
    const productId = req.query.productId
      ? parseInt(req.query.productId, 10)
      : null;
    const variantId = req.query.variantId
      ? parseInt(req.query.variantId, 10)
      : null;
    const now = new Date();

    const where = {
      isActive: true,
      startsAt: { lte: now },
      endsAt: { gte: now },
    };

    // If neither productId nor variantId provided, return global promotions only
    if (!productId && !variantId) {
      where.isGlobal = true;
    } else {
      // Fetch category IDs for the product
      let categoryIds = [];
      if (productId) {
        const cats = await prisma.productCategory.findMany({
          where: { productId },
          select: { categoryId: true },
        });
        categoryIds = cats.map((c) => c.categoryId);
      }

      const orConditions = [{ isGlobal: true }];
      if (variantId) orConditions.push({ variants: { some: { variantId } } });
      if (productId) orConditions.push({ products: { some: { productId } } });
      if (categoryIds.length > 0) {
        orConditions.push({
          categories: { some: { categoryId: { in: categoryIds } } },
        });
      }

      where.OR = orConditions;
    }

    const promotions = await prisma.promotion.findMany({
      where,
      orderBy: { value: "desc" },
    });

    return res.json({ success: true, data: promotions });
  } catch (err) {
    console.error("getActivePromotions error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
}
