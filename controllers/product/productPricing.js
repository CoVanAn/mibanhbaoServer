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

    const { amount } = req.body;
    if (amount === undefined || amount === null) {
      return res.status(400).json({ message: "amount required" });
    }

    const amountStr = String(amount).trim();
    if (isNaN(Number(amountStr))) {
      return res.status(400).json({ message: "amount must be a number" });
    }

    // Deactivate old prices
    await prisma.price.updateMany({
      where: { variantId: vid },
      data: { isActive: false },
    });

    // Create new price
    const price = await prisma.price.create({
      data: {
        variantId: vid,
        amount: amountStr,
        isActive: true,
      },
    });

    return res.json({ success: true, id: price.id });
  } catch (err) {
    console.error("setVariantPrice error:", err);
    return res.status(500).json({ message: "error" });
  }
};

// GET /api/product/:id/variants/:variantId/prices
export const getVariantPrices = async (req, res) => {
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

    const prices = await prisma.price.findMany({
      where: { variantId: vid },
      orderBy: { updatedAt: "desc" },
    });

    return res.json({ prices });
  } catch (err) {
    console.error("getVariantPrices error:", err);
    return res.status(500).json({ message: "error" });
  }
};
