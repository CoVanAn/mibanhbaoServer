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
 * Create payment for order
 * POST /api/order/:id/payment
 */
export async function createPayment(req, res) {
  try {
    const orderId = parseInt(req.params.id, 10);
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
    const orderId = parseInt(req.params.id, 10);
    const paymentId = parseInt(req.params.paymentId, 10);
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
    const orderId = parseInt(req.params.id, 10);

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
    const orderId = parseInt(req.params.id, 10);
    const userId = req.user?.id;
    const { reason, amount } = req.body;

    const result = await orderService.processRefund(orderId, userId, {
      reason,
      amount,
    });

    return res.status(200).json({
      success: true,
      message: "Refund processed successfully",
      payment: result,
    });
  } catch (error) {
    return handleError(res, error);
  }
}
