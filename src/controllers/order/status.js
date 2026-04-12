import orderService from "../../services/order.service.js";
import { createControllerErrorHandler } from "../../utils/controllerError.js";
import { parsePositiveInt } from "../../utils/id.js";

const handleError = createControllerErrorHandler({
  defaultMessage: "Lỗi máy chủ",
  includeOperationalErrors: true,
  includeOperationalDetails: true,
  includeErrorDetails: true,
});

const isAdminOrStaff = (user) =>
  user?.role === "ADMIN" || user?.role === "STAFF";

/**
 * Valid status transitions
 */
const STATUS_TRANSITIONS = {
  PENDING: ["CONFIRMED", "CANCELED"],
  CONFIRMED: ["PREPARING", "CANCELED"],
  PREPARING: ["READY", "CANCELED"],
  READY: ["OUT_FOR_DELIVERY", "COMPLETED", "CANCELED"], // COMPLETED for PICKUP
  OUT_FOR_DELIVERY: ["COMPLETED", "CANCELED"],
  COMPLETED: ["REFUNDED"],
  CANCELED: [],
  REFUNDED: [],
};

/**
 * Check if status transition is valid
 */
export function canTransitionStatus(currentStatus, newStatus) {
  const allowedTransitions = STATUS_TRANSITIONS[currentStatus] || [];
  return allowedTransitions.includes(newStatus);
}

/**
 * Update order status
 * PATCH /api/order/:id/status
 */
export async function updateOrderStatus(req, res) {
  try {
    const orderId = parsePositiveInt(req.params.id);
    if (!orderId) {
      return res
        .status(400)
        .json({ success: false, message: "ID đơn hàng không hợp lệ" });
    }
    const userId = req.user?.id;
    const isAdmin = isAdminOrStaff(req.user);
    const { status, reason } = req.body;

    const order = await orderService.updateOrderStatus(
      orderId,
      userId,
      isAdmin,
      { status, reason },
    );

    return res.status(200).json({
      success: true,
      message: `Trạng thái đơn hàng đã được cập nhật thành ${status}`,
      order,
      allowedTransitions: STATUS_TRANSITIONS[order.status],
    });
  } catch (error) {
    return handleError(res, error);
  }
}

/**
 * Cancel order
 * POST /api/order/:id/cancel
 */
export async function cancelOrder(req, res) {
  try {
    const orderId = parsePositiveInt(req.params.id);
    if (!orderId) {
      return res
        .status(400)
        .json({ success: false, message: "ID đơn hàng không hợp lệ" });
    }
    const userId = req.user?.id;
    const isAdmin = isAdminOrStaff(req.user);
    const { reason } = req.body;

    const order = await orderService.cancelOrder(orderId, userId, isAdmin, {
      reason,
    });

    return res.status(200).json({
      success: true,
      message: "Hủy đơn hàng thành công",
      order,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

/**
 * Get order status history
 * GET /api/order/:id/history
 */
export async function getOrderStatusHistory(req, res) {
  try {
    const orderId = parsePositiveInt(req.params.id);
    if (!orderId) {
      return res
        .status(400)
        .json({ success: false, message: "ID đơn hàng không hợp lệ" });
    }
    const userId = req.user?.id;
    const isAdmin = isAdminOrStaff(req.user);

    const history = await orderService.getOrderStatusHistory(
      orderId,
      userId,
      isAdmin,
    );

    return res.status(200).json({
      success: true,
      history,
    });
  } catch (error) {
    return handleError(res, error);
  }
}
