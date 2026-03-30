import prisma from "../../config/prisma.js";
import {
  getVariantWithOwnership,
  parsePositiveInt,
} from "./helpers.js";

// GET /api/product/:id/variants/:variantId/inventory
// GET /api/product/variant/:variantId/inventory
export const getInventory = async (req, res, next) => {
  try {
    const pid = req.params.id ? req.params.id : null;
    const vid = parsePositiveInt(req.params.variantId);

    const { variant } = await getVariantWithOwnership(vid, pid);
    if (!variant) {
      return res.status(404).json({ message: "Variant not found" });
    }

    const inventory = await prisma.inventory.findUnique({
      where: { variantId: vid },
    });

    return res.json({
      inventory: inventory || { variantId: vid, quantity: 0 },
    });
  } catch (err) {
    return next(err);
  }
};

// PATCH /api/product/:id/variants/:variantId/inventory
// PATCH /api/product/variant/:variantId/inventory
export const updateInventory = async (req, res, next) => {
  try {
    const pid = req.params.id ? req.params.id : null;
    const vid = parsePositiveInt(req.params.variantId);

    const { variant } = await getVariantWithOwnership(vid, pid);
    if (!variant) {
      return res.status(404).json({ message: "Variant not found" });
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
    return next(err);
  }
};
