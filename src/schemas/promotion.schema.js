import { z } from "zod";

// ─────────────────────────────────────────────
// Shared
// ─────────────────────────────────────────────

const promotionTypeEnum = z.enum(["PERCENT", "FIXED"]);

const idSchema = z.object({
  id: z.string().transform((v) => parseInt(v, 10)),
});

// ─────────────────────────────────────────────
// Promotion
// ─────────────────────────────────────────────

export const createPromotionSchema = z.object({
  name: z.string().min(1).max(255),
  type: promotionTypeEnum,
  value: z.number().int().positive(),
  startsAt: z
    .string()
    .datetime()
    .transform((v) => new Date(v)),
  endsAt: z
    .string()
    .datetime()
    .transform((v) => new Date(v)),
  minSubtotal: z.number().int().nonnegative().optional(),
  maxUses: z.number().int().positive().optional(),
  isActive: z.boolean().optional().default(true),
  isGlobal: z.boolean().optional().default(false),
});

export const updatePromotionSchema = createPromotionSchema.partial();

export const promotionIdSchema = idSchema;

export const promotionFilterSchema = z.object({
  page: z
    .string()
    .optional()
    .default("1")
    .transform((v) => parseInt(v, 10)),
  limit: z
    .string()
    .optional()
    .default("20")
    .transform((v) => parseInt(v, 10)),
  isActive: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  isGlobal: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});

// Targets: add/remove categories, products, variants to a promotion
export const promotionTargetSchema = z.object({
  categoryIds: z.array(z.number().int().positive()).optional(),
  productIds: z.array(z.number().int().positive()).optional(),
  variantIds: z.array(z.number().int().positive()).optional(),
});

// ─────────────────────────────────────────────
// Coupon
// ─────────────────────────────────────────────

export const createCouponSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(64)
    .transform((s) => s.toUpperCase()),
  type: promotionTypeEnum,
  value: z.number().int().positive(),
  startsAt: z
    .string()
    .datetime()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
  endsAt: z
    .string()
    .datetime()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
  minSubtotal: z.number().int().nonnegative().optional(),
  maxRedemptions: z.number().int().positive().optional(),
  perUserLimit: z.number().int().positive().optional(),
  isActive: z.boolean().optional().default(true),
});

export const updateCouponSchema = createCouponSchema
  .omit({ code: true })
  .partial();

export const couponIdSchema = idSchema;

export const validateCouponSchema = z.object({
  code: z
    .string()
    .min(1)
    .transform((s) => s.toUpperCase()),
  subtotal: z.number().nonnegative().optional(),
});

export const applyCouponSchema = z.object({
  code: z
    .string()
    .min(1)
    .transform((s) => s.toUpperCase()),
});

export const couponFilterSchema = z.object({
  page: z
    .string()
    .optional()
    .default("1")
    .transform((v) => parseInt(v, 10)),
  limit: z
    .string()
    .optional()
    .default("20")
    .transform((v) => parseInt(v, 10)),
  isActive: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  code: z.string().optional(),
});
