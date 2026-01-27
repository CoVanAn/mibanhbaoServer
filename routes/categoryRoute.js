import express from "express";
import {
  addCategory,
  listCategory,
  getCategory,
  updateCategory,
  removeCategory,
} from "../controllers/category/index.js";
import authMiddleware from "../middleware/auth.js";
import { requireRoles } from "../middleware/roles.js";
import { validate, validateParams } from "../middleware/validate.js";
import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdSchema,
} from "../schemas/category.schema.js";

const categoryRouter = express.Router();

categoryRouter.post(
  "/add",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  validate(createCategorySchema),
  addCategory,
);
categoryRouter.get("/list", listCategory);
categoryRouter.get("/:idOrSlug", getCategory);
categoryRouter.patch(
  "/:id",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  validateParams(categoryIdSchema),
  validate(updateCategorySchema),
  updateCategory,
);
// Fallbacks if client/hosting has trouble with PATCH
categoryRouter.put(
  "/:id",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  validateParams(categoryIdSchema),
  validate(updateCategorySchema),
  updateCategory,
);
categoryRouter.post(
  "/update/:id",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  validateParams(categoryIdSchema),
  validate(updateCategorySchema),
  updateCategory,
);
categoryRouter.delete(
  "/:id",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  validateParams(categoryIdSchema),
  removeCategory,
);

export default categoryRouter;
