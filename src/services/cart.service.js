import prisma from "../config/prisma.js";

/**
 * Get or create cart for user or guest.
 * @param {number|null} userId
 * @param {string|null} guestToken
 */
export async function getOrCreateCart(userId, guestToken) {
  if (!userId && !guestToken) {
    throw new Error("ID người dùng hoặc token khách hàng phải được cung cấp");
  }

  // Auto-merge if both userId and guestToken are present.
  if (userId && guestToken) {
    const guestCart = await prisma.cart.findFirst({
      where: { guestToken },
      include: { items: true },
    });

    if (guestCart && guestCart.items.length > 0) {
      return mergeGuestCartToUser(userId, guestToken);
    }
  }

  const whereClause = userId ? { userId } : { guestToken };

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
 * Merge guest cart into user cart after login.
 * @param {number} userId
 * @param {string} guestToken
 */
export async function mergeGuestCartToUser(userId, guestToken) {
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

  for (const guestItem of guestCart.items) {
    const existingItem = userCart.items.find(
      (item) => item.variantId === guestItem.variantId,
    );

    if (existingItem) {
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + guestItem.quantity,
        },
      });
    } else {
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

  await prisma.cart.delete({
    where: { id: guestCart.id },
  });

  return getOrCreateCart(userId, null);
}
