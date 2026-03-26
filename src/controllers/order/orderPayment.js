import orderService from "../../services/order.service.js";
import { createControllerErrorHandler } from "../../utils/controllerError.js";
import { parsePositiveInt } from "../../utils/id.js";

const handleError = createControllerErrorHandler({
  defaultMessage: "Server error",
  includeOperationalErrors: true,
  includeOperationalDetails: true,
  includeErrorDetails: true,
});

/**
 * Create payment for order
 * POST /api/order/:id/payment
 */
export async function createPayment(req, res) {
  try {
    const orderId = parsePositiveInt(req.params.id);
    if (!orderId) {
      return res
        .status(400)
        .json({ success: false, message: "ID đơn hàng không hợp lệ" });
    }
    const { provider, amount, providerRef } = req.body;

    const payment = await orderService.createPayment(orderId, {
      provider,
      amount,
      providerRef,
    });

    return res.status(201).json({
      success: true,
      message: "Payment created",
      payment,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

/**
 * Update payment status
 * PATCH /api/order/:id/payment/:paymentId
 */
export async function updatePaymentStatus(req, res) {
  try {
    const orderId = parsePositiveInt(req.params.id);
    const paymentId = parsePositiveInt(req.params.paymentId);
    if (!orderId || !paymentId) {
      return res
        .status(400)
        .json({
          success: false,
          message: "ID đơn hàng hoặc ID thanh toán không hợp lệ",
        });
    }
    const { status, paidAt } = req.body;

    const payment = await orderService.updatePaymentStatus(orderId, paymentId, {
      status,
      paidAt,
    });

    return res.status(200).json({
      success: true,
      message: "Payment status updated",
      payment,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

/**
 * Get order payments
 * GET /api/order/:id/payments
 */
export async function getOrderPayments(req, res) {
  try {
    const orderId = parsePositiveInt(req.params.id);
    if (!orderId) {
      return res
        .status(400)
        .json({ success: false, message: "ID đơn hàng không hợp lệ" });
    }

    const payments = await orderService.getOrderPayments(orderId);

    return res.status(200).json({
      success: true,
      payments,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

/**
 * Process refund
 * POST /api/order/:id/refund
 */
export async function processRefund(req, res) {
  try {
    const orderId = parsePositiveInt(req.params.id);
    if (!orderId) {
      return res
        .status(400)
        .json({ success: false, message: "ID đơn hàng không hợp lệ" });
    }
    const userId = req.user?.id;
    const { reason, amount } = req.body;

    const result = await orderService.processRefund(orderId, userId, {
      reason,
      amount,
    });

    return res.status(200).json({
      success: true,
      message: "Hoàn tiền đã được xử lý",
      payment: result,
    });
  } catch (error) {
    return handleError(res, error);
  }
}
