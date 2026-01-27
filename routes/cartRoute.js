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
import { validate, validateParams } from "../middleware/validate.js";
import {
  addToCartSchema,
  updateCartItemSchema,
  applyCouponSchema,
  mergeCartSchema,
  cartItemIdSchema,
} from "../schemas/cart.schema.js";

const cartRouter = express.Router();

// Optional auth middleware - allows both guest and authenticated users
const optionalAuth = (req, res, next) => {
  // Try to authenticate, but don't fail if no token
  if (req.headers.authorization) {
    return authMiddleware(req, res, next);
  }
  next();
};

// Apply guest token middleware to all cart routes
cartRouter.use(ensureGuestToken);

// Cart operations (guest + authenticated)
cartRouter.get("/", optionalAuth, getCart);
cartRouter.post(
  "/items",
  optionalAuth,
  validate(addToCartSchema),
  addItemToCart,
);
cartRouter.put(
  "/items/:itemId",
  optionalAuth,
  validateParams(cartItemIdSchema),
  validate(updateCartItemSchema),
  updateCartItem,
);
cartRouter.delete(
  "/items/:itemId",
  optionalAuth,
  validateParams(cartItemIdSchema),
  removeCartItem,
);
cartRouter.delete("/clear", optionalAuth, clearCart);

// Coupon operations (guest + authenticated)
cartRouter.post(
  "/coupon",
  optionalAuth,
  validate(applyCouponSchema),
  applyCoupon,
);
cartRouter.delete("/coupon", optionalAuth, removeCoupon);

// Merge cart (authenticated only)
cartRouter.post("/merge", authMiddleware, validate(mergeCartSchema), mergeCart);

export default cartRouter;
