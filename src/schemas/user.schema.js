/**
 * User Validation Schemas
 * Using Zod for authentication and profile validation
 */

import { z } from "zod";

/**
 * Schema for user registration
 * POST /api/user/register
 */
export const registerUserSchema = z.object({
  name: z
    .string({ required_error: "Tên là bắt buộc" })
    .trim()
    .min(2, "Tên phải có ít nhất 2 ký tự")
    .max(100, "Name cannot exceed 100 characters"),
  email: z
    .string({ required_error: "Email là bắt buộc" })
    .trim()
    .toLowerCase()
    .email("Please provide a valid email address"),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9]{10,11}$/, "Số điện thoại phải có 10-11 chữ số")
    .optional(),
  password: z
    .string({ required_error: "Mật khẩu là bắt buộc" })
    .min(6, "Mật khẩu phải có ít nhất 6 ký tự")
    .max(128, "Password cannot exceed 128 characters"),
});

/**
 * Schema for user login
 * POST /api/user/login
 */
export const loginUserSchema = z.object({
  email: z
    .string({ required_error: "Email là bắt buộc" })
    .trim()
    .toLowerCase()
    .email("Please provide a valid email address"),
  password: z
    .string({ required_error: "Mật khẩu là bắt buộc" })
    .min(1, "Password cannot be empty"),
});

/**
 * Schema for updating user profile
 * PATCH /api/user/profile
 */
export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Tên phải có ít nhất 2 ký tự")
    .max(100, "Name cannot exceed 100 characters")
    .optional(),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9]{10,11}$/, "Số điện thoại phải có 10-11 chữ số")
    .optional(),
  avatar: z.string().url("Avatar phải là URL hợp lệ").optional(),
});

/**
 * Schema for changing password
 * POST /api/user/change-password
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z
    .string({ required_error: "Mật khẩu mới là bắt buộc" })
    .min(6, "Mật khẩu mới phải có ít nhất 6 ký tự")
    .max(128, "New password cannot exceed 128 characters"),
});

/**
 * Schema for address data
 * POST /api/user/addresses
 * PATCH /api/user/addresses/:id
 */
export const addressSchema = z.object({
  name: z
    .string({ required_error: "Tên người nhận là bắt buộc" })
    .trim()
    .min(2, "Tên người nhận phải có ít nhất 2 ký tự")
    .max(100, "Recipient name cannot exceed 100 characters"),
  phone: z
    .string({ required_error: "Số điện thoại là bắt buộc" })
    .trim()
    .regex(/^[0-9]{10,11}$/, "Số điện thoại phải có 10-11 chữ số"),
  company: z.string().trim().optional().nullable(),
  addressLine: z
    .string({ required_error: "Địa chỉ là bắt buộc" })
    .trim()
    .min(5, "Địa chỉ phải có ít nhất 5 ký tự")
    .max(200, "Address cannot exceed 200 characters"),
  ward: z
    .string({ required_error: "Phường/Xã là bắt buộc" })
    .trim()
    .min(1, "Ward cannot be empty"),
  district: z
    .string({ required_error: "Quận/Huyện là bắt buộc" })
    .trim()
    .min(1, "District cannot be empty"),
  province: z
    .string({ required_error: "Tỉnh/Thành phố là bắt buộc" })
    .trim()
    .min(1, "Province cannot be empty"),
});

/**
 * Schema for address ID parameter
 * Used in routes: /addresses/:id
 */
export const addressIdSchema = z.object({
  id: z.coerce
    .number()
    .int("ID địa chỉ phải là số nguyên")
    .positive("ID địa chỉ phải lớn hơn 0"),
});
