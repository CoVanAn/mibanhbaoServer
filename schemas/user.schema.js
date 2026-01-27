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
    .string({ required_error: "Name is required" })
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .toLowerCase()
    .email("Please provide a valid email address"),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9]{10,11}$/, "Phone number must be 10-11 digits")
    .optional(),
  password: z
    .string({ required_error: "Password is required" })
    .min(6, "Password must be at least 6 characters")
    .max(128, "Password cannot exceed 128 characters"),
});

/**
 * Schema for user login
 * POST /api/user/login
 */
export const loginUserSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .toLowerCase()
    .email("Please provide a valid email address"),
  password: z
    .string({ required_error: "Password is required" })
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
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters")
    .optional(),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9]{10,11}$/, "Phone number must be 10-11 digits")
    .optional(),
  avatar: z.string().url("Avatar must be a valid URL").optional(),
});

/**
 * Schema for changing password
 * POST /api/user/change-password
 */
export const changePasswordSchema = z.object({
  currentPassword: z
    .string({ required_error: "Current password is required" })
    .min(1, "Current password cannot be empty"),
  newPassword: z
    .string({ required_error: "New password is required" })
    .min(6, "New password must be at least 6 characters")
    .max(128, "New password cannot exceed 128 characters"),
});

/**
 * Schema for address data
 * POST /api/user/addresses
 * PATCH /api/user/addresses/:id
 */
export const addressSchema = z.object({
  recipientName: z
    .string({ required_error: "Recipient name is required" })
    .trim()
    .min(2, "Recipient name must be at least 2 characters")
    .max(100, "Recipient name cannot exceed 100 characters"),
  phone: z
    .string({ required_error: "Phone number is required" })
    .trim()
    .regex(/^[0-9]{10,11}$/, "Phone number must be 10-11 digits"),
  street: z
    .string({ required_error: "Street address is required" })
    .trim()
    .min(5, "Street address must be at least 5 characters")
    .max(200, "Street address cannot exceed 200 characters"),
  ward: z.string().trim().optional(),
  district: z
    .string({ required_error: "District is required" })
    .trim()
    .min(1, "District cannot be empty"),
  city: z
    .string({ required_error: "City is required" })
    .trim()
    .min(1, "City cannot be empty"),
  country: z.string().trim().default("Vietnam"),
  postalCode: z.string().trim().optional(),
  isDefault: z.boolean().default(false),
});

/**
 * Schema for address ID parameter
 * Used in routes: /addresses/:id
 */
export const addressIdSchema = z.object({
  id: z.coerce
    .number()
    .int("Address ID must be an integer")
    .positive("Address ID must be positive"),
});
