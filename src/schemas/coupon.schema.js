import { z } from "zod";

const promotionTypeEnum = z.enum(["PERCENT", "FIXED"]);

const idSchema = z.object({
  id: z.string().transform((v) => parseInt(v, 10)),
});

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
