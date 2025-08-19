import prisma from "../../config/prisma.js";

// POST /api/product/:id/variants/:variantId/price
export const setVariantPrice = async (req, res) => {
  try {
    const pid = Number(req.params.id);
    const vid = Number(req.params.variantId);
    if (!pid || !vid)
      return res.status(400).json({ message: "invalid id or variantId" });

    const variant = await prisma.productVariant.findUnique({
      where: { id: vid },
    });
    if (!variant || variant.productId !== pid) {
      return res.status(404).json({ message: "Variant not found" });
    }

    const { amount, startsAt, endsAt } = req.body;
    if (amount === undefined || amount === null) {
      return res.status(400).json({ message: "amount required" });
    }

    const amountStr = String(amount).trim();
    if (isNaN(Number(amountStr))) {
      return res.status(400).json({ message: "amount must be a number" });
    }

    // Prepare price data
    const priceData = {
      variantId: vid,
      amount: amountStr,
      isActive: true,
    };

    // Add optional datetime fields
    if (startsAt !== undefined) {
      priceData.startsAt = startsAt ? new Date(startsAt) : null;
    }
    if (endsAt !== undefined) {
      priceData.endsAt = endsAt ? new Date(endsAt) : null;
    }

    // Deactivate old prices
    await prisma.price.updateMany({
      where: { variantId: vid },
      data: { isActive: false },
    });

    // Create new price
    const price = await prisma.price.create({
      data: priceData,
    });

    return res.json({ success: true, id: price.id });
  } catch (err) {
    console.error("setVariantPrice error:", err);
    return res.status(500).json({ message: "error" });
  }
};

// GET /api/product/:id/variants/:variantId/prices
// GET /api/product/variant/:variantId/prices
export const getVariantPrices = async (req, res) => {
  try {
    const pid = req.params.id ? Number(req.params.id) : null;
    const vid = Number(req.params.variantId);

    if (!vid) {
      return res.status(400).json({ message: "invalid variantId" });
    }

    const variant = await prisma.productVariant.findUnique({
      where: { id: vid },
    });

    if (!variant) {
      return res.status(404).json({ message: "Variant not found" });
    }

    // If product ID provided, validate ownership
    if (pid && variant.productId !== pid) {
      return res
        .status(404)
        .json({ message: "Variant not found in this product" });
    }

    const prices = await prisma.price.findMany({
      where: { variantId: vid },
      orderBy: [
        { isActive: "desc" }, // Active prices first
        { id: "desc" }, // Then by creation order (newest first)
      ],
    });

    return res.json({ prices });
  } catch (err) {
    console.error("getVariantPrices error:", err);
    return res.status(500).json({ message: "error" });
  }
};

// PATCH /api/product/:id/variants/:variantId/price
export const updateVariantPrice = async (req, res) => {
  try {
    const pid = Number(req.params.id);
    const vid = Number(req.params.variantId);
    if (!pid || !vid)
      return res.status(400).json({ message: "invalid id or variantId" });

    const variant = await prisma.productVariant.findUnique({
      where: { id: vid },
    });
    if (!variant || variant.productId !== pid) {
      return res.status(404).json({ message: "Variant not found" });
    }

    // Find the current active price
    const currentPrice = await prisma.price.findFirst({
      where: {
        variantId: vid,
        isActive: true,
      },
      orderBy: { id: "desc" },
    });

    if (!currentPrice) {
      return res
        .status(404)
        .json({ message: "No active price found for this variant" });
    }

    const { amount, startsAt, endsAt, isActive } = req.body;
    const updateData = {};

    // Update amount if provided
    if (amount !== undefined && amount !== null) {
      const amountStr = String(amount).trim();
      if (isNaN(Number(amountStr))) {
        return res.status(400).json({ message: "amount must be a number" });
      }
      updateData.amount = amountStr;
    }

    // Update datetime fields if provided
    if (startsAt !== undefined) {
      updateData.startsAt = startsAt ? new Date(startsAt) : null;
    }
    if (endsAt !== undefined) {
      updateData.endsAt = endsAt ? new Date(endsAt) : null;
    }
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    // Update the current active price
    const updatedPrice = await prisma.price.update({
      where: { id: currentPrice.id },
      data: updateData,
    });

    return res.json({ success: true, price: updatedPrice });
  } catch (err) {
    console.error("updateVariantPrice error:", err);
    return res.status(500).json({ message: "error" });
  }
};
