import prisma from "../../config/prisma.js";

/**
 * Get or create cart for user or guest
 * @param {number|null} userId - User ID (null for guest)
 * @param {string|null} guestToken - Guest token (null for authenticated user)
 * @returns {Promise<Object>} Cart object with items
 */
export async function getOrCreateCart(userId, guestToken) {
  console.log("=== GET OR CREATE CART DEBUG ===");
  console.log("userId:", userId);
  console.log("guestToken:", guestToken);

  if (!userId && !guestToken) {
    throw new Error("Either userId or guestToken must be provided");
  }

  // Auto-merge if both userId and guestToken present
  if (userId && guestToken) {
    console.log("Both userId and guestToken present - checking for merge");

    // Check if guest cart exists with items
    const guestCart = await prisma.cart.findFirst({
      where: { guestToken },
      include: { items: true },
    });

    if (guestCart && guestCart.items.length > 0) {
      console.log(
        `Found guest cart ${guestCart.id} with ${guestCart.items.length} items - merging...`,
      );
      // Merge and return the merged cart
      return await mergeGuestCartToUser(userId, guestToken);
    }

    console.log("No guest cart to merge, proceeding with user cart");
  }

  // Find existing cart
  const whereClause = userId ? { userId } : { guestToken };
  console.log("Finding cart with where clause:", whereClause);

  let cart = await prisma.cart.findFirst({
    where: whereClause,
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              isActive: true,
              media: {
                take: 1,
                orderBy: { position: "asc" },
                select: { url: true },
              },
            },
          },
          variant: {
            select: {
              id: true,
              name: true,
              sku: true,
              isActive: true,
              prices: {
                where: { isActive: true },
                orderBy: { id: "desc" },
                take: 1,
              },
              inventory: true,
            },
          },
        },
      },
      coupon: true,
    },
  });

  console.log(
    "Found cart:",
    cart ? `ID ${cart.id} with ${cart.items?.length || 0} items` : "null",
  );

  // Create new cart if doesn't exist
  if (!cart) {
    cart = await prisma.cart.create({
      data: userId ? { userId } : { guestToken },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                isActive: true,
                media: {
                  take: 1,
                  orderBy: { position: "asc" },
                  select: { url: true },
                },
              },
            },
            variant: {
              select: {
                id: true,
                name: true,
                sku: true,
                isActive: true,
                prices: {
                  where: { isActive: true },
                  orderBy: { id: "desc" },
                  take: 1,
                },
                inventory: true,
              },
            },
          },
        },
        coupon: true,
      },
    });
  }

  return cart;
}

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
 * Merge guest cart into user cart after login
 * @param {number} userId - User ID
 * @param {string} guestToken - Guest token
 * @returns {Promise<Object>} Merged cart
 */
export async function mergeGuestCartToUser(userId, guestToken) {
  // Get both carts
  const [userCart, guestCart] = await Promise.all([
    getOrCreateCart(userId, null),
    prisma.cart.findFirst({
      where: { guestToken },
      include: { items: true },
    }),
  ]);

  if (!guestCart || guestCart.items.length === 0) {
    return userCart;
  }

  // Merge items
  for (const guestItem of guestCart.items) {
    const existingItem = userCart.items.find(
      (item) => item.variantId === guestItem.variantId,
    );

    if (existingItem) {
      // Update quantity
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + guestItem.quantity,
        },
      });
    } else {
      // Add new item
      await prisma.cartItem.create({
        data: {
          cartId: userCart.id,
          productId: guestItem.productId,
          variantId: guestItem.variantId,
          quantity: guestItem.quantity,
          unitPrice: guestItem.unitPrice,
        },
      });
    }
  }

  // Delete guest cart
  await prisma.cart.delete({
    where: { id: guestCart.id },
  });

  // Return updated user cart
  return getOrCreateCart(userId, null);
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
    return { valid: false, error: "Variant not found" };
  }

  if (!variant.isActive || !variant.product.isActive) {
    return { valid: false, error: "Product is no longer available" };
  }

  if (variant.inventory && variant.inventory.quantity < quantity) {
    return {
      valid: false,
      error: `Only ${variant.inventory.quantity} items available in stock`,
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
