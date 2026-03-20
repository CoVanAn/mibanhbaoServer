import express from "express";
import {
  getCart,
  mergeCart,
  applyCoupon,
  removeCoupon,
  addItemToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} from "../controllers/cart/index.js";
import authMiddleware from "../middleware/auth.js";
import ensureGuestToken from "../middleware/guestToken.js";
import optionalAuth from "../middleware/optionalAuth.js";
import { validate, validateParams } from "../middleware/validate.js";
import {
  addToCartSchema,
  updateCartItemSchema,
  applyCouponSchema,
  mergeCartSchema,
  cartItemIdSchema,
} from "../schemas/cart.schema.js";

const cartRouter = express.Router();

// Combined middleware: first try auth, then ensure guest token
const authThenGuest = (req, res, next) => {
  // First try to authenticate
  optionalAuth(req, res, () => {
    // Then ensure guest token if not authenticated
    ensureGuestToken(req, res, next);
  });
};

// Cart operations (guest + authenticated)
cartRouter.get("/", authThenGuest, getCart);
cartRouter.post(
  "/items",
  authThenGuest,
  validate(addToCartSchema),
  addItemToCart,
);
cartRouter.put(
  "/items/:itemId",
  authThenGuest,
  validateParams(cartItemIdSchema),
  validate(updateCartItemSchema),
  updateCartItem,
);
cartRouter.delete(
  "/items/:itemId",
  authThenGuest,
  validateParams(cartItemIdSchema),
  removeCartItem,
);
cartRouter.delete("/clear", authThenGuest, clearCart);

// Coupon operations (guest + authenticated)
cartRouter.post(
  "/coupon",
  authThenGuest,
  validate(applyCouponSchema),
  applyCoupon,
);
cartRouter.delete("/coupon", authThenGuest, removeCoupon);

// Merge cart (authenticated only)
cartRouter.post("/merge", authMiddleware, validate(mergeCartSchema), mergeCart);

export default cartRouter;
