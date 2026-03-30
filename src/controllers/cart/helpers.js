import prisma from "../../config/prisma.js";
import {
  getOrCreateCart,
  mergeGuestCartToUser,
} from "../../services/cart.service.js";

export { getOrCreateCart, mergeGuestCartToUser };

/**
 * Calculate cart totals
 * @param {Array} items - Cart items with prices
 * @returns {Object} Totals object
 */
export function calculateCartTotals(items) {
  let subtotal = 0;
  let totalItems = 0;

  items.forEach((item) => {
    const price = item.unitPrice || item.variant?.prices?.[0]?.amount || 0;
    subtotal += Number(price) * item.quantity;
    totalItems += item.quantity;
  });

  return {
    subtotal: Number(subtotal.toFixed(2)),
    totalItems,
    currency: "VND",
  };
}

/**
 * Validate cart item availability
 * @param {number} variantId - Variant ID
 * @param {number} quantity - Requested quantity
 * @returns {Promise<Object>} Validation result
 */
export async function validateCartItem(variantId, quantity) {
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: {
      product: { select: { isActive: true } },
      inventory: true,
      prices: {
        where: { isActive: true },
        orderBy: { id: "desc" },
        take: 1,
      },
    },
  });

  if (!variant) {
    return { valid: false, error: "Sản phẩm không tồn tại" };
  }

  if (!variant.isActive || !variant.product.isActive) {
    return { valid: false, error: "Sản phẩm không còn sẵn có" };
  }

  if (variant.inventory && variant.inventory.quantity < quantity) {
    return {
      valid: false,
      error: `Chỉ còn ${variant.inventory.quantity} sản phẩm trong kho`,
    };
  }

  const currentPrice = variant.prices[0]?.amount || null;

  return {
    valid: true,
    variant,
    currentPrice,
  };
}

/**
 * Format cart response for API
 * @param {Object} cart - Cart with items
 * @returns {Object} Formatted cart
 */
export function formatCartResponse(cart) {
  const formattedItems = cart.items.map((item) => ({
    id: item.id,
    productId: item.productId,
    productName: item.product.name,
    productSlug: item.product.slug,
    productImage: item.product.media?.[0]?.url || null,
    variantId: item.variantId,
    variantName: item.variant.name,
    variantSku: item.variant.sku,
    quantity: item.quantity,
    unitPrice: item.unitPrice || item.variant.prices?.[0]?.amount || 0,
    subtotal:
      (item.unitPrice || item.variant.prices?.[0]?.amount || 0) * item.quantity,
    inStock: item.variant.inventory?.quantity || 0,
    isAvailable: item.product.isActive && item.variant.isActive,
  }));

  const totals = calculateCartTotals(cart.items);

  return {
    id: cart.id,
    items: formattedItems,
    coupon: cart.coupon
      ? {
          code: cart.coupon.code,
          type: cart.coupon.type,
          value: cart.coupon.value,
        }
      : null,
    ...totals,
    updatedAt: cart.updatedAt,
  };
}
