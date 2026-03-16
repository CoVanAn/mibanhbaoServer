import prisma from "../../config/prisma.js";

/**
 * GET /api/admin/employees
 * List internal users (ADMIN, STAFF) with pagination, search and filters
 * Roles: ADMIN, STAFF
 */
export async function getEmployeeList(req, res) {
  try {
    const { page, limit, search, role, isActive, sortBy, order } = req.query;

    const pageNum = parseInt(page || "1", 10);
    const limitNum = parseInt(limit || "20", 10);
    const skip = (pageNum - 1) * limitNum;

    const where = {
      role: {
        in: ["ADMIN", "STAFF"],
      },
    };

    if (role) {
      where.role = role;
    }

    if (typeof isActive === "boolean") {
      where.isActive = isActive;
    } else if (isActive === "true") {
      where.isActive = true;
    } else if (isActive === "false") {
      where.isActive = false;
    }

    const trimmedSearch = search ? search.trim() : null;

    if (trimmedSearch) {
      where.OR = [
        { name: { contains: trimmedSearch, mode: "insensitive" } },
        { email: { contains: trimmedSearch, mode: "insensitive" } },
        { phone: { contains: trimmedSearch, mode: "insensitive" } },
      ];
    }

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
          hasPassword: true,
          createdAt: true,
          _count: {
            select: {
              orders: true,
            },
          },
        },
        orderBy,
        skip,
        take: limitNum,
      }),
    ]);

    const data = employees.map((e) => ({
      id: e.id,
      name: e.name,
      email: e.email,
      phone: e.phone ?? null,
      avatar: e.avatar ?? null,
      role: e.role,
      isActive: e.isActive,
      hasPassword: e.hasPassword,
      createdAt: e.createdAt,
      ordersHandledCount: e._count.orders,
    }));

    return res.json({
      success: true,
      employees: data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("getEmployeeList error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách nhân viên",
    });
  }
}
