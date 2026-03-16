import { z } from "zod";

/**
 * Employee Validation Schemas (Admin-side)
 */

export const employeeListSchema = z.object({
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
  search: z.string().optional(),
  role: z.enum(["ADMIN", "STAFF"]).optional(),
  isActive: z
    .string()
    .optional()
    .transform((val) => {
      if (val === "true") return true;
      if (val === "false") return false;
      return undefined;
    }),
  sortBy: z
    .enum(["createdAt", "name", "email", "role"])
    .optional()
    .default("createdAt"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const employeeIdSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, "ID phải là số nguyên dương")
    .transform((val) => parseInt(val, 10)),
});

export const employeeStatusSchema = z.object({
  isActive: z.boolean(),
});
