import prisma from "../../config/prisma.js";
import { getOrCreateCart } from "../cart/cartHelpers.js";
import { validateCoupon } from "../../utils/couponHelpers.js";

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
 * Shared business logic for attaching a coupon to current cart.
 * This is reused by both /api/coupon/apply and /api/cart/coupon endpoints.
 */
export async function applyCouponToCart({
  code,
  userId = null,
  guestToken = null,
  messages = {},
}) {
  const mergedMessages = {
    couponNotFound: "Coupon not found",
    cartEmpty: "Cart is empty",
    ...messages,
  };

  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon) {
    return {
      ok: false,
      status: 404,
      message: mergedMessages.couponNotFound,
    };
  }

  const cart = await getOrCreateCart(userId, guestToken);
  if (!cart || !cart.items || cart.items.length === 0) {
    return { ok: false, status: 400, message: mergedMessages.cartEmpty };
  }

  const subtotal = computeSubtotal(cart.items);
  const validation = await validateCoupon(coupon, subtotal, userId);

  if (!validation.valid) {
    return { ok: false, status: 400, message: validation.message };
  }

  await prisma.cart.update({
    where: { id: cart.id },
    data: { couponId: coupon.id },
  });

  const updatedCart = await getOrCreateCart(userId, guestToken);

  return {
    ok: true,
    coupon,
    discount: validation.discount,
    subtotal,
    total: subtotal - validation.discount,
    cartId: cart.id,
    updatedCart,
  };
}

/**
 * Shared business logic for removing coupon from current cart.
 * This is reused by both /api/coupon/remove and /api/cart/coupon endpoints.
 */
export async function removeCouponFromCart({
  userId = null,
  guestToken = null,
  requireExistingCoupon = true,
  messages = {},
}) {
  const mergedMessages = {
    cartNotFound: "Cart not found",
    noCouponApplied: "No coupon applied to cart",
    ...messages,
  };

  const cart = await getOrCreateCart(userId, guestToken);
  if (!cart) {
    return { ok: false, status: 404, message: mergedMessages.cartNotFound };
  }

  if (requireExistingCoupon && !cart.couponId) {
    return { ok: false, status: 400, message: mergedMessages.noCouponApplied };
  }

  if (cart.couponId) {
    await prisma.cart.update({
      where: { id: cart.id },
      data: { couponId: null },
    });
  }

  const updatedCart = await getOrCreateCart(userId, guestToken);

  return {
    ok: true,
    cartId: cart.id,
    updatedCart,
  };
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
    const result = await applyCouponToCart({ code, userId, guestToken });

    if (!result.ok) {
      return res
        .status(result.status)
        .json({ success: false, message: result.message });
    }

    return res.json({
      success: true,
      message: "Coupon applied",
      data: {
        code: result.coupon.code,
        type: result.coupon.type,
        value: result.coupon.value,
        discountAmount: result.discount,
        subtotal: result.subtotal,
        total: result.total,
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
    const result = await removeCouponFromCart({
      userId,
      guestToken,
      requireExistingCoupon: true,
    });

    if (!result.ok) {
      return res
        .status(result.status)
        .json({ success: false, message: result.message });
    }

    return res.json({ success: true, message: "Coupon removed from cart" });
  } catch (err) {
    console.error("removeCoupon error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
}
