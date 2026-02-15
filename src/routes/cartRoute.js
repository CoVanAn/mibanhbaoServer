import express from "express";
import jwt from "jsonwebtoken";
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
  // Try to authenticate if any auth header is present
  const authHeader = req.headers.authorization || req.headers.Authorization;
  let token = req.headers.token;

  if (
    authHeader &&
    typeof authHeader === "string" &&
    authHeader.startsWith("Bearer ")
  ) {
    token = authHeader.substring(7);
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      req.userId = decoded.id;
      console.log("OptionalAuth: Authenticated user", decoded.id);
    } catch (error) {
      // Token invalid/expired - continue as guest
      console.log(
        "OptionalAuth: Token invalid, continuing as guest:",
        error.message,
      );
    }
  }

  next();
};

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
