import { z } from "zod";

/**
 * Customer Validation Schemas (Admin-side)
 */

// Customer list query params
export const customerListSchema = z.object({
  page: z
    .string()
    .optional()
    .default("1")
    .transform((val) => parseInt(val, 10)),
  limit: z
    .string()
    .optional()
    .default("20")
    .transform((val) => parseInt(val, 10)),
  search: z.string().optional(), // Search by name, email, phone
  isActive: z
    .string()
    .optional()
    .transform((val) => {
      if (val === "true") return true;
      if (val === "false") return false;
      return undefined;
    }),
  sortBy: z
    .enum(["createdAt", "name", "email", "ordersCount"])
    .optional()
    .default("createdAt"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});

// Customer ID param
export const customerIdSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, "ID phải là số nguyên dương")
    .transform((val) => parseInt(val, 10)),
});

// Toggle customer active status
export const customerStatusSchema = z.object({
  isActive: z.boolean(),
});
