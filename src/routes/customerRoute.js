import express from "express";
import authMiddleware from "../middleware/auth.js";
import { requireRoles } from "../middleware/roles.js";
import {
  validateQuery,
  validateParams,
  validate,
} from "../middleware/validate.js";
import {
  customerListSchema,
  customerIdSchema,
  customerStatusSchema,
} from "../schemas/customer.schema.js";
import {
  getCustomerList,
  getCustomerDetail,
  toggleCustomerStatus,
} from "../controllers/customer/index.js";

const customerRouter = express.Router();

/**
 * GET /api/admin/customers
 * List customers with pagination, search, filter
 * Roles: ADMIN, STAFF
 */
customerRouter.get(
  "/api/admin/customers",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  validateQuery(customerListSchema),
  getCustomerList,
);

/**
 * GET /api/admin/customers/:id
 * Get customer detail (profile + addresses + orders + coupon usage)
 * Roles: ADMIN, STAFF
 */
customerRouter.get(
  "/api/admin/customers/:id",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  validateParams(customerIdSchema),
  getCustomerDetail,
);

/**
 * PATCH /api/admin/customers/:id/status
 * Toggle customer isActive
 * Roles: ADMIN only
 */
customerRouter.patch(
  "/api/admin/customers/:id/status",
  authMiddleware,
  requireRoles("ADMIN"),
  validateParams(customerIdSchema),
  validate(customerStatusSchema),
  toggleCustomerStatus,
);

export default customerRouter;
