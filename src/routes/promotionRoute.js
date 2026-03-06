import express from "express";
import {
  createPromotion,
  listPromotions,
  getPromotion,
  updatePromotion,
  deletePromotion,
  getActivePromotions,
  addPromotionTargets,
  removePromotionTargets,
} from "../controllers/promotion/index.js";
import authMiddleware from "../middleware/auth.js";
import { requireRoles } from "../middleware/roles.js";
import {
  validate,
  validateParams,
  validateQuery,
} from "../middleware/validate.js";
import {
  createPromotionSchema,
  updatePromotionSchema,
  promotionIdSchema,
  promotionFilterSchema,
  promotionTargetSchema,
} from "../schemas/promotion.schema.js";

const promotionRouter = express.Router();

// ─────────────────────────────────────────────
// Public routes
// ─────────────────────────────────────────────

// GET /api/promotion/active?productId=&variantId=
// Must be before /:id to avoid capture
promotionRouter.get("/active", getActivePromotions);

// ─────────────────────────────────────────────
// Admin / Staff routes
// ─────────────────────────────────────────────

// List promotions
promotionRouter.get(
  "/",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  validateQuery(promotionFilterSchema),
  listPromotions,
);

// Create promotion
promotionRouter.post(
  "/",
  authMiddleware,
  requireRoles("ADMIN"),
  validate(createPromotionSchema),
  createPromotion,
);

// Get single promotion
promotionRouter.get(
  "/:id",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  validateParams(promotionIdSchema),
  getPromotion,
);

// Update promotion
promotionRouter.patch(
  "/:id",
  authMiddleware,
  requireRoles("ADMIN"),
  validateParams(promotionIdSchema),
  validate(updatePromotionSchema),
  updatePromotion,
);

// Delete promotion
promotionRouter.delete(
  "/:id",
  authMiddleware,
  requireRoles("ADMIN"),
  validateParams(promotionIdSchema),
  deletePromotion,
);

// Add targets (categories / products / variants)
promotionRouter.post(
  "/:id/targets",
  authMiddleware,
  requireRoles("ADMIN"),
  validateParams(promotionIdSchema),
  validate(promotionTargetSchema),
  addPromotionTargets,
);

// Remove targets
promotionRouter.delete(
  "/:id/targets",
  authMiddleware,
  requireRoles("ADMIN"),
  validateParams(promotionIdSchema),
  validate(promotionTargetSchema),
  removePromotionTargets,
);

export default promotionRouter;
