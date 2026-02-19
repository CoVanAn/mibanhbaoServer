import prisma from "../../config/prisma.js";

/**
 * Create payment for order
 * POST /api/order/:id/payment
 */
export async function createPayment(req, res) {
  try {
    const orderId = req.params.id;
    const { provider, amount, providerRef } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId, 10) },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        provider,
        providerRef: providerRef || null,
        amount: amount || order.total,
        status: "UNPAID",
      },
    });

    res.status(201).json({
      success: true,
      message: "Payment created",
      payment: {
        id: payment.id,
        provider: payment.provider,
        amount: parseFloat(payment.amount),
        status: payment.status,
        createdAt: payment.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating payment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create payment",
      error: error.message,
    });
  }
}

/**
 * Update payment status
 * PATCH /api/order/:id/payment/:paymentId
 */
export async function updatePaymentStatus(req, res) {
  try {
    const { id: orderId, paymentId } = req.params;
    const { status, paidAt } = req.body;

    const payment = await prisma.payment.findUnique({
      where: { id: parseInt(paymentId, 10) },
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    if (payment.orderId !== parseInt(orderId, 10)) {
      return res.status(400).json({
        success: false,
        message: "Payment does not belong to this order",
      });
    }

    const updatedPayment = await prisma.payment.update({
      where: { id: parseInt(paymentId, 10) },
      data: {
        status,
        ...(status === "PAID" && {
          paidAt: paidAt ? new Date(paidAt) : new Date(),
        }),
      },
    });

    // Create payment event
    await prisma.paymentEvent.create({
      data: {
        paymentId: updatedPayment.id,
        type: `STATUS_${status}`,
        occurredAt: new Date(),
      },
    });

    res.status(200).json({
      success: true,
      message: "Payment status updated",
      payment: {
        id: updatedPayment.id,
        provider: updatedPayment.provider,
        amount: parseFloat(updatedPayment.amount),
        status: updatedPayment.status,
        paidAt: updatedPayment.paidAt,
        createdAt: updatedPayment.createdAt,
      },
    });
  } catch (error) {
    console.error("Error updating payment status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update payment status",
      error: error.message,
    });
  }
}

/**
 * Get order payments
 * GET /api/order/:id/payments
 */
export async function getOrderPayments(req, res) {
  try {
    const orderId = req.params.id;

    const payments = await prisma.payment.findMany({
      where: {
        orderId: parseInt(orderId, 10),
      },
      include: {
        events: {
          orderBy: {
            occurredAt: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({
      success: true,
      payments: payments.map((payment) => ({
        id: payment.id,
        provider: payment.provider,
        providerRef: payment.providerRef,
        amount: parseFloat(payment.amount),
        status: payment.status,
        paidAt: payment.paidAt,
        createdAt: payment.createdAt,
        events: payment.events.map((event) => ({
          id: event.id,
          type: event.type,
          occurredAt: event.occurredAt,
        })),
      })),
    });
  } catch (error) {
    console.error("Error fetching order payments:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order payments",
      error: error.message,
    });
  }
}

/**
 * Process refund
 * POST /api/order/:id/refund
 */
export async function processRefund(req, res) {
  try {
    const orderId = req.params.id;
    const { reason, amount } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId, 10) },
      include: {
        payments: true,
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.status !== "CANCELED" && order.status !== "COMPLETED") {
      return res.status(400).json({
        success: false,
        message: "Only canceled or completed orders can be refunded",
      });
    }

    // Find paid payment
    const paidPayment = order.payments.find((p) => p.status === "PAID");
    if (!paidPayment) {
      return res.status(400).json({
        success: false,
        message: "No paid payment found for this order",
      });
    }

    // Process refund in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update order status to REFUNDED
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "REFUNDED",
        },
      });

      // Update payment status
      const updatedPayment = await tx.payment.update({
        where: { id: paidPayment.id },
        data: {
          status: "REFUNDED",
        },
      });

      // Create payment event
      await tx.paymentEvent.create({
        data: {
          paymentId: updatedPayment.id,
          type: "REFUND_PROCESSED",
          occurredAt: new Date(),
          raw: {
            reason,
            amount: amount || order.total,
          },
        },
      });

      // Create status history
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: "REFUNDED",
          changedByUserId: req.user?.id || null,
          reason: reason || "Refund processed",
        },
      });

      return updatedPayment;
    });

    res.status(200).json({
      success: true,
      message: "Refund processed successfully",
      payment: {
        id: result.id,
        status: result.status,
      },
    });
  } catch (error) {
    console.error("Error processing refund:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process refund",
      error: error.message,
    });
  }
}
