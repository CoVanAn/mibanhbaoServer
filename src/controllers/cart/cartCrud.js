import {
  getOrCreateCart,
  formatCartResponse,
  mergeGuestCartToUser,
} from "./cartHelpers.js";
import {
  applyCouponToCart,
  removeCouponFromCart,
} from "../coupon/couponApply.js";

/**
 * Get current cart
 * GET /api/cart
 */
export async function getCart(req, res, next) {
  try {
    const userId = req.user?.id || null;
    const guestToken = req.cookies.guestToken || req.body.guestToken;

    if (!userId && !guestToken) {
      return res.status(200).json({
        success: true,
        cart: {
          id: null,
          items: [],
          coupon: null,
          subtotal: 0,
          totalItems: 0,
          currency: "VND",
        },
      });
    }

    const cart = await getOrCreateCart(userId, guestToken);

    res.status(200).json({
      success: true,
      cart: formatCartResponse(cart),
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Merge guest cart to user cart after login
 * POST /api/cart/merge
 * Body: { guestToken }
 */
export async function mergeCart(req, res, next) {
  try {
    const userId = req.user?.id;
    const { guestToken } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!guestToken) {
      return res.status(400).json({
        success: false,
        message: "guestToken is required",
      });
    }

    const mergedCart = await mergeGuestCartToUser(userId, guestToken);

    res.status(200).json({
      success: true,
      message: "Carts merged successfully",
      cart: formatCartResponse(mergedCart),
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Apply coupon to cart
 * POST /api/cart/coupon
 * Body: { couponCode }
 */
export async function applyCoupon(req, res, next) {
  try {
    const userId = req.user?.id || null;
    const guestToken = req.cookies.guestToken || req.body.guestToken;
    const { couponCode } = req.body;

    if (!couponCode) {
      return res.status(400).json({
        success: false,
        message: "Coupon code is required",
      });
    }

    const result = await applyCouponToCart({
      code: couponCode,
      userId,
      guestToken,
      messages: {
        couponNotFound: "Invalid coupon code",
      },
    });

    if (!result.ok) {
      return res.status(result.status).json({
        success: false,
        message: result.message,
      });
    }

    res.status(200).json({
      success: true,
      message: "Coupon applied successfully",
      cart: formatCartResponse(result.updatedCart),
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Remove coupon from cart
 * DELETE /api/cart/coupon
 */
export async function removeCoupon(req, res, next) {
  try {
    const userId = req.user?.id || null;
    const guestToken = req.cookies.guestToken || req.body.guestToken;

    const result = await removeCouponFromCart({
      userId,
      guestToken,
      requireExistingCoupon: false,
    });

    if (!result.ok) {
      return res.status(result.status).json({
        success: false,
        message: result.message,
      });
    }

    res.status(200).json({
      success: true,
      message: "Coupon removed",
      cart: formatCartResponse(result.updatedCart),
    });
  } catch (error) {
    return next(error);
  }
}
