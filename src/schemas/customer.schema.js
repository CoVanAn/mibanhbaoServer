import { z } from "zod";

/**
 * Customer Validation Schemas (Admin-side)
 */

// Customer list query params
export const customerListSchema = z.object({
  page: z.coerce
    .number()
    .int("Page must be an integer")
    .positive("Page must be greater than 0")
    .default(1),
  limit: z.coerce
    .number()
    .int("Limit must be an integer")
    .positive("Limit must be greater than 0")
    .max(100, "Limit cannot exceed 100")
    .default(20),
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
  id: z.coerce
    .number()
    .int("ID phải là số nguyên")
    .positive("ID phải là số nguyên dương"),
});

// Toggle customer active status
export const customerStatusSchema = z.object({
  isActive: z.boolean(),
});
