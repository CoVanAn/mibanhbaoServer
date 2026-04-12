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

const parsePositiveIntOrDefault = (value, fallback) => {
  const parsed = parsePositiveInt(value);
  return parsed ?? fallback;
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
      message: "Đơn hàng đã được tạo thành công",
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
    const orderId = req.params.id;
    const userId = req.user?.id;
    const isAdmin = isAdminOrStaff(req.user);

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
    const parsedPage = parsePositiveIntOrDefault(page, 1);
    const parsedLimit = Math.min(parsePositiveIntOrDefault(limit, 10), 100);

    const result = await orderService.getUserOrders(userId, {
      page: parsedPage,
      limit: parsedLimit,
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
      userId: userId ? parsePositiveInt(userId) || undefined : undefined,
      startDate,
      endDate,
      search,
    };

    const parsedPage = parsePositiveIntOrDefault(page, 1);
    const parsedLimit = Math.min(parsePositiveIntOrDefault(limit, 10), 100);

    const result = await orderService.getAllOrders({
      page: parsedPage,
      limit: parsedLimit,
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
    const orderId = req.params.id;
    const userId = req.user?.id;
    const isAdmin = isAdminOrStaff(req.user);
    const { customerNote, internalNote } = req.body;

    const order = await orderService.updateOrderNote(orderId, userId, isAdmin, {
      customerNote,
      internalNote,
    });

    return res.status(200).json({
      success: true,
      message: "Ghi chú đơn hàng đã được cập nhật",
      order,
    });
  } catch (error) {
    return handleError(res, error);
  }
}
