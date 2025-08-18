import prisma from "../../config/prisma.js";

// GET /api/product/:id/variants/:variantId/inventory
export const getInventory = async (req, res) => {
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

    const inventory = await prisma.inventory.findUnique({
      where: { variantId: vid },
    });

    return res.json({
      inventory: inventory || { variantId: vid, quantity: 0 },
    });
  } catch (err) {
    console.error("getInventory error:", err);
    return res.status(500).json({ message: "error" });
  }
};

// PATCH /api/product/:id/variants/:variantId/inventory
export const updateInventory = async (req, res) => {
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

    const { quantity } = req.body;
    if (quantity === undefined || quantity === null) {
      return res.status(400).json({ message: "quantity required" });
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty < 0) {
      return res
        .status(400)
        .json({ message: "quantity must be a non-negative number" });
    }

    const inventory = await prisma.inventory.upsert({
      where: { variantId: vid },
      update: { quantity: qty },
      create: { variantId: vid, quantity: qty },
    });

    return res.json({ success: true, inventory });
  } catch (err) {
    console.error("updateInventory error:", err);
    return res.status(500).json({ message: "error" });
  }
};
