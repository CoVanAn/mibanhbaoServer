/**
 * Product Validation Schemas
 * Using Zod for product, variant, price, and inventory validation
 */

import { z } from "zod";

/**
 * Schema for creating a product
 * POST /api/product/add
 */
export const createProductSchema = z.object({
  name: z
    .string({ required_error: "Product name is required" })
    .trim()
    .min(2, "Product name must be at least 2 characters")
    .max(200, "Product name cannot exceed 200 characters"),
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
  content: z.string().optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  categoryIds: z.array(z.number().int().positive()).min(1).optional(),
});

/**
 * Schema for updating a product
 * PATCH /api/product/:id
 */
export const updateProductSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Product name must be at least 2 characters")
    .max(200, "Product name cannot exceed 200 characters")
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
  content: z.string().optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

/**
 * Schema for creating a product variant
 * POST /api/product/:id/variants
 */
export const createVariantSchema = z.object({
  productId: z
    .number({ required_error: "Product ID is required" })
    .int()
    .positive(),
  name: z
    .string({ required_error: "Variant name is required" })
    .trim()
    .min(1, "Variant name cannot be empty")
    .max(100, "Variant name cannot exceed 100 characters"),
  sku: z
    .string({ required_error: "SKU is required" })
    .trim()
    .toUpperCase()
    .regex(
      /^[A-Z0-9-]+$/,
      "SKU can only contain uppercase letters, numbers, and hyphens",
    ),
  barcode: z.string().trim().optional(),
  weightGram: z.number().int().min(0).optional(),
  isActive: z.boolean().default(true),
});

/**
 * Schema for updating a product variant
 * PATCH /api/product/:id/variants/:variantId
 */
export const updateVariantSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Variant name cannot be empty")
    .max(100, "Variant name cannot exceed 100 characters")
    .optional(),
  sku: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^[A-Z0-9-]+$/,
      "SKU can only contain uppercase letters, numbers, and hyphens",
    )
    .optional(),
  barcode: z.string().trim().optional(),
  weightGram: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

/**
 * Schema for setting variant price
 * POST /api/product/:id/variants/:variantId/price
 */
export const setPriceSchema = z
  .object({
    variantId: z
      .number({ required_error: "Variant ID is required" })
      .int()
      .positive(),
    amount: z
      .number({ required_error: "Price amount is required" })
      .positive("Price must be positive")
      .multipleOf(0.01, "Price can have at most 2 decimal places"),
    startsAt: z.coerce.date().optional(),
    endsAt: z.coerce.date().optional(),
    isActive: z.boolean().default(true),
  })
  .refine(
    (data) => {
      if (data.startsAt && data.endsAt) {
        return data.endsAt > data.startsAt;
      }
      return true;
    },
    {
      message: "End date must be after start date",
      path: ["endsAt"],
    },
  );

/**
 * Schema for updating variant inventory
 * PATCH /api/product/:id/variants/:variantId/inventory
 */
export const updateInventorySchema = z.object({
  quantity: z
    .number({ required_error: "Quantity is required" })
    .int()
    .min(0, "Quantity cannot be negative"),
  safetyStock: z
    .number()
    .int()
    .min(0, "Safety stock cannot be negative")
    .default(0),
});

/**
 * Schema for adding product media
 * POST /api/product/:id/media
 */
export const addMediaSchema = z.object({
  url: z
    .string({ required_error: "Media URL is required" })
    .url("Must be a valid URL"),
  alt: z.string().trim().optional(),
  position: z.number().int().min(0).default(0),
});

/**
 * Schema for reordering product media
 * PUT /api/product/:id/media/reorder
 */
export const reorderMediaSchema = z.object({
  mediaOrders: z
    .array(
      z.object({
        id: z.number().int().positive(),
        position: z.number().int().min(0),
      }),
    )
    .min(1, "At least one media item is required"),
});

/**
 * Schema for product ID parameter
 * Used in routes: /:id
 */
export const productIdSchema = z.object({
  id: z.coerce
    .number()
    .int("Product ID must be an integer")
    .positive("Product ID must be positive"),
});

/**
 * Schema for variant ID parameter
 * Used in routes: /variant/:variantId
 */
export const variantIdSchema = z.object({
  variantId: z.coerce
    .number()
    .int("Variant ID must be an integer")
    .positive("Variant ID must be positive"),
});

/**
 * Schema for product slug parameter
 * Used in routes: /slug/:slug
 */
export const productSlugSchema = z.object({
  slug: z
    .string({ required_error: "Slug is required" })
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9-]+$/,
      "Slug can only contain lowercase letters, numbers, and hyphens",
    ),
});
