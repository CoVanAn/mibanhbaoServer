import prisma from "../../config/prisma.js";

/**
 * GET /api/admin/customers
 * List all customers with pagination, search, filter
 * Roles: ADMIN, STAFF
 */
export async function getCustomerList(req, res) {
  try {
    const { page, limit, search, isActive, sortBy, order } = req.query;

    const pageNum = parseInt(page || "1", 10);
    const limitNum = parseInt(limit || "20", 10);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where = {
      role: "CUSTOMER",
    };

    if (typeof isActive === "boolean") {
      where.isActive = isActive;
    } else if (isActive === "true") {
      where.isActive = true;
    } else if (isActive === "false") {
      where.isActive = false;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

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
    const data = customers.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone ?? null,
      avatar: c.avatar ?? null,
      isActive: c.isActive,
      createdAt: c.createdAt,
      ordersCount: c._count.orders,
    }));

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
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("getCustomerList error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách khách hàng",
    });
  }
}
