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
    .number({ required_error: "ID biến thể là bắt buộc" })
    .int("ID biến thể phải là số nguyên")
    .positive("ID biến thể phải lớn hơn 0"),
  productId: z
    .number({ required_error: "ID sản phẩm là bắt buộc" })
    .int("ID sản phẩm phải là số nguyên")
    .positive("ID sản phẩm phải lớn hơn 0"),
  quantity: z
    .number()
    .int("Số lượng phải là số nguyên")
    .min(1, "Số lượng phải ít nhất là 1")
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
    .number({ required_error: "Số lượng là bắt buộc" })
    .int("Số lượng phải là số nguyên")
    .min(0, "Số lượng phải từ 0 trở lên")
    .max(999, "Quantity cannot exceed 999"),
});

/**
 * Schema for applying coupon code
 * POST /api/cart/coupon
 */
export const applyCouponSchema = z.object({
  couponCode: z
    .string({ required_error: "Bắt buộc nhập mã giảm giá" })
    .trim()
    .toUpperCase()
    .min(3, "Mã giảm giá phải có ít nhất 3 ký tự")
    .max(50, "Coupon code cannot exceed 50 characters"),
});

/**
 * Schema for merging guest cart to user cart
 * POST /api/cart/merge
 */
export const mergeCartSchema = z.object({
  guestToken: z.string({ required_error: "Guest token là bắt buộc" }),
});

/**
 * Schema for cart item ID parameter
 * Used in routes: /:itemId
 */
export const cartItemIdSchema = z.object({
  itemId: z.coerce
    .number()
    .int("ID mặt hàng trong giỏ phải là số nguyên")
    .positive("ID mặt hàng trong giỏ phải lớn hơn 0"),
});
