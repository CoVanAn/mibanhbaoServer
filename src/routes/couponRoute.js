import express from "express";
import {
  createCoupon,
  listCoupons,
  getCoupon,
  updateCoupon,
  deleteCoupon,
  getCouponRedemptions,
  validateCouponCode,
  applyCoupon,
  removeCoupon,
} from "../controllers/coupon/index.js";
import authMiddleware from "../middleware/auth.js";
import { requireRoles } from "../middleware/roles.js";
import {
  validate,
  validateParams,
  validateQuery,
} from "../middleware/validate.js";
import {
  createCouponSchema,
  updateCouponSchema,
  couponIdSchema,
  validateCouponSchema,
  applyCouponSchema,
  couponFilterSchema,
} from "../schemas/coupon.schema.js";
import jwt from "jsonwebtoken";

const couponRouter = express.Router();

// Optional auth middleware (for guests using coupon)
const optionalAuth = (req, res, next) => {
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
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      // invalid token – continue as guest
    }
  }
  next();
};

// ─────────────────────────────────────────────
// User / Guest routes – coupon interaction
// ─────────────────────────────────────────────

// POST /api/coupon/validate – preview coupon discount
couponRouter.post(
  "/validate",
  optionalAuth,
  validate(validateCouponSchema),
  validateCouponCode,
);

// POST /api/coupon/apply – apply coupon to cart
couponRouter.post(
  "/apply",
  optionalAuth,
  validate(applyCouponSchema),
  applyCoupon,
);

// DELETE /api/coupon/remove – remove coupon from cart
couponRouter.delete("/remove", optionalAuth, removeCoupon);

// ─────────────────────────────────────────────
// Admin / Staff routes – coupon management
// ─────────────────────────────────────────────

// List coupons
couponRouter.get(
  "/",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  validateQuery(couponFilterSchema),
  listCoupons,
);

// Create coupon
couponRouter.post(
  "/",
  authMiddleware,
  requireRoles("ADMIN"),
  validate(createCouponSchema),
  createCoupon,
);

// Get single coupon – must be after /validate, /apply, /remove
couponRouter.get(
  "/:id",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  validateParams(couponIdSchema),
  getCoupon,
);

// Update coupon
couponRouter.patch(
  "/:id",
  authMiddleware,
  requireRoles("ADMIN"),
  validateParams(couponIdSchema),
  validate(updateCouponSchema),
  updateCoupon,
);

// Delete coupon
couponRouter.delete(
  "/:id",
  authMiddleware,
  requireRoles("ADMIN"),
  validateParams(couponIdSchema),
  deleteCoupon,
);

// Get coupon redemption history
couponRouter.get(
  "/:id/redemptions",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  validateParams(couponIdSchema),
  getCouponRedemptions,
);

export default couponRouter;
