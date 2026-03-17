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
  createEmployeeSchema,
  updateEmployeeSchema,
  resetEmployeePasswordSchema,
} from "../schemas/employee.schema.js";
import {
  getEmployeeList,
  getEmployeeDetail,
  toggleEmployeeStatus,
  createEmployee,
  updateEmployee,
  resetEmployeePassword,
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
 * POST /api/admin/employees
 * Roles: ADMIN
 */
employeeRouter.post(
  "/api/admin/employees",
  authMiddleware,
  requireRoles("ADMIN"),
  validate(createEmployeeSchema),
  createEmployee,
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

/**
 * PATCH /api/admin/employees/:id
 * Roles: ADMIN
 */
employeeRouter.patch(
  "/api/admin/employees/:id",
  authMiddleware,
  requireRoles("ADMIN"),
  validateParams(employeeIdSchema),
  validate(updateEmployeeSchema),
  updateEmployee,
);

/**
 * PATCH /api/admin/employees/:id/reset-password
 * Roles: ADMIN
 */
employeeRouter.patch(
  "/api/admin/employees/:id/reset-password",
  authMiddleware,
  requireRoles("ADMIN"),
  validateParams(employeeIdSchema),
  validate(resetEmployeePasswordSchema),
  resetEmployeePassword,
);

export default employeeRouter;
