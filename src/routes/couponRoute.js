import express from "express";
import {
  createCoupon,
  listCoupons,
  getCoupon,
  updateCoupon,
  deleteCoupon,
  getCouponRedemptions,
  validateCouponCode,
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
  couponFilterSchema,
} from "../schemas/coupon.schema.js";
import optionalAuth from "../middleware/optionalAuth.js";

const couponRouter = express.Router();

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

// Get single coupon – must be after /validate
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
