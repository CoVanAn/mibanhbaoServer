import { z } from "zod";

/**
 * Order Validation Schemas
 */

// Create Order Schema - từ cart
export const createOrderSchema = z.object({
  method: z.enum(["DELIVERY", "PICKUP"], {
    required_error: "Fulfillment method is required",
  }),
  addressId: z.number().int().positive().optional(),
  customerNote: z.string().max(500).optional(),
  pickupAt: z
    .string()
    .datetime()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  scheduledAt: z
    .string()
    .datetime()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
});

// Update Order Status Schema
export const updateOrderStatusSchema = z.object({
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "PREPARING",
    "READY",
    "OUT_FOR_DELIVERY",
    "COMPLETED",
    "CANCELED",
    "REFUNDED",
  ]),
  reason: z.string().max(500).optional(),
});

// Update Order Note Schema
export const updateOrderNoteSchema = z.object({
  customerNote: z.string().max(500).optional(),
  internalNote: z.string().max(500).optional(),
});

// Order ID Param Schema
export const orderIdSchema = z.object({
  id: z.coerce
    .number()
    .int("Order ID must be an integer")
    .positive("Order ID must be positive"),
});

export const orderPaymentIdSchema = z.object({
  id: z.coerce
    .number()
    .int("Order ID must be an integer")
    .positive("Order ID must be positive"),
  paymentId: z.coerce
    .number()
    .int("Payment ID must be an integer")
    .positive("Payment ID must be positive"),
});

// Order Filter Schema (for listing)
export const orderFilterSchema = z.object({
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
  status: z
    .enum([
      "PENDING",
      "CONFIRMED",
      "PREPARING",
      "READY",
      "OUT_FOR_DELIVERY",
      "COMPLETED",
      "CANCELED",
      "REFUNDED",
    ])
    .optional(),
  method: z.enum(["DELIVERY", "PICKUP"]).optional(),
  userId: z.coerce
    .number()
    .int("User ID must be an integer")
    .positive("User ID must be positive")
    .optional(),
  startDate: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  endDate: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  search: z.string().optional(), // Search by order code or customer name
});

// Cancel Order Schema
export const cancelOrderSchema = z.object({
  reason: z.string().min(1, "Vui lòng nhập lý do hủy").max(500),
});

// Refund Order Schema
export const refundOrderSchema = z.object({
  reason: z.string().trim().max(500).optional(),
  amount: z.coerce.number().positive().optional(),
});
