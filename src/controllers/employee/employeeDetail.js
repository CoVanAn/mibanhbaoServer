import prisma from "../../config/prisma.js";

/**
 * GET /api/admin/employees/:id
 * Get employee detail
 * Roles: ADMIN, STAFF
 */
export async function getEmployeeDetail(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) {
      return res
        .status(400)
        .json({ success: false, message: "ID nhân viên không hợp lệ" });
    }

    const employee = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        oauthAccounts: {
          select: {
            provider: true,
          },
        },
      },
    });

    if (!employee || (employee.role !== "ADMIN" && employee.role !== "STAFF")) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy nhân viên" });
    }

    return res.json({
      success: true,
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        phone: employee.phone ?? null,
        avatar: employee.avatar ?? null,
        role: employee.role,
        isActive: employee.isActive,
        createdAt: employee.createdAt,
        updatedAt: employee.updatedAt,
        linkedProviders: employee.oauthAccounts.map((o) => o.provider),
      },
    });
  } catch (error) {
    console.error("getEmployeeDetail error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thông tin nhân viên",
    });
  }
}
