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
    .string({ required_error: "Category name is required" })
    .trim()
    .min(2, "Category name must be at least 2 characters")
    .max(100, "Category name cannot exceed 100 characters"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9-]+$/,
      "Slug can only contain lowercase letters, numbers, and hyphens",
    )
    .optional(),
  description: z.string().trim().max(500).optional(),
  parentId: z
    .number()
    .int("Parent ID must be an integer")
    .positive("Parent ID must be positive")
    .nullable()
    .optional(),
  position: z
    .union([z.number(), z.string().transform((val) => parseInt(val, 10) || 0)])
    .pipe(
      z
        .number()
        .int("Position must be an integer")
        .min(0, "Position cannot be negative"),
    )
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
    .min(2, "Category name must be at least 2 characters")
    .max(100, "Category name cannot exceed 100 characters")
    .optional(),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9-]+$/,
      "Slug can only contain lowercase letters, numbers, and hyphens",
    )
    .optional(),
  description: z.string().trim().max(500).optional(),
  parentId: z
    .number()
    .int("Parent ID must be an integer")
    .positive("Parent ID must be positive")
    .nullable()
    .optional(),
  position: z
    .union([z.number(), z.string().transform((val) => parseInt(val, 10) || 0)])
    .pipe(
      z
        .number()
        .int("Position must be an integer")
        .min(0, "Position cannot be negative"),
    )
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
    .int("Category ID must be an integer")
    .positive("Category ID must be positive"),
});

/**
 * Schema for category slug parameter
 * Used in routes: /slug/:slug
 */
export const categorySlugSchema = z.object({
  slug: z
    .string({ required_error: "Slug is required" })
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
    .min(1, "At least one product ID is required"),
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
    .min(1, "At least one category order is required"),
});
