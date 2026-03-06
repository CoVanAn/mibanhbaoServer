import prisma from "../../config/prisma.js";
import { getOrCreateCart } from "../cart/cartHelpers.js";
import { validateCoupon } from "../../utils/promotionHelpers.js";

/**
 * Compute cart subtotal from cart items.
 * @param {Array} items  - cart.items[]
 * @returns {number}
 */
function computeSubtotal(items) {
  return items.reduce((sum, item) => {
    const price = item.unitPrice ? parseFloat(item.unitPrice) : 0;
    return sum + price * item.quantity;
  }, 0);
}

/**
 * POST /api/coupon/validate
 * Preview whether a coupon code is valid and how much discount it gives.
 * Accepts both authenticated users and guests.
 * Body: { code: string, subtotal?: number }
 */
export async function validateCouponCode(req, res) {
  try {
    const { code, subtotal = 0 } = req.body;
    const userId = req.user?.id ?? null;

    const coupon = await prisma.coupon.findUnique({ where: { code } });
    if (!coupon) {
      return res
        .status(404)
        .json({ success: false, message: "Coupon not found" });
    }

    const result = await validateCoupon(coupon, subtotal, userId);

    return res.json({
      success: result.valid,
      message: result.message ?? "Coupon is valid",
      data: result.valid
        ? {
            code: coupon.code,
            type: coupon.type,
            value: coupon.value,
            discountAmount: result.discount,
          }
        : null,
    });
  } catch (err) {
    console.error("validateCouponCode error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
}

/**
 * POST /api/coupon/apply
 * Apply a coupon code to the current cart.
 * Body: { code: string }
 */
export async function applyCoupon(req, res) {
  try {
    const { code } = req.body;
    const userId = req.user?.id ?? null;
    const guestToken = req.cookies?.guestToken ?? req.body.guestToken ?? null;

    const coupon = await prisma.coupon.findUnique({ where: { code } });
    if (!coupon) {
      return res
        .status(404)
        .json({ success: false, message: "Coupon not found" });
    }

    // Load cart & compute subtotal
    const cart = await getOrCreateCart(userId, guestToken);
    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    const subtotal = computeSubtotal(cart.items);
    const result = await validateCoupon(coupon, subtotal, userId);

    if (!result.valid) {
      return res.status(400).json({ success: false, message: result.message });
    }

    // Attach coupon to cart
    await prisma.cart.update({
      where: { id: cart.id },
      data: { couponId: coupon.id },
    });

    return res.json({
      success: true,
      message: "Coupon applied",
      data: {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        discountAmount: result.discount,
        subtotal,
        total: subtotal - result.discount,
      },
    });
  } catch (err) {
    console.error("applyCoupon error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
}

/**
 * DELETE /api/coupon/remove
 * Remove the applied coupon from the current cart.
 */
export async function removeCoupon(req, res) {
  try {
    const userId = req.user?.id ?? null;
    const guestToken = req.cookies?.guestToken ?? req.body?.guestToken ?? null;

    const cart = await getOrCreateCart(userId, guestToken);
    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });
    }

    if (!cart.couponId) {
      return res
        .status(400)
        .json({ success: false, message: "No coupon applied to cart" });
    }

    await prisma.cart.update({
      where: { id: cart.id },
      data: { couponId: null },
    });

    return res.json({ success: true, message: "Coupon removed from cart" });
  } catch (err) {
    console.error("removeCoupon error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
}
