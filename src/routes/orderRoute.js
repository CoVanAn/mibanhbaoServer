import express from "express";
import jwt from "jsonwebtoken";
import {
  createOrder,
  getOrderById,
  getUserOrders,
  getAllOrders,
  updateOrderNote,
  updateOrderStatus,
  cancelOrder,
  getOrderStatusHistory,
  deleteOrder,
  createPayment,
  updatePaymentStatus,
  getOrderPayments,
  processRefund,
} from "../controllers/order/index.js";
import authMiddleware from "../middleware/auth.js";
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
  orderFilterSchema,
  cancelOrderSchema,
} from "../schemas/order.schema.js";

const orderRouter = express.Router();

// Optional auth middleware - allows both guest and authenticated users
const optionalAuth = (req, res, next) => {
  console.log("=== OPTIONAL AUTH DEBUG ===");
  console.log("Headers:", req.headers);

  const authHeader = req.headers.authorization || req.headers.Authorization;
  let token = req.headers.token;

  console.log("Authorization header:", authHeader);
  console.log("Token header:", token);

  if (
    authHeader &&
    typeof authHeader === "string" &&
    authHeader.startsWith("Bearer ")
  ) {
    token = authHeader.substring(7);
    console.log(
      "Extracted token from Bearer:",
      token ? token.substring(0, 20) + "..." : "none",
    );
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      console.log("Token verified, user:", decoded.id);
    } catch (error) {
      // Token invalid - continue as guest
      console.log("Token verification failed:", error.message);
    }
  } else {
    console.log("No token found, continuing as guest");
  }
  next();
};

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

// Cancel order
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

// Delete order (Admin only)
orderRouter.delete(
  "/:id",
  authMiddleware,
  requireRoles("ADMIN"),
  validateParams(orderIdSchema),
  deleteOrder,
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
  updatePaymentStatus,
);

// Process refund
orderRouter.post(
  "/:id/refund",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  validateParams(orderIdSchema),
  processRefund,
);

export default orderRouter;
