import prisma from "../config/prisma.js";

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
