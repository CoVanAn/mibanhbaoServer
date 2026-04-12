/**
 * Category Validation Schemas
 * Using Zod for category validation
 */

import { z } from "zod";

/**
 * Schema for creating a category
 * POST /api/category/add
 */
export const createCategorySchema = z.object({
  name: z
    .string({ required_error: "Tên danh mục là bắt buộc" })
    .trim()
    .min(2, "Tên danh mục phải có ít nhất 2 ký tự")
    .max(100, "Tên danh mục không được vượt quá 100 ký tự"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9-]+$/,
      "Slug chỉ được chứa chữ thường, số và dấu gạch ngang",
    )
    .optional(),
  description: z.string().trim().max(500).optional(),
  parentId: z
    .number()
    .int("ID danh mục cha phải là số nguyên")
    .positive("ID danh mục cha phải lớn hơn 0")
    .nullable()
    .optional(),
  position: z.coerce
    .number()
    .int("Vị trí phải là số nguyên")
    .min(0, "Vị trí không thể là số âm")
    .default(0),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
});

/**
 * Schema for updating a category
 * PATCH /api/category/:id
 * PUT /api/category/:id
 */
export const updateCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Tên danh mục phải có ít nhất 2 ký tự")
    .max(100, "Tên danh mục không được vượt quá 100 ký tự")
    .optional(),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9-]+$/,
      "Slug chỉ được chứa chữ thường, số và dấu gạch ngang",
    )
    .optional(),
  description: z.string().trim().max(500).optional(),
  parentId: z
    .number()
    .int("ID danh mục cha phải là số nguyên")
    .positive("ID danh mục cha phải lớn hơn 0")
    .nullable()
    .optional(),
  position: z.coerce
    .number()
    .int("Vị trí phải là số nguyên")
    .min(0, "Position cannot be negative")
    .optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

/**
 * Schema for category ID parameter
 * Used in routes: /:id
 */
export const categoryIdSchema = z.object({
  id: z.coerce
    .number()
    .int("ID danh mục phải là số nguyên")
    .positive("ID danh mục phải lớn hơn 0"),
});

/**
 * Schema for category slug parameter
 * Used in routes: /slug/:slug
 */
export const categorySlugSchema = z.object({
  slug: z
    .string({ required_error: "Slug là bắt buộc" })
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9-]+$/,
      "Slug can only contain lowercase letters, numbers, and hyphens",
    ),
});

/**
 * Schema for assigning products to category
 * POST /api/category/:id/products
 */
export const assignProductsSchema = z.object({
  productIds: z
    .array(z.number().int().positive())
    .min(1, "Cần ít nhất một ID sản phẩm"),
});

/**
 * Schema for reordering categories
 * POST /api/category/reorder
 */
export const reorderCategoriesSchema = z.object({
  categoryOrders: z
    .array(
      z.object({
        id: z.number().int().positive(),
        position: z.number().int().min(0),
      }),
    )
    .min(1, "Cần ít nhất một thứ tự danh mục"),
});
