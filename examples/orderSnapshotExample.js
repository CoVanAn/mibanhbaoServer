// Example: How to create Order with complete snapshot

import prisma from "../config/prisma.js";

export const createOrderWithSnapshot = async (req, res) => {
  try {
    const userId = req.userId;
    const { addressId, cartId, customerNote } = req.body;

    // 1. Get user information for snapshot
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        phone: true,
      },
    });

    // 2. Get address information for snapshot
    const address = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    // 3. Get cart items with product details for snapshot
    const cartItems = await prisma.cartItem.findMany({
      where: { cartId },
      include: {
        product: {
          include: {
            media: {
              where: { position: 0 }, // First image
              take: 1,
            },
          },
        },
        variant: true,
      },
    });

    if (cartItems.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // 4. Calculate totals
    let itemsSubtotal = 0;
    const orderItems = [];

    for (const cartItem of cartItems) {
      // Get current price
      const currentPrice = await prisma.price.findFirst({
        where: {
          variantId: cartItem.variantId,
          isActive: true,
        },
        orderBy: { id: "desc" },
      });

      if (!currentPrice) {
        return res.status(400).json({
          message: `No price found for variant ${cartItem.variant.name}`,
        });
      }

      const lineTotal = parseFloat(currentPrice.amount) * cartItem.quantity;
      itemsSubtotal += lineTotal;

      // Prepare order item with complete snapshot
      orderItems.push({
        // Product snapshot
        productName: cartItem.product.name,
        productSlug: cartItem.product.slug,
        productDescription: cartItem.product.description,
        variantName: cartItem.variant.name,
        variantSku: cartItem.variant.sku,
        productImage: cartItem.product.media[0]?.url || null,

        // Pricing snapshot
        unitPrice: parseFloat(currentPrice.amount),
        quantity: cartItem.quantity,
        lineTotal: lineTotal,

        // Optional references (can be null later)
        productId: cartItem.productId,
        variantId: cartItem.variantId,
      });
    }

    const shippingFee = 30000; // 30k VND
    const total = itemsSubtotal + shippingFee;

    // 5. Create order with complete snapshots
    const order = await prisma.order.create({
      data: {
        code: `ORD-${Date.now()}`,

        // Customer snapshot
        userId: userId,
        customerName: user.name,
        customerEmail: user.email,
        customerPhone: user.phone,

        // Shipping address snapshot
        shippingName: address.name,
        shippingPhone: address.phone,
        shippingCompany: address.company,
        shippingAddress: address.addressLine,
        shippingProvince: address.province,
        shippingDistrict: address.district,
        shippingWard: address.ward,

        // Order details
        method: "DELIVERY",
        status: "PENDING",
        currency: "VND",
        itemsSubtotal: itemsSubtotal,
        shippingFee: shippingFee,
        discount: 0,
        total: total,
        customerNote: customerNote,

        // Optional references
        addressId: addressId, // Keep reference for admin

        // Create order items with snapshots
        items: {
          create: orderItems,
        },
      },
      include: {
        items: true,
      },
    });

    // 6. Clear cart after successful order
    await prisma.cartItem.deleteMany({
      where: { cartId },
    });

    res.json({
      success: true,
      order: {
        id: order.id,
        code: order.code,
        total: order.total,
        status: order.status,
        itemCount: order.items.length,
      },
    });
  } catch (error) {
    console.error("createOrderWithSnapshot error:", error);
    res.status(500).json({ message: "Failed to create order" });
  }
};

// Example: Get order with all snapshot data
export const getOrderWithSnapshot = async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    const userId = req.userId;

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: userId, // Ensure user can only see their orders
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Return complete snapshot data
    res.json({
      success: true,
      order: {
        // Order info
        id: order.id,
        code: order.code,
        status: order.status,
        createdAt: order.createdAt,

        // Customer snapshot (embedded)
        customer: {
          name: order.customerName,
          email: order.customerEmail,
          phone: order.customerPhone,
        },

        // Shipping address snapshot (embedded)
        shipping: {
          name: order.shippingName,
          phone: order.shippingPhone,
          company: order.shippingCompany,
          address: order.shippingAddress,
          province: order.shippingProvince,
          district: order.shippingDistrict,
          ward: order.shippingWard,
        },

        // Order totals
        itemsSubtotal: order.itemsSubtotal,
        shippingFee: order.shippingFee,
        discount: order.discount,
        total: order.total,

        // Order items with product snapshots
        items: order.items.map((item) => ({
          id: item.id,
          productName: item.productName,
          variantName: item.variantName,
          variantSku: item.variantSku,
          productImage: item.productImage,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          lineTotal: item.lineTotal,
        })),

        customerNote: order.customerNote,
      },
    });
  } catch (error) {
    console.error("getOrderWithSnapshot error:", error);
    res.status(500).json({ message: "Failed to get order" });
  }
};
