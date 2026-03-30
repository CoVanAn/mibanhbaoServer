import express from "express";
import {
  createCategory,
  listCategories,
  getCategory,
  updateCategory,
  deleteCategory,
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
  createCategory,
);
categoryRouter.get("/list", listCategories);
categoryRouter.get("/:idOrSlug", getCategory);
categoryRouter.patch(
  "/:id",
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
  deleteCategory,
);

export default categoryRouter;
