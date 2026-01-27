// Cart CRUD operations
import { getCart, mergeCart, applyCoupon, removeCoupon } from "./cartCrud.js";

// Cart items management
import {
  addItemToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} from "./cartItems.js";

// Helper functions
import {
  getOrCreateCart,
  calculateCartTotals,
  mergeGuestCartToUser,
  validateCartItem,
  formatCartResponse,
} from "./cartHelpers.js";

// Export all functions
export {
  // CRUD
  getCart,
  mergeCart,
  applyCoupon,
  removeCoupon,
  // Items
  addItemToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  // Helpers
  getOrCreateCart,
  calculateCartTotals,
  mergeGuestCartToUser,
  validateCartItem,
  formatCartResponse,
};

// Default export for convenience
export default {
  getCart,
  mergeCart,
  applyCoupon,
  removeCoupon,
  addItemToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  getOrCreateCart,
  calculateCartTotals,
  mergeGuestCartToUser,
  validateCartItem,
  formatCartResponse,
};
