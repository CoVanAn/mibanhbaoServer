// Order CRUD operations
import {
  createOrder,
  getOrderById,
  getUserOrders,
  getAllOrders,
  updateOrderNote,
  deleteOrder,
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

// Helper functions
import {
  generateOrderCode,
  calculateOrderTotals,
  snapshotOrderItems,
  validateOrderCreation,
  reserveInventory,
  releaseInventory,
  formatOrderResponse,
  calculateShippingFee,
} from "./orderHelpers.js";

// Export all functions
export {
  // CRUD
  createOrder,
  getOrderById,
  getUserOrders,
  getAllOrders,
  updateOrderNote,
  deleteOrder,
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
  // Helpers
  generateOrderCode,
  calculateOrderTotals,
  snapshotOrderItems,
  validateOrderCreation,
  reserveInventory,
  releaseInventory,
  formatOrderResponse,
  calculateShippingFee,
};

// Default export for convenience
export default {
  createOrder,
  getOrderById,
  getUserOrders,
  getAllOrders,
  updateOrderNote,
  deleteOrder,
  updateOrderStatus,
  cancelOrder,
  getOrderStatusHistory,
  createPayment,
  updatePaymentStatus,
  getOrderPayments,
  processRefund,
};
