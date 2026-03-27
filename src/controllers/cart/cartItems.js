import prisma from "../../config/prisma.js";
import {
  getOrCreateCart,
  validateCartItem,
  formatCartResponse,
} from "./cartHelpers.js";
import { parsePositiveInt } from "../../utils/id.js";

/**
 * Add item to cart
 * POST /api/cart/items
 * Body: { variantId, quantity, productId }
 */
export async function addItemToCart(req, res, next) {
  try {
    const userId = req.user?.id || null;
    const guestToken = req.cookies.guestToken || req.body.guestToken;
    const { variantId, quantity = 1, productId } = req.body;

    // Validation
    if (!variantId || !productId) {
      return res.status(400).json({
        success: false,
        message: "ID biến thể và sản phẩm là bắt buộc",
      });
    }

    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Số lượng phải ít nhất là 1",
      });
    }

    // Validate variant availability
    const validation = await validateCartItem(variantId, quantity);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    // Get or create cart
    const cart = await getOrCreateCart(userId, guestToken);

    // Check if item already exists
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_variantId: {
          cartId: cart.id,
          variantId,
        },
      },
    });

    let cartItem;
    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + quantity;

      // Re-validate with new quantity
      const revalidation = await validateCartItem(variantId, newQuantity);
      if (!revalidation.valid) {
        return res.status(400).json({
          success: false,
          message: revalidation.error,
        });
      }

      cartItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
          unitPrice: validation.currentPrice,
        },
      });
    } else {
      // Create new item
      cartItem = await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          variantId,
          quantity,
          unitPrice: validation.currentPrice,
        },
      });
    }

    // Get updated cart
    const updatedCart = await getOrCreateCart(userId, guestToken);

    res.status(200).json({
      success: true,
      message: existingItem ? "Cart updated" : "Item added to cart",
      cart: formatCartResponse(updatedCart),
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Update cart item quantity
 * PUT /api/cart/items/:itemId
 * Body: { quantity }
 */
export async function updateCartItem(req, res, next) {
  try {
    const userId = req.user?.id || null;
    const guestToken = req.cookies.guestToken || req.body.guestToken;
    const { itemId } = req.params;
    const { quantity } = req.body;
    const parsedItemId = parsePositiveInt(itemId);

    if (!quantity || quantity < 0) {
      return res.status(400).json({
        success: false,
        message: "Số lượng hợp lệ là bắt buộc",
      });
    }

    if (!parsedItemId) {
      return res.status(400).json({
        success: false,
        message: "ID mặt hàng không hợp lệ",
      });
    }

    // Get cart
    const cart = await getOrCreateCart(userId, guestToken);

    // Find item
    const item = await prisma.cartItem.findFirst({
      where: {
        id: parsedItemId,
        cartId: cart.id,
      },
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Mặt hàng trong giỏ hàng không tồn tại",
      });
    }

    // If quantity is 0, delete item
    if (quantity === 0) {
      await prisma.cartItem.delete({
        where: { id: item.id },
      });

      const updatedCart = await getOrCreateCart(userId, guestToken);
      return res.status(200).json({
        success: true,
        message: "Xóa mặt hàng khỏi giỏ hàng",
        cart: formatCartResponse(updatedCart),
      });
    }

    // Validate new quantity
    const validation = await validateCartItem(item.variantId, quantity);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    // Update quantity
    await prisma.cartItem.update({
      where: { id: item.id },
      data: {
        quantity,
        unitPrice: validation.currentPrice,
      },
    });

    const updatedCart = await getOrCreateCart(userId, guestToken);

    res.status(200).json({
      success: true,
      message: "Cập nhật mặt hàng trong giỏ hàng",
      cart: formatCartResponse(updatedCart),
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Remove item from cart
 * DELETE /api/cart/items/:itemId
 */
export async function removeCartItem(req, res, next) {
  try {
    const userId = req.user?.id || null;
    const guestToken = req.cookies.guestToken || req.body.guestToken;
    const { itemId } = req.params;
    const parsedItemId = parsePositiveInt(itemId);

    if (!parsedItemId) {
      return res.status(400).json({
        success: false,
        message: "ID mặt hàng không hợp lệ",
      });
    }

    // Get cart
    const cart = await getOrCreateCart(userId, guestToken);

    // Find and delete item
    const item = await prisma.cartItem.findFirst({
      where: {
        id: parsedItemId,
        cartId: cart.id,
      },
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Mặt hàng trong giỏ hàng không tồn tại",
      });
    }

    await prisma.cartItem.delete({
      where: { id: item.id },
    });

    const updatedCart = await getOrCreateCart(userId, guestToken);

    res.status(200).json({
      success: true,
      message: "Xóa mặt hàng khỏi giỏ hàng",
      cart: formatCartResponse(updatedCart),
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Clear all items from cart
 * DELETE /api/cart/clear
 */
export async function clearCart(req, res, next) {
  try {
    const userId = req.user?.id || null;
    const guestToken = req.cookies.guestToken || req.body.guestToken;

    const cart = await getOrCreateCart(userId, guestToken);

    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    const updatedCart = await getOrCreateCart(userId, guestToken);

    res.status(200).json({
      success: true,
      message: "Giỏ hàng đã được làm trống",
      cart: formatCartResponse(updatedCart),
    });
  } catch (error) {
    return next(error);
  }
}
