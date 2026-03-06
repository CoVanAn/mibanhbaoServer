import prisma from "../config/prisma.js";

/**
 * Get all currently active promotions (within date range & isActive).
 */
export async function getActivePromotions() {
  const now = new Date();
  // Prisma does not support comparing two fields (usedCount < maxUses) in where,
  // so we post-filter in application code.
  const all = await prisma.promotion.findMany({
    where: {
      isActive: true,
      startsAt: { lte: now },
      endsAt: { gte: now },
    },
    include: {
      categories: { select: { categoryId: true } },
      products: { select: { productId: true } },
      variants: { select: { variantId: true } },
    },
  });
  return all.filter((p) => p.maxUses === null || p.usedCount < p.maxUses);
}

/**
 * Get active promotions that apply to a specific variant.
 * Checks: isGlobal OR variant-level OR product-level OR category-level match.
 *
 * @param {number} variantId
 * @param {number} productId
 * @param {number[]} categoryIds  - category IDs the product belongs to
 * @returns {Promise<Array>}
 */
export async function getActivePromotionsForVariant(
  variantId,
  productId,
  categoryIds = [],
) {
  const now = new Date();
  return prisma.promotion.findMany({
    where: {
      isActive: true,
      startsAt: { lte: now },
      endsAt: { gte: now },
      OR: [
        { isGlobal: true },
        { variants: { some: { variantId } } },
        { products: { some: { productId } } },
        { categories: { some: { categoryId: { in: categoryIds } } } },
      ],
    },
  });
}

/**
 * Compute discount amount from a promotion's type/value applied on a price.
 *
 * @param {{ type: "PERCENT"|"FIXED", value: number }} promotion
 * @param {number} price  - unit price of the item (as a number)
 * @param {number} qty
 * @returns {number}  - discount amount (positive integer, VND)
 */
export function computePromotionDiscount(promotion, price, qty = 1) {
  const lineTotal = price * qty;
  if (promotion.type === "PERCENT") {
    return Math.floor(lineTotal * (promotion.value / 100));
  }
  // FIXED: discount per unit × qty, capped at lineTotal
  return Math.min(promotion.value * qty, lineTotal);
}

/**
 * Find the best (highest) discount from a list of promotions.
 *
 * @param {Array} promotions
 * @param {number} price
 * @param {number} qty
 * @returns {{ promotion: object|null, discountAmount: number }}
 */
export function bestPromotion(promotions, price, qty = 1) {
  if (!promotions || promotions.length === 0) {
    return { promotion: null, discountAmount: 0 };
  }

  let best = null;
  let bestAmount = 0;

  for (const p of promotions) {
    const amount = computePromotionDiscount(p, price, qty);
    if (amount > bestAmount) {
      bestAmount = amount;
      best = p;
    }
  }

  return { promotion: best, discountAmount: bestAmount };
}

/**
 * Validate and compute a coupon discount against a subtotal.
 * Returns { valid: boolean, discount: number, message?: string }
 *
 * @param {object} coupon  - Coupon record from DB
 * @param {number} subtotal  - Cart subtotal in VND
 * @param {number|null} userId  - null for guest
 */
export async function validateCoupon(coupon, subtotal, userId = null) {
  const now = new Date();

  if (!coupon.isActive) {
    return { valid: false, discount: 0, message: "Coupon is inactive" };
  }

  if (coupon.startsAt && coupon.startsAt > now) {
    return { valid: false, discount: 0, message: "Coupon not yet valid" };
  }

  if (coupon.endsAt && coupon.endsAt < now) {
    return { valid: false, discount: 0, message: "Coupon has expired" };
  }

  if (coupon.minSubtotal && subtotal < coupon.minSubtotal) {
    return {
      valid: false,
      discount: 0,
      message: `Minimum order subtotal is ${coupon.minSubtotal.toLocaleString()} VND`,
    };
  }

  if (
    coupon.maxRedemptions !== null &&
    coupon.usedCount >= coupon.maxRedemptions
  ) {
    return {
      valid: false,
      discount: 0,
      message: "Coupon has reached its usage limit",
    };
  }

  // Per-user limit
  if (userId && coupon.perUserLimit) {
    const userCount = await prisma.couponRedemption.count({
      where: {
        couponId: coupon.id,
        userId,
        status: "ACTIVE",
      },
    });
    if (userCount >= coupon.perUserLimit) {
      return {
        valid: false,
        discount: 0,
        message: "You have reached the usage limit for this coupon",
      };
    }
  }

  // Compute discount
  let discount;
  if (coupon.type === "PERCENT") {
    discount = Math.floor(subtotal * (coupon.value / 100));
  } else {
    discount = Math.min(coupon.value, subtotal);
  }

  return { valid: true, discount };
}
