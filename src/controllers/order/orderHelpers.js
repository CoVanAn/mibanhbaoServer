import prisma from "../../config/prisma.js";

/**
 * Generate unique order code
 * Format: ORD-YYYYMMDD-XXXX
 */
export async function generateOrderCode() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");

  // Find the latest order today
  const latestOrder = await prisma.order.findFirst({
    where: {
      code: {
        startsWith: `ORD-${dateStr}`,
      },
    },
    orderBy: {
      code: "desc",
    },
  });

  let sequence = 1;
  if (latestOrder) {
    const lastSequence = parseInt(latestOrder.code.slice(-4), 10);
    sequence = lastSequence + 1;
  }

  const sequenceStr = sequence.toString().padStart(4, "0");
  return `ORD-${dateStr}-${sequenceStr}`;
}

/**
 * Calculate order totals from cart items
 */
export function calculateOrderTotals(
  cartItems,
  coupon = null,
  shippingFee = 0,
) {
  // Calculate items subtotal
  const itemsSubtotal = cartItems.reduce((sum, item) => {
    const price = item.unitPrice || 0;
    return sum + parseFloat(price) * item.quantity;
  }, 0);

  // Calculate discount from coupon
  let discount = 0;
  if (coupon && coupon.isActive) {
    if (coupon.type === "PERCENT") {
      discount = (itemsSubtotal * coupon.value) / 100;
    } else if (coupon.type === "FIXED") {
      discount = coupon.value;
    }

    // Check min subtotal requirement
    if (coupon.minSubtotal && itemsSubtotal < coupon.minSubtotal) {
      discount = 0;
    }
  }

  // Calculate total
  const total = itemsSubtotal + parseFloat(shippingFee) - discount;

  return {
    itemsSubtotal: parseFloat(itemsSubtotal.toFixed(2)),
    shippingFee: parseFloat(shippingFee.toFixed(2)),
    discount: parseFloat(discount.toFixed(2)),
    total: parseFloat(Math.max(0, total).toFixed(2)),
  };
}

/**
 * Create order item snapshots from cart items
 */
export async function snapshotOrderItems(cartItems) {
  const snapshots = [];

  for (const item of cartItems) {
    // Get product and variant details
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      include: {
        media: {
          where: { position: 0 },
          take: 1,
        },
      },
    });

    const variant = await prisma.productVariant.findUnique({
      where: { id: item.variantId },
    });

    if (!product || !variant) {
      throw new Error(
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
      modifiersSnapshot: null, // For future use
      unitPrice: parseFloat(unitPrice),
      quantity: item.quantity,
      lineTotal: parseFloat(lineTotal.toFixed(2)),
    });
  }

  return snapshots;
}

/**
 * Validate cart before creating order
 */
export async function validateOrderCreation(cart, method, addressId) {
  const errors = [];

  // Check if cart has items
  if (!cart.items || cart.items.length === 0) {
    errors.push("Cart is empty");
    return { valid: false, errors };
  }

  // Check address for delivery
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

  // Check inventory for each item
  for (const item of cart.items) {
    const inventory = await prisma.inventory.findUnique({
      where: { variantId: item.variantId },
    });

    if (!inventory) {
      errors.push(`Product variant ${item.variantId} has no inventory record`);
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

    // Check if variant is active
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

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Reserve inventory for order
 */
export async function reserveInventory(orderItems, tx = prisma) {
  const updates = [];

  for (const item of orderItems) {
    const update = tx.inventory.update({
      where: { variantId: item.variantId },
      data: {
        quantity: {
          decrement: item.quantity,
        },
      },
    });
    updates.push(update);
  }

  await Promise.all(updates);
}

/**
 * Release inventory (when order is canceled)
 */
export async function releaseInventory(orderItems, tx = prisma) {
  const updates = [];

  for (const item of orderItems) {
    const update = tx.inventory.update({
      where: { variantId: item.variantId },
      data: {
        quantity: {
          increment: item.quantity,
        },
      },
    });
    updates.push(update);
  }

  await Promise.all(updates);
}

/**
 * Format order response
 */
export function formatOrderResponse(order) {
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
            ? {
                id: history.changedBy.id,
                name: history.changedBy.name,
              }
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

/**
 * Calculate shipping fee based on method and address
 * TODO: Implement actual shipping calculation logic
 */
export function calculateShippingFee(method, address = null) {
  if (method === "PICKUP") {
    return 0;
  }

  // Simple flat rate for now
  // TODO: Implement distance-based or weight-based calculation
  return 30000; // 30,000 VND
}
