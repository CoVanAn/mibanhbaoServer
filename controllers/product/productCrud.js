import prisma from "../../config/prisma.js";
import cloudinary from "../../config/cloudinary.js";
import { uniqueSlug } from "./helpers.js";

// POST /api/products (or /api/product/add)
export const addProduct = async (req, res) => {
  try {
    const { name, price, description, categoryId } = req.body;
    if (
      !name ||
      price === undefined ||
      price === null ||
      String(price).trim() === ""
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Name and price are required" });
    }

    const priceStr = String(price).trim();
    if (isNaN(Number(priceStr))) {
      return res
        .status(400)
        .json({ success: false, message: "Price must be a number" });
    }

    const slug = await uniqueSlug(name, "product");

    // Upload multiple images if provided (field name: 'images')
    const uploads = [];
    const files = Array.isArray(req.files)
      ? req.files
      : [...(req.files?.images || []), ...(req.files?.image || [])];

    if (files.length > 0) {
      const folder = process.env.CLOUDINARY_FOLDER || "mibanhbao/products";
      for (const f of files) {
        try {
          // eslint-disable-next-line no-await-in-loop
          const up = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder, resource_type: "image" },
              (err, result) => (err ? reject(err) : resolve(result))
            );
            stream.end(f.buffer);
          });
          uploads.push({ url: up.secure_url });
        } catch (e) {
          console.error("Cloudinary upload error:", e?.message || e);
          return res
            .status(400)
            .json({ success: false, message: "Image upload failed" });
        }
      }
    }

    // Create Product
    // Validate category if provided
    let connectCategory = undefined;
    if (
      categoryId !== undefined &&
      categoryId !== null &&
      String(categoryId).trim() !== ""
    ) {
      const cid = Number(categoryId);
      if (Number.isNaN(cid)) {
        return res
          .status(400)
          .json({ success: false, message: "categoryId must be a number" });
      }
      const exists = await prisma.category.findUnique({ where: { id: cid } });
      if (!exists) {
        return res
          .status(400)
          .json({ success: false, message: "Category not found" });
      }
      connectCategory = {
        create: [
          {
            category: { connect: { id: cid } },
          },
        ],
      };
    }

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description: description || null,
        isActive: true,
        categories: connectCategory,
      },
    });

    // Create default variant
    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        name: "Default",
        sku: `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        isActive: true,
      },
    });

    // Create price (Decimal accepted as string)
    await prisma.price.create({
      data: {
        variantId: variant.id,
        amount: priceStr,
        isActive: true,
      },
    });

    // Save medias with positions
    if (uploads.length > 0) {
      await prisma.productMedia.createMany({
        data: uploads.map((u, idx) => ({
          productId: product.id,
          url: u.url,
          position: idx,
        })),
      });
    }

    return res.json({ success: true, id: product.id });
  } catch (err) {
    console.error("addProduct error:", err);
    return res.status(500).json({ success: false, message: "Error" });
  }
};

// GET /api/products/list
export const listProducts = async (req, res) => {
  try {
    const {
      search,
      categoryId,
      page = 1,
      limit = 100,
      includeInactive,
    } = req.query;
    const take = Math.min(Number(limit) || 100, 200);
    const skip = ((Number(page) || 1) - 1) * take;

    const where = {
      AND: [
        search
          ? { name: { contains: String(search), mode: "insensitive" } }
          : undefined,
        categoryId
          ? {
              categories: {
                some: { categoryId: Number(categoryId) },
              },
            }
          : undefined,
        String(includeInactive || "") === "1" ? undefined : { isActive: true },
      ].filter(Boolean),
    };

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          media: { orderBy: { position: "asc" } },
          variants: { include: { prices: { where: { isActive: true } } } },
          categories: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.product.count({ where }),
    ]);

    // Simplify output to mimic old food list: id,name,price,description,image,categoryIds
    const data = items.map((p) => {
      const firstVariant = p.variants?.[0];
      const currentPrice = firstVariant?.prices?.[0]?.amount ?? null;
      const image = p.media?.[0]?.url ?? null;
      return {
        id: p.id,
        name: p.name,
        price: currentPrice,
        description: p.description,
        image,
        categoryIds: p.categories.map((c) => c.categoryId),
      };
    });

    return res.json(data);
  } catch (err) {
    console.error("listProducts error:", err);
    return res.status(500).json({ message: "error" });
  }
};

// GET /api/product/:idOrSlug
export const getProduct = async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    const where = /^\d+$/.test(idOrSlug)
      ? { id: Number(idOrSlug) }
      : { slug: String(idOrSlug) };

    const p = await prisma.product.findFirst({
      where,
      include: {
        media: { orderBy: { position: "asc" } },
        variants: { include: { prices: { where: { isActive: true } } } },
        categories: true,
      },
    });
    if (!p) return res.status(404).json({ message: "Not found" });

    const firstVariant = p.variants?.[0];
    const currentPrice = firstVariant?.prices?.[0]?.amount ?? null;
    const image = p.media?.[0]?.url ?? null;
    const data = {
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      isActive: p.isActive,
      isFeatured: p.isFeatured,
      image,
      images: p.media.map((m) => ({
        id: m.id,
        url: m.url,
        position: m.position,
        alt: m.alt,
      })),
      price: currentPrice,
      variants: p.variants.map((v) => ({
        id: v.id,
        name: v.name,
        sku: v.sku,
        isActive: v.isActive,
        price: v.prices?.[0]?.amount ?? null,
      })),
      categoryIds: p.categories.map((c) => c.categoryId),
    };
    return res.json(data);
  } catch (err) {
    console.error("getProduct error:", err);
    return res.status(500).json({ message: "error" });
  }
};

// PATCH /api/product/:id
export const updateProduct = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "invalid id" });

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Not found" });

    const { name, description, isActive, isFeatured } = req.body;
    const data = {};

    if (name && name !== existing.name) {
      data.name = name;
      data.slug = await uniqueSlug(name, "product");
    }
    if (description !== undefined) data.description = description || null;
    if (isActive !== undefined)
      data.isActive =
        typeof isActive === "boolean" ? isActive : String(isActive) === "true";
    if (isFeatured !== undefined)
      data.isFeatured =
        typeof isFeatured === "boolean"
          ? isFeatured
          : String(isFeatured) === "true";

    const updated = await prisma.product.update({ where: { id }, data });

    // If product is deactivated, remove it from all carts
    if (data.isActive === false) {
      await prisma.cartItem.deleteMany({ where: { productId: id } });
    }
    return res.json({ success: true, id: updated.id });
  } catch (err) {
    console.error("updateProduct error:", err);
    return res.status(500).json({ message: "error" });
  }
};

// POST /api/products/remove
export const removeProduct = async (req, res) => {
  try {
    const { id } = req.body;
    const pid = Number(id);
    if (!pid)
      return res.status(400).json({ success: false, message: "id required" });

    // find media to optionally clean up (no-op for Cloudinary unless we store public_id)
    const medias = await prisma.productMedia.findMany({
      where: { productId: pid },
    });

    await prisma.product.delete({ where: { id: pid } });

    // If later we store Cloudinary public_id, we can destroy here. For now, skip.

    return res.json({ success: true, message: "Product removed" });
  } catch (err) {
    console.error("removeProduct error:", err);
    return res.status(500).json({ success: false, message: "error" });
  }
};

// DELETE /api/product/:id
export const deleteProduct = async (req, res) => {
  try {
    const pid = Number(req.params.id);
    if (!pid)
      return res.status(400).json({ success: false, message: "invalid id" });
    // Remove from carts so customers can't buy it
    await prisma.cartItem.deleteMany({ where: { productId: pid } });
    // Cloudinary cleanup for all media
    const medias = await prisma.productMedia.findMany({
      where: { productId: pid },
    });
    for (const m of medias) {
      if (m.url) {
        try {
          const match = m.url.match(/upload\/(?:v\d+\/)?(.+?)\.[a-zA-Z0-9]+$/);
          const publicId = match ? match[1] : null;
          if (publicId) await cloudinary.uploader.destroy(publicId);
        } catch (e) {
          console.warn("Cloudinary destroy failed:", e?.message || e);
        }
      }
    }
    await prisma.product.delete({ where: { id: pid } });
    return res.json({ success: true, message: "Product deleted" });
  } catch (err) {
    console.error("deleteProduct error:", err);
    return res
      .status(400)
      .json({ success: false, message: "cannot delete product" });
  }
};
