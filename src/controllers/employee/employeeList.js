import prisma from "../../config/prisma.js";
import {
  applyIsActiveFilter,
  applyUserSearchFilter,
  buildPagination,
  EMPLOYEE_ROLES,
  getPagingParams,
  mapUserSummary,
} from "../user/adminUserHelpers.js";

/**
 * GET /api/admin/employees
 * List internal users (ADMIN, STAFF) with pagination, search and filters
 * Roles: ADMIN, STAFF
 */
export async function getEmployeeList(req, res, next) {
  try {
    const { page, limit, search, role, isActive, sortBy, order } = req.query;
    const { pageNum, limitNum, skip } = getPagingParams({ page, limit });

    const where = {
      role: {
        in: EMPLOYEE_ROLES,
      },
    };

    if (role) {
      where.role = role;
    }

    applyIsActiveFilter(where, isActive);
    applyUserSearchFilter(where, search);

    const sortField = sortBy || "createdAt";
    const sortOrder = order || "desc";
    const orderBy = { [sortField]: sortOrder };

    const [total, employees] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatar: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
        orderBy,
        skip,
        take: limitNum,
      }),
    ]);

    const data = employees.map((employee) =>
      mapUserSummary(employee, { includeRole: true }),
    );

    return res.json({
      success: true,
      employees: data,
      pagination: buildPagination(pageNum, limitNum, total),
    });
  } catch (error) {
    return next(error);
  }
}
