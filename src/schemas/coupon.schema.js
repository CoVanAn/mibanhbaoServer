import { z } from "zod";

const promotionTypeEnum = z.enum(["PERCENT", "FIXED"]);

const idSchema = z.object({
  id: z.coerce
    .number()
    .int("ID phải là số nguyên")
    .positive("ID phải là số dương"),
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

export const couponFilterSchema = z.object({
  page: z.coerce
    .number()
    .int("Trang phải là số nguyên")
    .positive("Trang phải lớn hơn 0")
    .default(1),
  limit: z.coerce
    .number()
    .int("Giới hạn phải là số nguyên")
    .positive("Giới hạn phải lớn hơn 0")
    .max(100, "Limit cannot exceed 100")
    .default(20),
  isActive: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  code: z.string().optional(),
});
