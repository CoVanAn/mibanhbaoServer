import prisma from "../../config/prisma.js";
import { isEmployeeRole } from "../user/adminUserHelpers.js";

import { parsePositiveInt } from "../../utils/id.js";

/**
 * PATCH /api/admin/employees/:id/status
 * Toggle employee isActive
 * Roles: ADMIN only
 */
export async function toggleEmployeeStatus(req, res) {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "ID nhân viên không hợp lệ" });
    }

    const { isActive } = req.body;
    if (typeof isActive !== "boolean") {
      return res
        .status(400)
        .json({ success: false, message: "isActive phải là boolean" });
    }

    if (req.userId === id && isActive === false) {
      return res.status(400).json({
        success: false,
        message: "Không thể tự vô hiệu hóa tài khoản của chính mình",
      });
    }

    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });

    if (!existing || !isEmployeeRole(existing.role)) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy nhân viên" });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    return res.json({
      success: true,
      message: isActive
        ? "Kích hoạt tài khoản thành công"
        : "Vô hiệu hoá tài khoản thành công",
      employee: updated,
    });
  } catch (error) {
    console.error("toggleEmployeeStatus error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật trạng thái nhân viên",
    });
  }
}
