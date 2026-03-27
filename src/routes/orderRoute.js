import express from "express";
import {
  createOrder,
  getOrderById,
  getUserOrders,
  getAllOrders,
  updateOrderNote,
  updateOrderStatus,
  cancelOrder,
  getOrderStatusHistory,
  createPayment,
  updatePaymentStatus,
  getOrderPayments,
  processRefund,
} from "../controllers/order/index.js";
import authMiddleware from "../middleware/auth.js";
import optionalAuth from "../middleware/optionalAuth.js";
import { requireRoles } from "../middleware/roles.js";
import {
  validate,
  validateParams,
  validateQuery,
} from "../middleware/validate.js";
import {
  createOrderSchema,
  updateOrderStatusSchema,
  updateOrderNoteSchema,
  orderIdSchema,
  orderPaymentIdSchema,
  orderFilterSchema,
  cancelOrderSchema,
  refundOrderSchema,
} from "../schemas/order.schema.js";

const orderRouter = express.Router();

/**
 * Customer Routes
 */

// Create order from cart
orderRouter.post(
  "/create",
  optionalAuth,
  validate(createOrderSchema),
  createOrder,
);

// Get user's orders
orderRouter.get("/my", authMiddleware, getUserOrders);

// Cancel order (customer cancels own order OR admin cancels any order)
orderRouter.post(
  "/:id/cancel",
  authMiddleware,
  validateParams(orderIdSchema),
  validate(cancelOrderSchema),
  cancelOrder,
);

// Get order status history
orderRouter.get(
  "/:id/history",
  authMiddleware,
  validateParams(orderIdSchema),
  getOrderStatusHistory,
);

/**
 * Admin Routes
 */

// Get all orders (Admin/Staff) - must be before /:id
orderRouter.get(
  "/list",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  validateQuery(orderFilterSchema),
  getAllOrders,
);

// Get single order - must be after /list and /my
orderRouter.get(
  "/:id",
  authMiddleware,
  validateParams(orderIdSchema),
  getOrderById,
);

// Update order status (Admin/Staff)
orderRouter.patch(
  "/:id/status",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  validateParams(orderIdSchema),
  validate(updateOrderStatusSchema),
  updateOrderStatus,
);

// Update order note
orderRouter.patch(
  "/:id/note",
  authMiddleware,
  validateParams(orderIdSchema),
  validate(updateOrderNoteSchema),
  updateOrderNote,
);

/**
 * Payment Routes (Admin/Staff)
 */

// Get order payments
orderRouter.get(
  "/:id/payments",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  validateParams(orderIdSchema),
  getOrderPayments,
);

// Create payment
orderRouter.post(
  "/:id/payment",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  validateParams(orderIdSchema),
  createPayment,
);

// Update payment status
orderRouter.patch(
  "/:id/payment/:paymentId",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  validateParams(orderPaymentIdSchema),
  updatePaymentStatus,
);

// Process refund
orderRouter.post(
  "/:id/refund",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  validateParams(orderIdSchema),
  validate(refundOrderSchema),
  processRefund,
);

export default orderRouter;
