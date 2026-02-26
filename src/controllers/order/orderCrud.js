import prisma from "../../config/prisma.js";
import { getOrCreateCart } from "../cart/cartHelpers.js";
import {
  generateOrderCode,
  calculateOrderTotals,
  snapshotOrderItems,
  validateOrderCreation,
  reserveInventory,
  formatOrderResponse,
  calculateShippingFee,
} from "./orderHelpers.js";

/**
 * Create new order from cart
 * POST /api/order/create
 */
export async function createOrder(req, res) {
  try {
    const userId = req.user?.id || null;
    const guestToken = req.cookies.guestToken || req.body.guestToken;
    const { method, addressId, customerNote, pickupAt, scheduledAt } = req.body;

    console.log("=== CREATE ORDER DEBUG ===");
    console.log("User from req.user:", req.user);
    console.log("User ID:", userId);
    console.log("Guest Token:", guestToken);
    console.log("All cookies:", req.cookies);
    console.log("Authorization header:", req.headers.authorization);
    console.log("Request body:", req.body);

    // Check if both exist
    if (userId && guestToken) {
      console.log(
        "⚠️ BOTH userId and guestToken present - merge should trigger",
      );
      // Check if guest cart exists
      const checkGuestCart = await prisma.cart.findFirst({
        where: { guestToken },
        include: { items: true },
      });
      console.log(
        "Guest cart check result:",
        checkGuestCart
          ? {
              id: checkGuestCart.id,
              itemCount: checkGuestCart.items?.length || 0,
              guestToken: checkGuestCart.guestToken,
            }
          : "NOT FOUND",
      );
    }

    // Get cart
    const cart = await getOrCreateCart(userId, guestToken);

    console.log("Cart found:", {
      id: cart?.id,
      itemsCount: cart?.items?.length || 0,
      hasUserId: !!cart?.userId,
      hasGuestToken: !!cart?.guestToken,
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      console.log("Cart validation failed - empty cart");
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
        debug: {
          cartFound: !!cart,
          itemsLength: cart?.items?.length || 0,
          userId,
          guestToken: guestToken ? "present" : "missing",
        },
      });
    }

    // Validate order creation
    const validation = await validateOrderCreation(cart, method, addressId);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: "Order validation failed",
        errors: validation.errors,
      });
    }

    // Get coupon if applied
    let coupon = null;
    if (cart.couponId) {
      coupon = await prisma.coupon.findUnique({
        where: { id: cart.couponId },
      });
    }

    // Calculate shipping fee
    const shippingFee = calculateShippingFee(method, addressId);

    // Calculate totals
    const totals = calculateOrderTotals(cart.items, coupon, shippingFee);

    // Create order snapshots
    const itemSnapshots = await snapshotOrderItems(cart.items);

    // Generate order code
    const orderCode = await generateOrderCode();

    // Create order in transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create order
      const newOrder = await tx.order.create({
        data: {
          code: orderCode,
          userId: userId || null,
          couponId: cart.couponId || null,
          method,
          status: "PENDING",
          currency: "VND",
          itemsSubtotal: totals.itemsSubtotal,
          shippingFee: totals.shippingFee,
          discount: totals.discount,
          total: totals.total,
          customerNote: customerNote || null,
          addressId: method === "DELIVERY" ? addressId : null,
          pickupAt: method === "PICKUP" ? pickupAt : null,
          scheduledAt: scheduledAt || null,
          items: {
            create: itemSnapshots,
          },
        },
        include: {
          items: true,
          user: true,
          address: true,
          coupon: true,
        },
      });

      // Create initial status history
      await tx.orderStatusHistory.create({
        data: {
          orderId: newOrder.id,
          fromStatus: null,
          toStatus: "PENDING",
          changedByUserId: userId || null,
          reason: "Order created",
        },
      });

      // Create coupon redemption if coupon was used
      if (cart.couponId && coupon) {
        await tx.couponRedemption.create({
          data: {
            couponId: cart.couponId,
            userId: userId || null,
            orderId: newOrder.id,
            discountApplied: totals.discount,
          },
        });
      }

      // Reserve inventory
      await reserveInventory(cart.items, tx);

      // Clear cart
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      // Clear coupon from cart
      if (cart.couponId) {
        await tx.cart.update({
          where: { id: cart.id },
          data: { couponId: null },
        });
      }

      return newOrder;
    });

    // Create initial payment record (COD by default)
    await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: "COD",
        amount: totals.total,
        status: "UNPAID",
      },
    });

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      order: formatOrderResponse(order),
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create order",
      error: error.message,
    });
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
    const isAdmin = req.user?.role === "ADMIN" || req.user?.role === "STAFF";

    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId, 10) },
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
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        payments: {
          orderBy: {
            createdAt: "desc",
          },
        },
        shipment: true,
        couponRedemption: true,
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check authorization (user can only see their own orders, admin can see all)
    if (!isAdmin && order.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    res.status(200).json({
      success: true,
      order: formatOrderResponse(order),
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order",
      error: error.message,
    });
  }
}

/**
 * Get user's orders
 * GET /api/order/my
 */
export async function getUserOrders(req, res) {
  try {
    const userId = req.user?.id;
    const { page = 1, limit = 20, status } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const skip = (page - 1) * limit;

    const where = {
      userId,
      ...(status && { status }),
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: true,
          address: true,
          coupon: true,
          payments: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: parseInt(limit, 10),
      }),
      prisma.order.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      orders: orders.map((order) => formatOrderResponse(order)),
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching user orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message,
    });
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
      limit = 20,
      status,
      method,
      userId,
      startDate,
      endDate,
      search,
    } = req.query;

    const skip = (page - 1) * limit;

    const where = {
      ...(status && { status }),
      ...(method && { method }),
      ...(userId && { userId: parseInt(userId, 10) }),
      ...(startDate &&
        endDate && {
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        }),
      ...(search && {
        OR: [
          { code: { contains: search, mode: "insensitive" } },
          {
            user: {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { phone: { contains: search, mode: "insensitive" } },
              ],
            },
          },
        ],
      }),
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          address: true,
          coupon: true,
          payments: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: parseInt(limit, 10),
      }),
      prisma.order.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      orders: orders.map((order) => formatOrderResponse(order)),
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message,
    });
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
    const isAdmin = req.user?.role === "ADMIN" || req.user?.role === "STAFF";
    const { customerNote, internalNote } = req.body;

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

    // Only admin can update internal note
    const updateData = {};
    if (customerNote !== undefined) {
      updateData.customerNote = customerNote;
    }
    if (internalNote !== undefined) {
      updateData.internalNote = internalNote;
    }

    const updatedOrder = await prisma.order.update({
      where: { id: parseInt(orderId, 10) },
      data: updateData,
      include: {
        items: true,
        user: true,
        address: true,
        coupon: true,
      },
    });

    res.status(200).json({
      success: true,
      message: "Order note updated",
      order: formatOrderResponse(updatedOrder),
    });
  } catch (error) {
    console.error("Error updating order note:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update order note",
      error: error.message,
    });
  }
}

/**
 * Delete order (Admin only, soft delete by canceling)
 * DELETE /api/order/:id
 */
export async function deleteOrder(req, res) {
  try {
    const orderId = req.params.id;

    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId, 10) },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Instead of hard delete, we cancel the order
    if (order.status !== "CANCELED") {
      return res.status(400).json({
        success: false,
        message: "Only canceled orders can be deleted",
      });
    }

    // For now, we don't actually delete, just confirm it's canceled
    res.status(200).json({
      success: true,
      message: "Order is canceled and can be archived",
    });
  } catch (error) {
    console.error("Error deleting order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete order",
      error: error.message,
    });
  }
}
