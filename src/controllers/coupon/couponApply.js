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
 * This is reused by /api/cart/coupon endpoint.
 */
export async function applyCouponToCart({
  code,
  userId = null,
  guestToken = null,
  messages = {},
}) {
  const mergedMessages = {
    couponNotFound: "Mã giảm giá không tồn tại",
    cartEmpty: "Giỏ hàng trống",
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
 * This is reused by /api/cart/coupon endpoint.
 */
export async function removeCouponFromCart({
  userId = null,
  guestToken = null,
  requireExistingCoupon = true,
  messages = {},
}) {
  const mergedMessages = {
    cartNotFound: "Giỏ hàng không tồn tại",
    noCouponApplied: "Không có mã giảm giá nào được áp dụng",
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
    const mergedMessages = {
      couponNotFound: "Mã giảm giá không tồn tại",
      couponValid: "Mã giảm giá hợp lệ",
    };

    const coupon = await prisma.coupon.findUnique({ where: { code } });
    if (!coupon) {
      return res
        .status(404)
        .json({ success: false, message: mergedMessages.couponNotFound });
    }

    const result = await validateCoupon(coupon, subtotal, userId);

    return res.json({
      success: result.valid,
      message: result.message ?? mergedMessages.couponValid,
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
    console.error("Lỗi khi xác thực mã giảm giá:", err);
    return res
      .status(500)
      .json({ success: false, message: "Lỗi máy chủ nội bộ" });
  }
}
