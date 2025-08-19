import prisma from "../../config/prisma.js";

// GET /api/product/:id/variants/:variantId/inventory
// GET /api/product/variant/:variantId/inventory
export const getInventory = async (req, res) => {
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
// PATCH /api/product/variant/:variantId/inventory
export const updateInventory = async (req, res) => {
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

    const { quantity, safetyStock } = req.body;

    // At least one field is required
    if (quantity === undefined && safetyStock === undefined) {
      return res
        .status(400)
        .json({ message: "quantity or safetyStock required" });
    }

    // Prepare update data
    const updateData = {};
    const createData = { variantId: vid };

    // Validate and add quantity
    if (quantity !== undefined && quantity !== null) {
      const qty = Number(quantity);
      if (isNaN(qty) || qty < 0) {
        return res
          .status(400)
          .json({ message: "quantity must be a non-negative number" });
      }
      updateData.quantity = qty;
      createData.quantity = qty;
    }

    // Validate and add safetyStock
    if (safetyStock !== undefined && safetyStock !== null) {
      const safety = Number(safetyStock);
      if (isNaN(safety) || safety < 0) {
        return res
          .status(400)
          .json({ message: "safetyStock must be a non-negative number" });
      }
      updateData.safetyStock = safety;
      createData.safetyStock = safety;
    }

    const inventory = await prisma.inventory.upsert({
      where: { variantId: vid },
      update: updateData,
      create: createData,
    });

    return res.json({ success: true, inventory });
  } catch (err) {
    console.error("updateInventory error:", err);
    return res.status(500).json({ message: "error" });
  }
};
