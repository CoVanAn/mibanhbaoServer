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
  id: z.string().transform((val) => parseInt(val, 10)),
});

// Order Filter Schema (for listing)
export const orderFilterSchema = z.object({
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
  userId: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined)),
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
  reason: z.string().min(10).max(500),
});
