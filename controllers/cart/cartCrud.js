import prisma from "../../config/prisma.js";
import {
  getOrCreateCart,
  formatCartResponse,
  mergeGuestCartToUser,
} from "./cartHelpers.js";

/**
 * Get current cart
 * GET /api/cart
 */
export async function getCart(req, res) {
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
    console.error("Error fetching cart:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch cart",
      error: error.message,
    });
  }
}

/**
 * Merge guest cart to user cart after login
 * POST /api/cart/merge
 * Body: { guestToken }
 */
export async function mergeCart(req, res) {
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
    console.error("Error merging carts:", error);
    res.status(500).json({
      success: false,
      message: "Failed to merge carts",
      error: error.message,
    });
  }
}

/**
 * Apply coupon to cart
 * POST /api/cart/coupon
 * Body: { couponCode }
 */
export async function applyCoupon(req, res) {
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

    // Get cart
    const cart = await getOrCreateCart(userId, guestToken);

    // Find coupon
    const coupon = await prisma.coupon.findUnique({
      where: { code: couponCode },
      include: {
        redemptions: true,
      },
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Invalid coupon code",
      });
    }

    if (!coupon.isActive) {
      return res.status(400).json({
        success: false,
        message: "Coupon is not active",
      });
    }

    // Check expiry
    const now = new Date();
    if (coupon.startsAt && now < coupon.startsAt) {
      return res.status(400).json({
        success: false,
        message: "Coupon is not yet valid",
      });
    }

    if (coupon.endsAt && now > coupon.endsAt) {
      return res.status(400).json({
        success: false,
        message: "Coupon has expired",
      });
    }

    // Check redemption limits (based on actual order redemptions)
    if (
      coupon.maxRedemptions &&
      coupon.redemptions.length >= coupon.maxRedemptions
    ) {
      return res.status(400).json({
        success: false,
        message: "Coupon redemption limit reached",
      });
    }

    // Check per-user limit (only for authenticated users)
    if (userId && coupon.perUserLimit) {
      const userRedemptions = await prisma.couponRedemption.count({
        where: {
          couponId: coupon.id,
          userId: userId,
        },
      });

      if (userRedemptions >= coupon.perUserLimit) {
        return res.status(400).json({
          success: false,
          message: "You have reached the redemption limit for this coupon",
        });
      }
    }

    // Check minimum subtotal
    const totals = require("./cartHelpers.js").calculateCartTotals(cart.items);
    if (coupon.minSubtotal && totals.subtotal < coupon.minSubtotal) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount of ${coupon.minSubtotal} ${cart.currency} required`,
      });
    }

    // Apply coupon
    await prisma.cart.update({
      where: { id: cart.id },
      data: { couponId: coupon.id },
    });

    const updatedCart = await getOrCreateCart(userId, guestToken);

    res.status(200).json({
      success: true,
      message: "Coupon applied successfully",
      cart: formatCartResponse(updatedCart),
    });
  } catch (error) {
    console.error("Error applying coupon:", error);
    res.status(500).json({
      success: false,
      message: "Failed to apply coupon",
      error: error.message,
    });
  }
}

/**
 * Remove coupon from cart
 * DELETE /api/cart/coupon
 */
export async function removeCoupon(req, res) {
  try {
    const userId = req.user?.id || null;
    const guestToken = req.cookies.guestToken || req.body.guestToken;

    const cart = await getOrCreateCart(userId, guestToken);

    await prisma.cart.update({
      where: { id: cart.id },
      data: { couponId: null },
    });

    const updatedCart = await getOrCreateCart(userId, guestToken);

    res.status(200).json({
      success: true,
      message: "Coupon removed",
      cart: formatCartResponse(updatedCart),
    });
  } catch (error) {
    console.error("Error removing coupon:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove coupon",
      error: error.message,
    });
  }
}
