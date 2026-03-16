import express from "express";
import authMiddleware from "../middleware/auth.js";
import { requireRoles } from "../middleware/roles.js";
import {
  validateQuery,
  validateParams,
  validate,
} from "../middleware/validate.js";
import {
  employeeListSchema,
  employeeIdSchema,
  employeeStatusSchema,
} from "../schemas/employee.schema.js";
import {
  getEmployeeList,
  getEmployeeDetail,
  toggleEmployeeStatus,
} from "../controllers/employee/index.js";

const employeeRouter = express.Router();

/**
 * GET /api/admin/employees
 * Roles: ADMIN, STAFF
 */
employeeRouter.get(
  "/api/admin/employees",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  validateQuery(employeeListSchema),
  getEmployeeList,
);

/**
 * GET /api/admin/employees/:id
 * Roles: ADMIN, STAFF
 */
employeeRouter.get(
  "/api/admin/employees/:id",
  authMiddleware,
  requireRoles("ADMIN", "STAFF"),
  validateParams(employeeIdSchema),
  getEmployeeDetail,
);

/**
 * PATCH /api/admin/employees/:id/status
 * Roles: ADMIN
 */
employeeRouter.patch(
  "/api/admin/employees/:id/status",
  authMiddleware,
  requireRoles("ADMIN"),
  validateParams(employeeIdSchema),
  validate(employeeStatusSchema),
  toggleEmployeeStatus,
);

export default employeeRouter;
