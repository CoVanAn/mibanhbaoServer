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

const categoryRouter = express.Router();

categoryRouter.post(
  "/add",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  addCategory
);
categoryRouter.get("/list", listCategory);
categoryRouter.get("/:idOrSlug", getCategory);
categoryRouter.patch(
  "/:id",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  updateCategory
);
// Fallbacks if client/hosting has trouble with PATCH
categoryRouter.put(
  "/:id",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  updateCategory
);
categoryRouter.post(
  "/update/:id",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  updateCategory
);
categoryRouter.delete(
  "/:id",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  removeCategory
);

export default categoryRouter;
