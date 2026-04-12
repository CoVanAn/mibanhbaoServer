import { z } from "zod";

/**
 * Order Validation Schemas
 */

// Create Order Schema - từ cart
export const createOrderSchema = z.object({
  method: z.enum(["DELIVERY", "PICKUP"], {
    required_error: "Phương thức thực hiện đơn hàng là bắt buộc",
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
    .int("ID đơn hàng phải là số nguyên")
    .positive("ID đơn hàng phải lớn hơn 0"),
});

export const orderPaymentIdSchema = z.object({
  id: z.coerce
    .number()
    .int("ID đơn hàng phải là số nguyên")
    .positive("ID đơn hàng phải lớn hơn 0"),
  paymentId: z.coerce
    .number()
    .int("ID thanh toán phải là số nguyên")
    .positive("ID thanh toán phải lớn hơn 0"),
});

// Order Filter Schema (for listing)
export const orderFilterSchema = z.object({
  page: z.coerce
    .number()
    .int("Trang phải là số nguyên")
    .positive("Trang phải lớn hơn 0")
    .default(1),
  limit: z.coerce
    .number()
    .int("Giới hạn phải là số nguyên")
    .positive("Giới hạn phải lớn hơn 0")
    .max(100, "Giới hạn không được vượt quá 100")
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
