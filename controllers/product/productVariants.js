import prisma from "../../config/prisma.js";

// POST /api/product/:id/variants
export const createVariant = async (req, res) => {
  try {
    const pid = Number(req.params.id);
    if (!pid) return res.status(400).json({ message: "invalid id" });

    const product = await prisma.product.findUnique({ where: { id: pid } });
    if (!product) return res.status(404).json({ message: "Product not found" });

    const { name, sku, isActive = true } = req.body;
    if (!name) return res.status(400).json({ message: "name required" });

    const variant = await prisma.productVariant.create({
      data: {
        productId: pid,
        name,
        sku: sku || `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        isActive,
      },
    });

    return res.json({ success: true, id: variant.id });
  } catch (err) {
    console.error("createVariant error:", err);
    return res.status(500).json({ message: "error" });
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

    await prisma.productVariant.delete({ where: { id: vid } });

    return res.json({ success: true, message: "Variant deleted" });
  } catch (err) {
    console.error("deleteVariant error:", err);
    return res.status(500).json({ message: "error" });
  }
};
