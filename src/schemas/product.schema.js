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
    .string({ required_error: "Tên biến thể là bắt buộc" })
    .trim()
    .min(1, "Tên biến thể không được để trống")
    .max(100, "Tên biến thể không được vượt quá 100 ký tự"),
  sku: z
    .string()
    .trim()
    .toUpperCase()
    .transform((val) => val || undefined) // Convert empty string to undefined
    .refine(
      (val) => !val || /^[A-Z0-9-]+$/.test(val),
      "SKU chỉ được chứa chữ hoa, số và dấu gạch ngang",
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
    .min(1, "Tên biến thể không được để trống")
    .max(100, "Tên biến thể không được vượt quá 100 ký tự")
    .optional(),
  sku: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^[A-Z0-9-]+$/,
      "SKU chỉ được chứa chữ hoa, số và dấu gạch ngang",
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
          required_error: "Giá tiền là bắt buộc",
          invalid_type_error: "Giá tiền phải là số",
        })
        .positive("Giá tiền phải lớn hơn 0"),
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
      message: "Ngày kết thúc phải sau ngày bắt đầu",
      path: ["endsAt"],
    },
  );

/**
 * Schema for updating variant inventory
 * PATCH /api/product/:id/variants/:variantId/inventory
 */
export const updateInventorySchema = z
  .object({
    quantity: z.number().int().min(0, "Số lượng không thể là số âm").optional(),
    safetyStock: z
      .number()
      .int()
      .min(0, "Stock an toàn không thể là số âm")
      .optional(),
  })
  .refine(
    (data) => data.quantity !== undefined || data.safetyStock !== undefined,
    {
      message: "Bắt buộc truyền quantity hoặc safetyStock",
    },
  );

/**
 * Schema for product ID parameter
 * Used in routes: /:id
 */
export const productIdSchema = z.object({
  id: z.coerce
    .number()
    .int("ID sản phẩm phải là số nguyên")
    .positive("ID sản phẩm phải lớn hơn 0"),
});

/**
 * Schema for variant ID parameter
 * Used in routes: /variant/:variantId
 */
export const variantIdSchema = z.object({
  variantId: z.coerce
    .number()
    .int("ID biến thể phải là số nguyên")
    .positive("ID biến thể phải lớn hơn 0"),
});

export const categoryIdSchema = z.object({
  categoryId: z.coerce
    .number()
    .int("ID danh mục phải là số nguyên")
    .positive("ID danh mục phải lớn hơn 0"),
});

export const mediaIdSchema = z.object({
  mediaId: z.coerce
    .number()
    .int("ID phương tiện phải là số nguyên")
    .positive("ID phương tiện phải lớn hơn 0"),
});

export const priceIdSchema = z.object({
  priceId: z.coerce
    .number()
    .int("ID mức giá phải là số nguyên")
    .positive("ID mức giá phải lớn hơn 0"),
});

export const productVariantParamsSchema =
  productIdSchema.merge(variantIdSchema);
export const productCategoryParamsSchema =
  productIdSchema.merge(categoryIdSchema);
export const productMediaParamsSchema = productIdSchema.merge(mediaIdSchema);
export const productVariantPriceParamsSchema =
  productVariantParamsSchema.merge(priceIdSchema);
