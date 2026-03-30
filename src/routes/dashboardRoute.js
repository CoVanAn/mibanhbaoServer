import express from "express";
import authMiddleware from "../middleware/auth.js";
import { requireRoles } from "../middleware/roles.js";
import { validateQuery } from "../middleware/validate.js";
import {
  getDashboardOverview,
  getDashboardDaily,
  getDashboardTopProducts,
  getDashboardLowStock,
} from "../controllers/dashboard/dashboard.js";
import {
  dashboardOverviewQuerySchema,
  dashboardDailyQuerySchema,
  dashboardTopProductsQuerySchema,
  dashboardLowStockQuerySchema,
} from "../schemas/dashboard.schema.js";

const dashboardRouter = express.Router();

dashboardRouter.use(authMiddleware, requireRoles("ADMIN", "STAFF"));

dashboardRouter.get(
  "/overview",
  validateQuery(dashboardOverviewQuerySchema),
  getDashboardOverview,
);

dashboardRouter.get(
  "/daily",
  validateQuery(dashboardDailyQuerySchema),
  getDashboardDaily,
);

dashboardRouter.get(
  "/top-products",
  validateQuery(dashboardTopProductsQuerySchema),
  getDashboardTopProducts,
);

dashboardRouter.get(
  "/low-stock",
  validateQuery(dashboardLowStockQuerySchema),
  getDashboardLowStock,
);

export default dashboardRouter;
