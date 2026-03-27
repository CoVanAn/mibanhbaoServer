/**
 * Product Validation Schemas
 * Using Zod for product, variant, price, and inventory validation
 */

import { z } from "zod";

/**
 * Schema for creating a product variant
 * POST /api/product/:id/variants
 * Note: productId comes from URL params, not body
 */
export const createVariantSchema = z.object({
  name: z
    .string({ required_error: "Variant name is required" })
    .trim()
    .min(1, "Variant name cannot be empty")
    .max(100, "Variant name cannot exceed 100 characters"),
  sku: z
    .string()
    .trim()
    .toUpperCase()
    .transform((val) => val || undefined) // Convert empty string to undefined
    .refine(
      (val) => !val || /^[A-Z0-9-]+$/.test(val),
      "SKU can only contain uppercase letters, numbers, and hyphens",
    )
    .optional(), // SKU is optional, will be auto-generated if not provided
  barcode: z.string().trim().optional(),
  weightGram: z.number().int().min(0).optional(),
  isActive: z.boolean().default(true),
  initialStock: z.number().int().min(0).optional(),
  safetyStock: z.number().int().min(0).optional(),
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
 * Note: productId and variantId come from URL params, not body
 */
export const setPriceSchema = z
  .object({
    amount: z.preprocess(
      (val) => (typeof val === "string" ? parseFloat(val) : val),
      z
        .number({
          required_error: "Price amount is required",
          invalid_type_error: "Price must be a number",
        })
        .positive("Price must be positive"),
    ),
    startsAt: z.preprocess(
      (val) => (val === null || val === "" ? undefined : val),
      z.coerce.date().optional(),
    ),
    endsAt: z.preprocess(
      (val) => (val === null || val === "" ? undefined : val),
      z.coerce.date().optional(),
    ),
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
export const updateInventorySchema = z
  .object({
    quantity: z.number().int().min(0, "Quantity cannot be negative").optional(),
    safetyStock: z
      .number()
      .int()
      .min(0, "Safety stock cannot be negative")
      .optional(),
  })
  .refine(
    (data) => data.quantity !== undefined || data.safetyStock !== undefined,
    {
      message: "quantity or safetyStock required",
    },
  );

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

export const categoryIdSchema = z.object({
  categoryId: z.coerce
    .number()
    .int("Category ID must be an integer")
    .positive("Category ID must be positive"),
});

export const mediaIdSchema = z.object({
  mediaId: z.coerce
    .number()
    .int("Media ID must be an integer")
    .positive("Media ID must be positive"),
});

export const priceIdSchema = z.object({
  priceId: z.coerce
    .number()
    .int("Price ID must be an integer")
    .positive("Price ID must be positive"),
});

export const productVariantParamsSchema =
  productIdSchema.merge(variantIdSchema);
export const productCategoryParamsSchema =
  productIdSchema.merge(categoryIdSchema);
export const productMediaParamsSchema = productIdSchema.merge(mediaIdSchema);
export const productVariantPriceParamsSchema =
  productVariantParamsSchema.merge(priceIdSchema);
