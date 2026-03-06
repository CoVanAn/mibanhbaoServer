import prisma from "../../config/prisma.js";

/**
 * POST /api/promotion/:id/targets
 * Add categories / products / variants to a promotion (ADMIN)
 * Body: { categoryIds?: number[], productIds?: number[], variantIds?: number[] }
 */
export async function addPromotionTargets(req, res) {
  try {
    const { id } = req.params;
    const { categoryIds = [], productIds = [], variantIds = [] } = req.body;

    // Verify promotion exists
    const promotion = await prisma.promotion.findUnique({ where: { id } });
    if (!promotion) {
      return res
        .status(404)
        .json({ success: false, message: "Promotion not found" });
    }

    await prisma.$transaction([
      // upsert each category link
      ...categoryIds.map((categoryId) =>
        prisma.promotionCategory.upsert({
          where: { promotionId_categoryId: { promotionId: id, categoryId } },
          update: {},
          create: { promotionId: id, categoryId },
        }),
      ),
      // upsert each product link
      ...productIds.map((productId) =>
        prisma.promotionProduct.upsert({
          where: { promotionId_productId: { promotionId: id, productId } },
          update: {},
          create: { promotionId: id, productId },
        }),
      ),
      // upsert each variant link
      ...variantIds.map((variantId) =>
        prisma.promotionVariant.upsert({
          where: { promotionId_variantId: { promotionId: id, variantId } },
          update: {},
          create: { promotionId: id, variantId },
        }),
      ),
    ]);

    return res.json({ success: true, message: "Targets added" });
  } catch (err) {
    console.error("addPromotionTargets error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
}

/**
 * DELETE /api/promotion/:id/targets
 * Remove categories / products / variants from a promotion (ADMIN)
 * Body: { categoryIds?: number[], productIds?: number[], variantIds?: number[] }
 */
export async function removePromotionTargets(req, res) {
  try {
    const { id } = req.params;
    const { categoryIds = [], productIds = [], variantIds = [] } = req.body;

    const promotion = await prisma.promotion.findUnique({ where: { id } });
    if (!promotion) {
      return res
        .status(404)
        .json({ success: false, message: "Promotion not found" });
    }

    await prisma.$transaction([
      categoryIds.length > 0
        ? prisma.promotionCategory.deleteMany({
            where: { promotionId: id, categoryId: { in: categoryIds } },
          })
        : prisma.$queryRaw`SELECT 1`,

      productIds.length > 0
        ? prisma.promotionProduct.deleteMany({
            where: { promotionId: id, productId: { in: productIds } },
          })
        : prisma.$queryRaw`SELECT 1`,

      variantIds.length > 0
        ? prisma.promotionVariant.deleteMany({
            where: { promotionId: id, variantId: { in: variantIds } },
          })
        : prisma.$queryRaw`SELECT 1`,
    ]);

    return res.json({ success: true, message: "Targets removed" });
  } catch (err) {
    console.error("removePromotionTargets error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
}
