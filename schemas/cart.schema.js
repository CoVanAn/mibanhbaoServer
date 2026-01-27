/**
 * Cart Validation Schemas
 * Using Zod for request validation
 */

import { z } from "zod";

/**
 * Schema for adding item to cart
 * POST /api/cart/items
 */
export const addToCartSchema = z.object({
  variantId: z
    .number({ required_error: "Variant ID is required" })
    .int("Variant ID must be an integer")
    .positive("Variant ID must be positive"),
  productId: z
    .number({ required_error: "Product ID is required" })
    .int("Product ID must be an integer")
    .positive("Product ID must be positive"),
  quantity: z
    .number()
    .int("Quantity must be an integer")
    .min(1, "Quantity must be at least 1")
    .max(999, "Quantity cannot exceed 999")
    .default(1),
  guestToken: z.string().optional(),
});

/**
 * Schema for updating cart item quantity
 * PUT /api/cart/items/:itemId
 */
export const updateCartItemSchema = z.object({
  quantity: z
    .number({ required_error: "Quantity is required" })
    .int("Quantity must be an integer")
    .min(0, "Quantity must be at least 0")
    .max(999, "Quantity cannot exceed 999"),
});

/**
 * Schema for applying coupon code
 * POST /api/cart/coupon
 */
export const applyCouponSchema = z.object({
  couponCode: z
    .string({ required_error: "Coupon code is required" })
    .trim()
    .toUpperCase()
    .min(3, "Coupon code must be at least 3 characters")
    .max(50, "Coupon code cannot exceed 50 characters"),
});

/**
 * Schema for merging guest cart to user cart
 * POST /api/cart/merge
 */
export const mergeCartSchema = z.object({
  guestToken: z.string({ required_error: "Guest token is required" }),
});

/**
 * Schema for cart item ID parameter
 * Used in routes: /:itemId
 */
export const cartItemIdSchema = z.object({
  itemId: z.coerce
    .number()
    .int("Cart item ID must be an integer")
    .positive("Cart item ID must be positive"),
});
