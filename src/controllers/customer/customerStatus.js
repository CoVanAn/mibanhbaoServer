import prisma from "../../config/prisma.js";
import { parsePositiveInt } from "../../utils/id.js";

/**
 * PATCH /api/admin/customers/:id/status
 * Toggle isActive for a customer
 * Roles: ADMIN only
 */
export async function toggleCustomerStatus(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "ID khách hàng không hợp lệ" });
    }

    const { isActive } = req.body;
    if (typeof isActive !== "boolean") {
      return res
        .status(400)
        .json({ success: false, message: "isActive phải là boolean" });
    }

    // Make sure target is a customer
    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });

    if (!existing || existing.role !== "CUSTOMER") {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy khách hàng" });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
      },
    });

    return res.json({
      success: true,
      message: isActive
        ? "Kích hoạt tài khoản thành công"
        : "Vô hiệu hoá tài khoản thành công",
      customer: updated,
    });
  } catch (error) {
    return next(error);
  }
}
