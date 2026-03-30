import prisma from "../../config/prisma.js";
import {
  applyIsActiveFilter,
  applyUserSearchFilter,
  buildPagination,
  getPagingParams,
  mapUserSummary,
} from "../user/helpers.js";

/**
 * GET /api/admin/customers
 * List all customers with pagination, search, filter
 * Roles: ADMIN, STAFF
 */
export async function getCustomerList(req, res, next) {
  try {
    const { page, limit, search, isActive, sortBy, order } = req.query;
    const { pageNum, limitNum, skip } = getPagingParams({ page, limit });

    // Build where clause
    const where = {
      role: "CUSTOMER",
    };

    applyIsActiveFilter(where, isActive);
    applyUserSearchFilter(where, search);

    // Build orderBy — ordersCount needs special handling (sort by _count after fetch)
    const sortField = sortBy || "createdAt";
    const sortOrder = order || "desc";
    const orderBy =
      sortField === "ordersCount"
        ? { createdAt: "desc" } // fallback; sorted in JS below
        : { [sortField]: sortOrder };

    // Run count + data in parallel
    const [total, customers] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatar: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: { orders: true },
          },
        },
        orderBy,
        skip,
        take: limitNum,
      }),
    ]);

    // Reshape response
    const data = customers.map((customer) =>
      mapUserSummary(customer, { includeOrdersCount: true }),
    );

    // Sort by ordersCount in JS when requested
    if (sortField === "ordersCount") {
      data.sort((a, b) =>
        sortOrder === "desc"
          ? b.ordersCount - a.ordersCount
          : a.ordersCount - b.ordersCount,
      );
    }

    return res.json({
      success: true,
      customers: data,
      pagination: buildPagination(pageNum, limitNum, total),
    });
  } catch (error) {
    return next(error);
  }
}
