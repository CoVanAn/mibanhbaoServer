import prisma from "../../config/prisma.js";
import { createInventoryForVariant } from "../../utils/inventoryHelpers.js";

// POST /api/product/:id/variants
export const createVariant = async (req, res) => {
  try {
    console.log("=== CREATE VARIANT DEBUG ===");
    console.log("Params:", req.params);
    console.log("Body:", req.body);
    console.log("User:", req.user);

    const pid = Number(req.params.id);
    if (!pid) return res.status(400).json({ message: "invalid id" });

    const product = await prisma.product.findUnique({ where: { id: pid } });
    if (!product) return res.status(404).json({ message: "Product not found" });

    const { name, sku, isActive = true, initialStock = 0, safetyStock = 0 } = req.body;
    if (!name) return res.status(400).json({ message: "name required" });

    console.log("Creating variant with data:", {
      productId: pid,
      name,
      sku: sku || `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      isActive,
    });

    const variant = await prisma.productVariant.create({
      data: {
        productId: pid,
        name,
        sku: sku || `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        isActive,
      },
    });

    console.log("Created variant:", variant);

    // Auto-create inventory for the new variant
    console.log("Creating inventory with:", { variantId: variant.id, initialStock, safetyStock });
    await createInventoryForVariant(variant.id, initialStock, safetyStock);

    console.log("Success!");
    return res.json({ success: true, id: variant.id });
  } catch (err) {
    console.error("createVariant error:", err);
    return res.status(500).json({ message: "error", details: err.message });
  }
};

// PATCH /api/product/:id/variants/:variantId
export const updateVariant = async (req, res) => {
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

    const { name, sku, isActive } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (sku !== undefined) data.sku = sku;
    if (isActive !== undefined) data.isActive = isActive;

    await prisma.productVariant.update({ where: { id: vid }, data });

    return res.json({ success: true, message: "Variant updated" });
  } catch (err) {
    console.error("updateVariant error:", err);
    return res.status(500).json({ message: "error" });
  }
};

// DELETE /api/product/:id/variants/:variantId
export const deleteVariant = async (req, res) => {
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

    // Check if it's the last variant
    const variantCount = await prisma.productVariant.count({
      where: { productId: pid },
    });
    if (variantCount <= 1) {
      return res
        .status(400)
        .json({ message: "Cannot delete last variant of product" });
    }

    // Clean up cart items that reference this variant
    await prisma.cartItem.deleteMany({
      where: { variantId: vid },
    });

    await prisma.productVariant.delete({ where: { id: vid } });

    return res.json({ success: true, message: "Variant deleted" });
  } catch (err) {
    console.error("deleteVariant error:", err);
    return res.status(500).json({ message: "error" });
  }
};

// GET /api/product/:id/variants
export const getProductVariants = async (req, res) => {
  try {
    const pid = Number(req.params.id);
    if (!pid) return res.status(400).json({ message: "invalid id" });

    const product = await prisma.product.findUnique({ where: { id: pid } });
    if (!product) return res.status(404).json({ message: "Product not found" });

    const variants = await prisma.productVariant.findMany({
      where: { productId: pid },
      include: {
        prices: {
          orderBy: { amount: "asc" },
          take: 1,
        },
        inventory: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // Sort variants by price ascending
    const sortedVariants = variants.sort((a, b) => {
      const priceA = a.prices?.[0]?.amount || 0;
      const priceB = b.prices?.[0]?.amount || 0;
      return priceA - priceB;
    });

    return res.json({ success: true, variants: sortedVariants });
  } catch (err) {
    console.error("getProductVariants error:", err);
    return res.status(500).json({ message: "error" });
  }
};

// GET /api/product/:id/variants/:variantId or /api/product/variant/:variantId
export const getVariant = async (req, res) => {
  try {
    const pid = req.params.id ? Number(req.params.id) : null;
    const vid = Number(req.params.variantId);
    if (!vid) return res.status(400).json({ message: "invalid variantId" });

    const variant = await prisma.productVariant.findUnique({
      where: { id: vid },
      include: {
        product: true,
        prices: {
          orderBy: { id: "desc" },
        },
        inventory: true,
      },
    });

    if (!variant) {
      return res.status(404).json({ message: "Variant not found" });
    }

    // Nếu có productId trong URL, kiểm tra match
    if (pid && variant.productId !== pid) {
      return res
        .status(404)
        .json({ message: "Variant not found for this product" });
    }

    return res.json({ success: true, variant });
  } catch (err) {
    console.error("getVariant error:", err);
    return res.status(500).json({ message: "error" });
  }
};
