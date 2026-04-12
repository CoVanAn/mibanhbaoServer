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
    return { valid: false, discount: 0, message: "Mã giảm giá đã bị vô hiệu hóa" };
  }

  if (coupon.startsAt && coupon.startsAt > now) {
    return { valid: false, discount: 0, message: "Mã giảm giá chưa đến thời gian áp dụng" };
  }

  if (coupon.endsAt && coupon.endsAt < now) {
    return { valid: false, discount: 0, message: "Mã giảm giá đã hết hạn" };
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
      message: "Mã giảm giá đã đạt giới hạn sử dụng",
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
        message: "Bạn đã đạt giới hạn sử dụng mã giảm giá này",
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
