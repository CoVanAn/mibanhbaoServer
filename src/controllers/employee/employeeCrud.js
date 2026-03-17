import bcrypt from "bcryptjs";
import prisma from "../../config/prisma.js";

const employeeSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  avatar: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * POST /api/admin/employees
 * Create employee account (ADMIN/STAFF)
 * Roles: ADMIN
 */
export async function createEmployee(req, res) {
  try {
    const { name, email, phone, role, password } = req.body;

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: email.toLowerCase() }, ...(phone ? [{ phone }] : [])],
      },
      select: { id: true, email: true, phone: true },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Email hoặc số điện thoại đã được sử dụng",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const employee = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase(),
        phone: phone || null,
        role,
        password: hashedPassword,
        isActive: true,
      },
      select: employeeSelect,
    });

    return res.status(201).json({
      success: true,
      message: "Tạo tài khoản nhân viên thành công",
      employee,
    });
  } catch (error) {
    console.error("createEmployee error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi tạo tài khoản nhân viên",
    });
  }
}

/**
 * PATCH /api/admin/employees/:id
 * Update employee profile/role
 * Roles: ADMIN
 */
export async function updateEmployee(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) {
      return res
        .status(400)
        .json({ success: false, message: "ID nhân viên không hợp lệ" });
    }

    const { name, phone, role } = req.body;

    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, isActive: true },
    });

    if (!existing || (existing.role !== "ADMIN" && existing.role !== "STAFF")) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy nhân viên" });
    }

    if (name === undefined && phone === undefined && role === undefined) {
      return res.status(400).json({
        success: false,
        message: "Không có dữ liệu để cập nhật",
      });
    }

    if (phone) {
      const duplicatedPhone = await prisma.user.findFirst({
        where: { phone, NOT: { id } },
        select: { id: true },
      });
      if (duplicatedPhone) {
        return res.status(409).json({
          success: false,
          message: "Số điện thoại đã được sử dụng",
        });
      }
    }

    if (role && existing.role === "ADMIN" && role === "STAFF") {
      const activeAdminCount = await prisma.user.count({
        where: { role: "ADMIN", isActive: true },
      });

      if (activeAdminCount <= 1 && existing.isActive) {
        return res.status(400).json({
          success: false,
          message: "Không thể hạ quyền admin cuối cùng đang hoạt động",
        });
      }
    }

    const employee = await prisma.user.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(phone !== undefined ? { phone: phone || null } : {}),
        ...(role !== undefined ? { role } : {}),
      },
      select: employeeSelect,
    });

    return res.json({
      success: true,
      message: "Cập nhật nhân viên thành công",
      employee,
    });
  } catch (error) {
    console.error("updateEmployee error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật nhân viên",
    });
  }
}

/**
 * PATCH /api/admin/employees/:id/reset-password
 * Reset employee password
 * Roles: ADMIN
 */
export async function resetEmployeePassword(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) {
      return res
        .status(400)
        .json({ success: false, message: "ID nhân viên không hợp lệ" });
    }

    const { newPassword } = req.body;

    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });

    if (!existing || (existing.role !== "ADMIN" && existing.role !== "STAFF")) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy nhân viên" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
      },
    });

    return res.json({
      success: true,
      message: "Đặt lại mật khẩu thành công",
    });
  } catch (error) {
    console.error("resetEmployeePassword error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi đặt lại mật khẩu",
    });
  }
}
