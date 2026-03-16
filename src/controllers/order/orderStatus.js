import orderService from "../../services/order.service.js";

const handleError = (res, error) => {
  if (error.isOperational) {
    return res
      .status(error.statusCode)
      .json({ success: false, message: error.message, errors: error.errors });
  }
  console.error(error);
  return res
    .status(500)
    .json({ success: false, message: "Server error", error: error.message });
};

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
    const orderId = parseInt(req.params.id, 10);
    const userId = req.user?.id;
    const isAdmin = req.user?.role === "ADMIN" || req.user?.role === "STAFF";
    const { status, reason } = req.body;

    const order = await orderService.updateOrderStatus(
      orderId,
      userId,
      isAdmin,
      { status, reason },
    );

    return res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
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
    const orderId = parseInt(req.params.id, 10);
    const userId = req.user?.id;
    const isAdmin = req.user?.role === "ADMIN" || req.user?.role === "STAFF";
    const { reason } = req.body;

    const order = await orderService.cancelOrder(orderId, userId, isAdmin, {
      reason,
    });

    return res.status(200).json({
      success: true,
      message: "Order canceled successfully",
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
    const orderId = parseInt(req.params.id, 10);
    const userId = req.user?.id;
    const isAdmin = req.user?.role === "ADMIN" || req.user?.role === "STAFF";

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
