import { z } from "zod";

/**
 * Employee Validation Schemas (Admin-side)
 */

export const employeeListSchema = z.object({
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
  id: z.coerce
    .number()
    .int("ID phải là số nguyên")
    .positive("ID phải là số nguyên dương"),
});

export const employeeStatusSchema = z.object({
  isActive: z.boolean(),
});

export const createEmployeeSchema = z.object({
  name: z
    .string({ required_error: "Tên là bắt buộc" })
    .trim()
    .min(2, "Tên tối thiểu 2 ký tự")
    .max(100, "Tên tối đa 100 ký tự"),
  email: z
    .string({ required_error: "Email là bắt buộc" })
    .trim()
    .toLowerCase()
    .email("Email không hợp lệ"),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9]{10,11}$/, "Số điện thoại phải gồm 10-11 chữ số")
    .optional()
    .or(z.literal("")),
  role: z.enum(["ADMIN", "STAFF"]),
  password: z
    .string({ required_error: "Mật khẩu là bắt buộc" })
    .min(6, "Mật khẩu tối thiểu 6 ký tự")
    .max(128, "Mật khẩu tối đa 128 ký tự"),
});

export const updateEmployeeSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Tên tối thiểu 2 ký tự")
      .max(100, "Tên tối đa 100 ký tự")
      .optional(),
    phone: z
      .string()
      .trim()
      .regex(/^[0-9]{10,11}$/, "Số điện thoại phải gồm 10-11 chữ số")
      .optional()
      .or(z.literal("")),
    role: z.enum(["ADMIN", "STAFF"]).optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.phone !== undefined ||
      value.role !== undefined,
    {
      message: "Phải có ít nhất một trường để cập nhật",
    },
  );

export const resetEmployeePasswordSchema = z.object({
  newPassword: z
    .string({ required_error: "Mật khẩu mới là bắt buộc" })
    .min(6, "Mật khẩu tối thiểu 6 ký tự")
    .max(128, "Mật khẩu tối đa 128 ký tự"),
});
