import prisma from "../config/prisma.js";
import {
  BadRequestError,
  NotFoundError,
  AuthorizationError,
  AuthenticationError,
} from "../exceptions/index.js";
import { getOrCreateCart } from "./cart.service.js";
import {
  emitOrderCreated,
  emitOrderStatusChanged,
  emitOrderNoteUpdated,
  emitOrderCanceled,
  emitOrderPaymentChanged,
} from "../realtime/orderEvents.js";

/**
 * Order Service
 * Handles business logic for order operations
 */
export class OrderService {
  // ──────────── Status Transitions ────────────

  STATUS_TRANSITIONS = {
    PENDING: ["CONFIRMED", "CANCELED"],
    CONFIRMED: ["PREPARING", "CANCELED"],
    PREPARING: ["READY", "CANCELED"],
    READY: ["OUT_FOR_DELIVERY", "COMPLETED", "CANCELED"],
    OUT_FOR_DELIVERY: ["COMPLETED", "CANCELED"],
    COMPLETED: ["REFUNDED"],
    CANCELED: [],
    REFUNDED: [],
  };

  PICKUP_STATUS_TRANSITIONS = {
    PENDING: ["CONFIRMED", "COMPLETED", "CANCELED"],
    CONFIRMED: ["COMPLETED", "CANCELED"],
    PREPARING: ["COMPLETED", "CANCELED"],
    READY: ["COMPLETED", "CANCELED"],
    OUT_FOR_DELIVERY: ["COMPLETED", "CANCELED"],
    COMPLETED: ["REFUNDED"],
    CANCELED: [],
    REFUNDED: [],
  };

  canTransitionStatus(currentStatus, newStatus, method = "DELIVERY") {
    const transitions =
      method === "PICKUP"
        ? this.PICKUP_STATUS_TRANSITIONS
        : this.STATUS_TRANSITIONS;
    const allowed = transitions[currentStatus] || [];
    return allowed.includes(newStatus);
  }

  // ──────────── Helpers ────────────

  async generateOrderCode() {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");

    const latestOrder = await prisma.order.findFirst({
      where: { code: { startsWith: `ORD-${dateStr}` } },
      orderBy: { code: "desc" },
    });

    let sequence = 1;
    if (latestOrder) {
      const lastSequence = parseInt(latestOrder.code.slice(-4), 10);
      sequence = lastSequence + 1;
    }

    return `ORD-${dateStr}-${sequence.toString().padStart(4, "0")}`;
  }

  calculateOrderTotals(cartItems, coupon = null, shippingFee = 0) {
    const itemsSubtotal = cartItems.reduce((sum, item) => {
      const price = item.unitPrice || 0;
      return sum + parseFloat(price) * item.quantity;
    }, 0);

    let discount = 0;
    if (coupon && coupon.isActive) {
      if (coupon.type === "PERCENT") {
        discount = (itemsSubtotal * coupon.value) / 100;
      } else if (coupon.type === "FIXED") {
        discount = coupon.value;
      }

      if (coupon.minSubtotal && itemsSubtotal < coupon.minSubtotal) {
        discount = 0;
      }
    }

    const total = itemsSubtotal + parseFloat(shippingFee) - discount;

    return {
      itemsSubtotal: parseFloat(itemsSubtotal.toFixed(2)),
      shippingFee: parseFloat(shippingFee.toFixed(2)),
      discount: parseFloat(discount.toFixed(2)),
      total: parseFloat(Math.max(0, total).toFixed(2)),
    };
  }

  async snapshotOrderItems(cartItems) {
    const snapshots = [];

    for (const item of cartItems) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { media: { where: { position: 0 }, take: 1 } },
      });

      const variant = await prisma.productVariant.findUnique({
        where: { id: item.variantId },
      });

      if (!product || !variant) {
        throw new BadRequestError(
          `Product or variant not found: productId=${item.productId}, variantId=${item.variantId}`,
        );
      }

      const unitPrice = item.unitPrice || 0;
      const lineTotal = parseFloat(unitPrice) * item.quantity;

      snapshots.push({
        productId: item.productId,
        variantId: item.variantId,
        nameSnapshot: product.name,
        variantSnapshot: variant.name,
        skuSnapshot: variant.sku,
        imageUrlSnapshot: product.media[0]?.url || null,
        modifiersSnapshot: null,
        unitPrice: parseFloat(unitPrice),
        quantity: item.quantity,
        lineTotal: parseFloat(lineTotal.toFixed(2)),
      });
    }

    return snapshots;
  }

  async validateOrderCreation(cart, method, addressId) {
    const errors = [];

    if (!cart.items || cart.items.length === 0) {
      errors.push("Cart is empty");
      return { valid: false, errors };
    }

    if (method === "DELIVERY") {
      if (!addressId) {
        errors.push("Delivery address is required");
      } else {
        const address = await prisma.address.findUnique({
          where: { id: addressId },
        });
        if (!address) {
          errors.push("Invalid delivery address");
        }
      }
    }

    for (const item of cart.items) {
      const inventory = await prisma.inventory.findUnique({
        where: { variantId: item.variantId },
      });

      if (!inventory) {
        errors.push(
          `Product variant ${item.variantId} has no inventory record`,
        );
        continue;
      }

      if (inventory.quantity < item.quantity) {
        const variant = await prisma.productVariant.findUnique({
          where: { id: item.variantId },
          include: { product: true },
        });
        errors.push(
          `Insufficient stock for ${variant.product.name} - ${variant.name}. Available: ${inventory.quantity}, Requested: ${item.quantity}`,
        );
      }

      const variant = await prisma.productVariant.findUnique({
        where: { id: item.variantId },
        include: { product: true },
      });

      if (!variant.isActive || !variant.product.isActive) {
        errors.push(
          `Product ${variant.product.name} - ${variant.name} is no longer available`,
        );
      }
    }

    return { valid: errors.length === 0, errors };
  }

  async reserveInventory(orderItems, tx = prisma) {
    const updates = orderItems.map((item) =>
      tx.inventory.update({
        where: { variantId: item.variantId },
        data: { quantity: { decrement: item.quantity } },
      }),
    );
    await Promise.all(updates);
  }

  async releaseInventory(orderItems, tx = prisma) {
    const updates = orderItems.map((item) =>
      tx.inventory.update({
        where: { variantId: item.variantId },
        data: { quantity: { increment: item.quantity } },
      }),
    );
    await Promise.all(updates);
  }

  calculateShippingFee(method, address = null) {
    if (method === "PICKUP") return 0;
    // TODO: Implement distance-based or weight-based calculation
    return 30000; // 30,000 VND flat rate
  }

  formatOrderResponse(order) {
    return {
      id: order.id,
      code: order.code,
      status: order.status,
      method: order.method,
      currency: order.currency,
      itemsSubtotal: parseFloat(order.itemsSubtotal),
      shippingFee: parseFloat(order.shippingFee),
      discount: parseFloat(order.discount),
      total: parseFloat(order.total),
      customerNote: order.customerNote,
      internalNote: order.internalNote,
      pickupAt: order.pickupAt,
      scheduledAt: order.scheduledAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      userId: order.userId,
      user: order.user
        ? {
            id: order.user.id,
            name: order.user.name,
            email: order.user.email,
            phone: order.user.phone,
          }
        : null,
      address: order.address
        ? {
            id: order.address.id,
            name: order.address.name,
            phone: order.address.phone,
            company: order.address.company,
            addressLine: order.address.addressLine,
            province: order.address.province,
            district: order.address.district,
            ward: order.address.ward,
          }
        : null,
      items: order.items
        ? order.items.map((item) => ({
            id: item.id,
            productId: item.productId,
            variantId: item.variantId,
            name: item.nameSnapshot,
            variant: item.variantSnapshot,
            sku: item.skuSnapshot,
            image: item.imageUrlSnapshot,
            unitPrice: parseFloat(item.unitPrice),
            quantity: item.quantity,
            lineTotal: parseFloat(item.lineTotal),
          }))
        : [],
      coupon: order.coupon
        ? {
            id: order.coupon.id,
            code: order.coupon.code,
            type: order.coupon.type,
            value: order.coupon.value,
          }
        : null,
      statusHistory: order.statusHistory
        ? order.statusHistory.map((history) => ({
            id: history.id,
            fromStatus: history.fromStatus,
            toStatus: history.toStatus,
            reason: history.reason,
            changedBy: history.changedBy
              ? { id: history.changedBy.id, name: history.changedBy.name }
              : null,
            createdAt: history.createdAt,
          }))
        : [],
      payments: order.payments
        ? order.payments.map((payment) => ({
            id: payment.id,
            provider: payment.provider,
            amount: parseFloat(payment.amount),
            status: payment.status,
            paidAt: payment.paidAt,
            createdAt: payment.createdAt,
          }))
        : [],
      shipment: order.shipment
        ? {
            id: order.shipment.id,
            carrier: order.shipment.carrier,
            trackingCode: order.shipment.trackingCode,
            status: order.shipment.status,
            shippedAt: order.shipment.shippedAt,
            deliveredAt: order.shipment.deliveredAt,
          }
        : null,
    };
  }

  // ──────────── CRUD Operations ────────────

  async createOrder({
    userId,
    guestToken,
    method,
    addressId,
    customerNote,
    pickupAt,
    scheduledAt,
  }) {
    const cart = await getOrCreateCart(userId, guestToken);

    if (!cart || !cart.items || cart.items.length === 0) {
      throw new BadRequestError("Cart is empty");
    }

    const validation = await this.validateOrderCreation(
      cart,
      method,
      addressId,
    );
    if (!validation.valid) {
      throw new BadRequestError("Order validation failed", validation.errors);
    }

    let coupon = null;
    if (cart.couponId) {
      coupon = await prisma.coupon.findUnique({ where: { id: cart.couponId } });
    }

    const shippingFee = this.calculateShippingFee(method, addressId);
    const totals = this.calculateOrderTotals(cart.items, coupon, shippingFee);
    const itemSnapshots = await this.snapshotOrderItems(cart.items);
    const orderCode = await this.generateOrderCode();

    const order = await prisma.$transaction(async (tx) => {
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
          items: { create: itemSnapshots },
        },
        include: { items: true, user: true, address: true, coupon: true },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: newOrder.id,
          fromStatus: null,
          toStatus: "PENDING",
          changedByUserId: userId || null,
          reason: "Order created",
        },
      });

      if (cart.couponId && coupon) {
        if (coupon.perUserLimit && userId) {
          const userActiveRedemptions = await tx.couponRedemption.count({
            where: { couponId: coupon.id, userId, status: "ACTIVE" },
          });
          if (userActiveRedemptions >= coupon.perUserLimit) {
            throw new BadRequestError(
              "Bạn đã sử dụng mã giảm giá này quá số lần cho phép",
            );
          }
        }

        const incrementResult = await tx.$executeRaw`
          UPDATE "Coupon"
          SET "usedCount" = "usedCount" + 1
          WHERE id = ${cart.couponId}
            AND "isActive" = true
            AND ("maxRedemptions" IS NULL OR "usedCount" < "maxRedemptions")
        `;

        if (incrementResult === 0) {
          throw new BadRequestError("Mã giảm giá không khả dụng");
        }

        await tx.couponRedemption.create({
          data: {
            couponId: cart.couponId,
            userId: userId || null,
            orderId: newOrder.id,
            discountApplied: totals.discount,
            status: "ACTIVE",
          },
        });
      }

      await this.reserveInventory(cart.items, tx);

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      if (cart.couponId) {
        await tx.cart.update({
          where: { id: cart.id },
          data: { couponId: null },
        });
      }

      return newOrder;
    });

    await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: "COD",
        amount: totals.total,
        status: "UNPAID",
      },
    });

    const response = this.formatOrderResponse(order);
    emitOrderCreated(response);

    return response;
  }

  async getOrderById(orderId, userId, isAdmin = false) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        user: true,
        address: true,
        coupon: true,
        statusHistory: {
          include: {
            changedBy: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        payments: { orderBy: { createdAt: "desc" } },
        shipment: true,
        couponRedemption: true,
      },
    });

    if (!order) throw new NotFoundError("Order");

    if (!isAdmin && order.userId !== userId) {
      throw new AuthorizationError("Access denied");
    }

    return this.formatOrderResponse(order);
  }

  async getUserOrders(userId, { page = 1, limit = 10, status }) {
    if (!userId) throw new AuthenticationError("Authentication required");

    const skip = (page - 1) * limit;
    const where = { userId, ...(status && { status }) };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: true,
          address: true,
          coupon: true,
          payments: { orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return {
      orders: orders.map((o) => this.formatOrderResponse(o)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAllOrders({
    page = 1,
    limit = 10,
    status,
    method,
    userId,
    startDate,
    endDate,
    search,
  }) {
    const skip = (page - 1) * limit;
    const trimmedSearch = String(search || "").trim();

    const where = {
      ...(status && { status }),
      ...(method && { method }),
      ...(userId && { userId }),
      ...(startDate &&
        endDate && {
          createdAt: { gte: new Date(startDate), lte: new Date(endDate) },
        }),
      ...(trimmedSearch && {
        OR: [
          { code: { contains: trimmedSearch, mode: "insensitive" } },
          {
            user: {
              OR: [
                { name: { contains: trimmedSearch, mode: "insensitive" } },
                { email: { contains: trimmedSearch, mode: "insensitive" } },
                { phone: { contains: trimmedSearch, mode: "insensitive" } },
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
          user: { select: { id: true, name: true, email: true, phone: true } },
          address: true,
          coupon: true,
          payments: { orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return {
      orders: orders.map((o) => this.formatOrderResponse(o)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateOrderNote(
    orderId,
    userId,
    isAdmin,
    { customerNote, internalNote },
  ) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) throw new NotFoundError("Order");

    if (!isAdmin && order.userId !== userId) {
      throw new AuthorizationError("Access denied");
    }

    const data = {};
    if (customerNote !== undefined) data.customerNote = customerNote;
    if (internalNote !== undefined && isAdmin) data.internalNote = internalNote;

    if (!Object.keys(data).length) {
      throw new BadRequestError("No fields to update");
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data,
      include: {
        items: true,
        user: true,
        address: true,
        coupon: true,
        statusHistory: {
          include: { changedBy: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
        },
        payments: { orderBy: { createdAt: "desc" } },
      },
    });

    const response = this.formatOrderResponse(updated);
    emitOrderNoteUpdated({ order: response, changedByUserId: userId });

    return response;
  }

  // ──────────── Status Management ────────────

  async updateOrderStatus(orderId, userId, isAdmin, { status, reason }) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) throw new NotFoundError("Order");

    if (!this.canTransitionStatus(order.status, status, order.method)) {
      const transitions =
        order.method === "PICKUP"
          ? this.PICKUP_STATUS_TRANSITIONS
          : this.STATUS_TRANSITIONS;

      throw new BadRequestError(
        `Cannot transition from ${order.status} to ${status}`,
        transitions[order.status],
      );
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status, updatedAt: new Date() },
        include: {
          items: true,
          user: true,
          address: true,
          coupon: true,
          statusHistory: {
            include: { changedBy: { select: { id: true, name: true } } },
            orderBy: { createdAt: "desc" },
          },
          payments: true,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: updated.id,
          fromStatus: order.status,
          toStatus: status,
          changedByUserId: userId || null,
          reason: reason || null,
        },
      });

      if (status === "CANCELED") {
        await this.releaseInventory(order.items, tx);

        if (updated.couponId) {
          await tx.couponRedemption.updateMany({
            where: { orderId: updated.id, status: "ACTIVE" },
            data: { status: "RELEASED" },
          });
          await tx.$executeRaw`
            UPDATE "Coupon"
            SET "usedCount" = GREATEST("usedCount" - 1, 0)
            WHERE id = ${updated.couponId}
          `;
        }
      }

      if (status === "COMPLETED") {
        await tx.payment.updateMany({
          where: { orderId: updated.id, provider: "COD" },
          data: { status: "PAID", paidAt: new Date() },
        });
      }

      return updated;
    });

    const response = this.formatOrderResponse(updatedOrder);
    emitOrderStatusChanged({
      order: response,
      previousStatus: order.status,
      reason,
      changedByUserId: userId,
    });

    return response;
  }

  async cancelOrder(orderId, userId, isAdmin, { reason }) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) throw new NotFoundError("Order");

    if (!isAdmin && order.userId !== userId) {
      throw new AuthorizationError("Access denied");
    }

    if (!this.canTransitionStatus(order.status, "CANCELED")) {
      throw new BadRequestError(
        `Order cannot be canceled from ${order.status} status`,
      );
    }

    if (!isAdmin && !["PENDING", "CONFIRMED"].includes(order.status)) {
      throw new BadRequestError(
        'Chỉ hủy được đơn hàng khi ở trạng thái "Chờ xác nhận" hoặc "Đã xác nhận"',
      );
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status: "CANCELED", updatedAt: new Date() },
        include: {
          items: true,
          user: true,
          address: true,
          coupon: true,
          statusHistory: {
            include: { changedBy: { select: { id: true, name: true } } },
            orderBy: { createdAt: "desc" },
          },
          payments: true,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: updated.id,
          fromStatus: order.status,
          toStatus: "CANCELED",
          changedByUserId: userId || null,
          reason: reason || "Canceled by user",
        },
      });

      await this.releaseInventory(order.items, tx);

      if (order.couponId) {
        await tx.couponRedemption.updateMany({
          where: { orderId: updated.id, status: "ACTIVE" },
          data: { status: "RELEASED" },
        });
        await tx.$executeRaw`
          UPDATE "Coupon"
          SET "usedCount" = GREATEST("usedCount" - 1, 0)
          WHERE id = ${order.couponId}
        `;
      }

      await tx.payment.updateMany({
        where: { orderId: updated.id },
        data: { status: "FAILED" },
      });

      return updated;
    });

    const response = this.formatOrderResponse(updatedOrder);
    emitOrderCanceled({
      order: response,
      reason,
      changedByUserId: userId,
    });

    return response;
  }

  async getOrderStatusHistory(orderId, userId, isAdmin) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundError("Order");

    if (!isAdmin && order.userId !== userId) {
      throw new AuthorizationError("Access denied");
    }

    const history = await prisma.orderStatusHistory.findMany({
      where: { orderId },
      include: { changedBy: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });

    return history.map((h) => ({
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
    }));
  }

  // ──────────── Payment Operations ────────────

  async createPayment(orderId, { provider, amount, providerRef }) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundError("Order");

    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        provider,
        providerRef: providerRef || null,
        amount: amount || order.total,
        status: "UNPAID",
      },
    });

    return {
      id: payment.id,
      provider: payment.provider,
      amount: parseFloat(payment.amount),
      status: payment.status,
      createdAt: payment.createdAt,
    };
  }

  async updatePaymentStatus(orderId, paymentId, { status, paidAt }) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) throw new NotFoundError("Payment");

    if (payment.orderId !== orderId) {
      throw new BadRequestError("Khoản thanh toán không thuộc về đơn hàng này");
    }

    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status,
        ...(status === "PAID" && {
          paidAt: paidAt ? new Date(paidAt) : new Date(),
        }),
      },
    });

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, code: true, userId: true },
    });

    await prisma.paymentEvent.create({
      data: {
        paymentId: updatedPayment.id,
        type: `STATUS_${status}`,
        occurredAt: new Date(),
      },
    });

    const paymentResponse = {
      id: updatedPayment.id,
      provider: updatedPayment.provider,
      amount: parseFloat(updatedPayment.amount),
      status: updatedPayment.status,
      paidAt: updatedPayment.paidAt,
      createdAt: updatedPayment.createdAt,
    };

    emitOrderPaymentChanged({
      orderId,
      orderCode: order?.code || null,
      userId: order?.userId || null,
      payment: paymentResponse,
    });

    return paymentResponse;
  }

  async getOrderPayments(orderId) {
    const payments = await prisma.payment.findMany({
      where: { orderId },
      include: { events: { orderBy: { occurredAt: "desc" } } },
      orderBy: { createdAt: "desc" },
    });

    return payments.map((payment) => ({
      id: payment.id,
      provider: payment.provider,
      amount: parseFloat(payment.amount),
      status: payment.status,
      paidAt: payment.paidAt,
      providerRef: payment.providerRef,
      createdAt: payment.createdAt,
      events: payment.events.map((e) => ({
        id: e.id,
        type: e.type,
        occurredAt: e.occurredAt,
        metadata: e.metadata,
      })),
    }));
  }

  async processRefund(orderId, userId, { amount, reason }) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });

    if (!order) throw new NotFoundError("Order");

    if (order.status !== "CANCELED" && order.status !== "COMPLETED") {
      throw new BadRequestError(
        "Chỉ có thể hoàn tiền cho đơn hàng đã bị hủy hoặc đã hoàn thành",
      );
    }

    const paidPayment = order.payments.find((p) => p.status === "PAID");
    if (!paidPayment) {
      throw new BadRequestError(
        "Không tìm thấy khoản thanh toán đã được thanh toán để hoàn tiền",
      );
    }

    const refundAmount = amount || paidPayment.amount;

    const result = await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: "REFUNDED" },
      });

      const updatedPayment = await tx.payment.update({
        where: { id: paidPayment.id },
        data: { status: "REFUNDED" },
      });

      await tx.paymentEvent.create({
        data: {
          paymentId: updatedPayment.id,
          type: "REFUND_PROCESSED",
          occurredAt: new Date(),
          metadata: { amount: parseFloat(refundAmount), reason },
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: "REFUNDED",
          changedByUserId: userId || null,
          reason: reason || "Refund processed",
        },
      });

      return updatedPayment;
    });

    return {
      id: result.id,
      status: result.status,
    };
  }
}

export default new OrderService();
