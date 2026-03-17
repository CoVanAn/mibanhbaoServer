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
 * Create new order from cart
 * POST /api/order/create
 */
export async function createOrder(req, res) {
  try {
    const userId = req.user?.id || null;
    const guestToken = req.cookies.guestToken || req.body.guestToken;
    const { method, addressId, customerNote, pickupAt, scheduledAt } = req.body;

    const order = await orderService.createOrder({
      userId,
      guestToken,
      method,
      addressId,
      customerNote,
      pickupAt,
      scheduledAt,
    });

    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      order,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

/**
 * Get order by ID
 * GET /api/order/:id
 */
export async function getOrderById(req, res) {
  try {
    const orderId = parseInt(req.params.id, 10);
    const userId = req.user?.id;
    const isAdmin = req.user?.role === "ADMIN" || req.user?.role === "STAFF";

    const order = await orderService.getOrderById(orderId, userId, isAdmin);

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

/**
 * Get user's orders
 * GET /api/order/my
 */
export async function getUserOrders(req, res) {
  try {
    const userId = req.user?.id;
    const { page = 1, limit = 10, status } = req.query;

    const result = await orderService.getUserOrders(userId, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      status,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

/**
 * Get all orders (Admin only)
 * GET /api/order/list
 */
export async function getAllOrders(req, res) {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      method,
      userId,
      startDate,
      endDate,
      search,
    } = req.query;

    const filters = {
      status,
      method,
      userId: userId ? parseInt(userId, 10) : undefined,
      startDate,
      endDate,
      search,
    };

    const result = await orderService.getAllOrders({
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      ...filters,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

/**
 * Update order note
 * PATCH /api/order/:id/note
 */
export async function updateOrderNote(req, res) {
  try {
    const orderId = parseInt(req.params.id, 10);
    const userId = req.user?.id;
    const isAdmin = req.user?.role === "ADMIN" || req.user?.role === "STAFF";
    const { customerNote, internalNote } = req.body;

    const order = await orderService.updateOrderNote(orderId, userId, isAdmin, {
      customerNote,
      internalNote,
    });

    return res.status(200).json({
      success: true,
      message: "Order note updated",
      order,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

/**
 * Delete order (Admin only, soft delete by canceling)
 * DELETE /api/order/:id
 */
export async function deleteOrder(req, res) {
  try {
    const orderId = parseInt(req.params.id, 10);
    const isAdmin = req.user?.role === "ADMIN" || req.user?.role === "STAFF";

    await orderService.deleteOrder(orderId, isAdmin);

    return res.status(200).json({
      success: true,
      message: "Order is canceled and can be archived",
    });
  } catch (error) {
    return handleError(res, error);
  }
}
