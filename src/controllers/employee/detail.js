import prisma from "../../config/prisma.js";
import {
  isEmployeeRole,
  linkedProvidersFrom,
} from "../user/helpers.js";

import { parsePositiveInt } from "../../utils/id.js";

/**
 * GET /api/admin/employees/:id
 * Get employee detail
 * Roles: ADMIN, STAFF
 */
export async function getEmployeeDetail(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) {
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

    if (!employee || !isEmployeeRole(employee.role)) {
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
        linkedProviders: linkedProvidersFrom(employee),
      },
    });
  } catch (error) {
    return next(error);
  }
}
