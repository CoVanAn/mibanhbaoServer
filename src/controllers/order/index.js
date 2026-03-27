// Order CRUD operations
import {
  createOrder,
  getOrderById,
  getUserOrders,
  getAllOrders,
  updateOrderNote,
} from "./orderCrud.js";

// Order status management
import {
  updateOrderStatus,
  cancelOrder,
  getOrderStatusHistory,
  canTransitionStatus,
} from "./orderStatus.js";

// Order payment operations
import {
  createPayment,
  updatePaymentStatus,
  getOrderPayments,
  processRefund,
} from "./orderPayment.js";

// Export all functions
export {
  // CRUD
  createOrder,
  getOrderById,
  getUserOrders,
  getAllOrders,
  updateOrderNote,
  // Status
  updateOrderStatus,
  cancelOrder,
  getOrderStatusHistory,
  canTransitionStatus,
  // Payment
  createPayment,
  updatePaymentStatus,
  getOrderPayments,
  processRefund,
};

// Default export for convenience
export default {
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
};
