import prisma from "../../config/prisma.js";
import { releaseInventory, formatOrderResponse } from "./orderHelpers.js";

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
    const orderId = req.params.id;
    const userId = req.user?.id;
    const { status, reason } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId, 10) },
      include: {
        items: true,
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if transition is valid
    if (!canTransitionStatus(order.status, status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition from ${order.status} to ${status}`,
        allowedTransitions: STATUS_TRANSITIONS[order.status],
      });
    }

    // Update order status in transaction
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Update order
      const updated = await tx.order.update({
        where: { id: parseInt(orderId, 10) },
        data: {
          status,
          updatedAt: new Date(),
        },
        include: {
          items: true,
          user: true,
          address: true,
          coupon: true,
          statusHistory: {
            include: {
              changedBy: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          },
          payments: true,
        },
      });

      // Create status history
      await tx.orderStatusHistory.create({
        data: {
          orderId: updated.id,
          fromStatus: order.status,
          toStatus: status,
          changedByUserId: userId || null,
          reason: reason || null,
        },
      });

      // Release inventory if order is canceled
      if (status === "CANCELED") {
        await releaseInventory(order.items, tx);
      }

      // Update payment status if order is completed
      if (status === "COMPLETED") {
        await tx.payment.updateMany({
          where: {
            orderId: updated.id,
            provider: "COD",
          },
          data: {
            status: "PAID",
            paidAt: new Date(),
          },
        });
      }

      return updated;
    });

    res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      order: formatOrderResponse(updatedOrder),
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update order status",
      error: error.message,
    });
  }
}

/**
 * Cancel order
 * POST /api/order/:id/cancel
 */
export async function cancelOrder(req, res) {
  try {
    const orderId = req.params.id;
    const userId = req.user?.id;
    const isAdmin = req.user?.role === "ADMIN" || req.user?.role === "STAFF";
    const { reason } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId, 10) },
      include: {
        items: true,
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check authorization (user can only cancel their own orders)
    if (!isAdmin && order.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Check if order can be canceled
    if (!canTransitionStatus(order.status, "CANCELED")) {
      return res.status(400).json({
        success: false,
        message: `Order cannot be canceled from ${order.status} status`,
      });
    }

    // User can only cancel PENDING or CONFIRMED orders
    if (!isAdmin && !["PENDING", "CONFIRMED"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: "You can only cancel pending or confirmed orders",
      });
    }

    // Cancel order in transaction
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Update order status
      const updated = await tx.order.update({
        where: { id: parseInt(orderId, 10) },
        data: {
          status: "CANCELED",
          updatedAt: new Date(),
        },
        include: {
          items: true,
          user: true,
          address: true,
          coupon: true,
          statusHistory: {
            include: {
              changedBy: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          },
          payments: true,
        },
      });

      // Create status history
      await tx.orderStatusHistory.create({
        data: {
          orderId: updated.id,
          fromStatus: order.status,
          toStatus: "CANCELED",
          changedByUserId: userId || null,
          reason: reason || "Canceled by user",
        },
      });

      // Release inventory
      await releaseInventory(order.items, tx);

      // Update payment status
      await tx.payment.updateMany({
        where: {
          orderId: updated.id,
        },
        data: {
          status: "FAILED",
        },
      });

      return updated;
    });

    res.status(200).json({
      success: true,
      message: "Order canceled successfully",
      order: formatOrderResponse(updatedOrder),
    });
  } catch (error) {
    console.error("Error canceling order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to cancel order",
      error: error.message,
    });
  }
}

/**
 * Get order status history
 * GET /api/order/:id/history
 */
export async function getOrderStatusHistory(req, res) {
  try {
    const orderId = req.params.id;
    const userId = req.user?.id;
    const isAdmin = req.user?.role === "ADMIN" || req.user?.role === "STAFF";

    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId, 10) },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check authorization
    if (!isAdmin && order.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const history = await prisma.orderStatusHistory.findMany({
      where: {
        orderId: parseInt(orderId, 10),
      },
      include: {
        changedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    res.status(200).json({
      success: true,
      history: history.map((h) => ({
        id: h.id,
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        reason: h.reason,
        changedBy: h.changedBy
          ? {
              id: h.changedBy.id,
              name: h.changedBy.name,
              email: h.changedBy.email,
            }
          : null,
        createdAt: h.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching order status history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order status history",
      error: error.message,
    });
  }
}
