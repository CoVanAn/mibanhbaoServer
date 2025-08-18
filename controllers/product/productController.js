import prisma from "../../config/prisma.js";
import cloudinary from "../../config/cloudinary.js";

// Helpers
const slugify = (str) =>
  str
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

async function uniqueSlug(base, model) {
  let slug = slugify(base);
  let i = 1;
  // eslint-disable-next-line no-await-int-loop
  // eslint-disable-next-line no-await-in-loop
  while (await prisma[model].findUnique({ where: { slug } })) {
    slug = `${slugify(base)}-${i++}`;
  }
  return slug;
}

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

// PUT /api/product/:id/categories (replace all)
export const setProductCategories = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "invalid id" });
    const { categories } = req.body;
    const catIds = (Array.isArray(categories) ? categories : [])
      .map((c) => Number(c))
      .filter((n) => !Number.isNaN(n));
    const uniq = [...new Set(catIds)];
    // validate product exists
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ message: "Product not found" });
    // validate categories exist
    if (uniq.length) {
      const found = await prisma.category.findMany({
        where: { id: { in: uniq } },
      });
      if (found.length !== uniq.length)
        return res.status(400).json({ message: "Some categories not found" });
    }
    await prisma.$transaction([
      prisma.productCategory.deleteMany({
        where: { productId: id, NOT: { categoryId: { in: uniq } } },
      }),
      ...uniq.map((cid) =>
        prisma.productCategory.upsert({
          where: { productId_categoryId: { productId: id, categoryId: cid } },
          create: { productId: id, categoryId: cid },
          update: {},
        })
      ),
    ]);
    return res.json({ success: true });
  } catch (err) {
    console.error("setProductCategories error:", err);
    return res.status(500).json({ message: "error" });
  }
};

// POST /api/product/:id/categories/:categoryId (add one)
export const addProductCategory = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const categoryId = Number(req.params.categoryId);
    if (!id || !categoryId)
      return res.status(400).json({ message: "invalid ids" });
    await prisma.productCategory.upsert({
      where: { productId_categoryId: { productId: id, categoryId } },
      create: { productId: id, categoryId },
      update: {},
    });
    return res.json({ success: true });
  } catch (err) {
    console.error("addProductCategory error:", err);
    return res.status(500).json({ message: "error" });
  }
};

// DELETE /api/product/:id/categories/:categoryId (remove one)
export const removeProductCategoryLink = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const categoryId = Number(req.params.categoryId);
    if (!id || !categoryId)
      return res.status(400).json({ message: "invalid ids" });
    await prisma.productCategory.delete({
      where: { productId_categoryId: { productId: id, categoryId } },
    });
    return res.json({ success: true });
  } catch (err) {
    console.error("removeProductCategoryLink error:", err);
    return res.status(500).json({ message: "error" });
  }
};

// POST /api/product/:id/media (multipart) add images
export const addProductMedia = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "invalid id" });
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ message: "Product not found" });

    const files = Array.isArray(req.files)
      ? req.files
      : [...(req.files?.images || []), ...(req.files?.image || [])];
    if (!files.length) return res.status(400).json({ message: "No files" });

    const last = await prisma.productMedia.findMany({
      where: { productId: id },
      orderBy: { position: "desc" },
      take: 1,
    });
    let basePos = last[0]?.position ?? -1;
    const folder = process.env.CLOUDINARY_FOLDER || "mibanhbao/products";
    const toCreate = [];
    for (const f of files) {
      // eslint-disable-next-line no-await-in-loop
      const up = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder, resource_type: "image" },
          (err, result) => (err ? reject(err) : resolve(result))
        );
        stream.end(f.buffer);
      });
      basePos += 1;
      toCreate.push({ productId: id, url: up.secure_url, position: basePos });
    }
    await prisma.productMedia.createMany({ data: toCreate });
    return res.json({ success: true, added: toCreate.length });
  } catch (err) {
    console.error("addProductMedia error:", err);
    return res.status(500).json({ message: "error" });
  }
};

// DELETE /api/product/:id/media/:mediaId
export const deleteProductMedia = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const mediaId = Number(req.params.mediaId);
    if (!id || !mediaId)
      return res.status(400).json({ message: "invalid ids" });
    // Load media, attempt Cloudinary destroy by inferring public_id
    const media = await prisma.productMedia.findUnique({
      where: { id: mediaId },
    });
    if (media?.url) {
      try {
        const match = media.url.match(
          /upload\/(?:v\d+\/)?(.+?)\.[a-zA-Z0-9]+$/
        );
        const publicId = match ? match[1] : null;
        if (publicId) await cloudinary.uploader.destroy(publicId);
      } catch (e) {
        console.warn("Cloudinary destroy failed:", e?.message || e);
      }
    }
    await prisma.productMedia.delete({ where: { id: mediaId } });
    // Reindex positions for remaining media of this product
    const medias = await prisma.productMedia.findMany({
      where: { productId: id },
      orderBy: { position: "asc" },
    });
    await Promise.all(
      medias.map((m, idx) =>
        prisma.productMedia.update({
          where: { id: m.id },
          data: { position: idx },
        })
      )
    );
    return res.json({ success: true });
  } catch (err) {
    console.error("deleteProductMedia error:", err);
    return res.status(500).json({ message: "error" });
  }
};

// PATCH /api/product/:id/media/reorder
export const reorderProductMedia = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const payload = Array.isArray(req.body) ? req.body : req.body?.order;
    if (!id || !Array.isArray(payload))
      return res.status(400).json({ message: "invalid payload" });

    const updates = payload
      .map((m) => ({ id: Number(m.id), position: Number(m.position) }))
      .filter((m) => Number.isFinite(m.id) && Number.isFinite(m.position));
    if (updates.length === 0)
      return res.status(400).json({ message: "invalid payload" });

    // Ensure all media belong to this product
    const ids = updates.map((u) => u.id);
    const owned = await prisma.productMedia.findMany({
      where: { id: { in: ids }, productId: id },
    });
    if (owned.length !== ids.length) {
      return res
        .status(400)
        .json({ message: "some media do not belong to this product" });
    }

    await prisma.$transaction(
      updates.map((m) =>
        prisma.productMedia.update({
          where: { id: m.id },
          data: { position: m.position },
        })
      )
    );
    return res.json({ success: true, updated: updates.length });
  } catch (err) {
    console.error("reorderProductMedia error:", err);
    return res.status(500).json({ message: "error" });
  }
};

// PATCH /api/product/:id/media/:mediaId (alt text)
export const updateProductMedia = async (req, res) => {
  try {
    const mediaId = Number(req.params.mediaId);
    const { alt } = req.body;
    if (!mediaId) return res.status(400).json({ message: "invalid id" });
    const updated = await prisma.productMedia.update({
      where: { id: mediaId },
      data: { alt: alt || null },
    });
    return res.json({ success: true, id: updated.id });
  } catch (err) {
    console.error("updateProductMedia error:", err);
    return res.status(500).json({ message: "error" });
  }
};

// POST /api/product/:id/variants
export const createVariant = async (req, res) => {
  try {
    const productId = Number(req.params.id);
    if (!productId) return res.status(400).json({ message: "invalid id" });
    const { name, sku, isActive = true } = req.body;
    if (!name) return res.status(400).json({ message: "name required" });
    const created = await prisma.productVariant.create({
      data: {
        productId,
        name,
        sku: sku || `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        isActive: Boolean(isActive),
      },
    });
    return res.json({ success: true, id: created.id });
  } catch (err) {
    console.error("createVariant error:", err);
    return res.status(500).json({ message: "error" });
  }
};

// PATCH /api/variant/:variantId
export const updateVariant = async (req, res) => {
  try {
    const variantId = Number(req.params.variantId);
    if (!variantId) return res.status(400).json({ message: "invalid id" });
    const { name, sku, isActive } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (sku !== undefined) data.sku = sku;
    if (isActive !== undefined)
      data.isActive =
        typeof isActive === "boolean" ? isActive : String(isActive) === "true";
    const updated = await prisma.productVariant.update({
      where: { id: variantId },
      data,
    });
    return res.json({ success: true, id: updated.id });
  } catch (err) {
    console.error("updateVariant error:", err);
    return res.status(500).json({ message: "error" });
  }
};

// DELETE /api/variant/:variantId
export const deleteVariant = async (req, res) => {
  try {
    const variantId = Number(req.params.variantId);
    if (!variantId) return res.status(400).json({ message: "invalid id" });
    await prisma.productVariant.delete({ where: { id: variantId } });
    return res.json({ success: true });
  } catch (err) {
    console.error("deleteVariant error:", err);
    return res.status(500).json({ message: "error" });
  }
};

// POST /api/variant/:variantId/price (create new active price)
export const setVariantPrice = async (req, res) => {
  try {
    const variantId = Number(req.params.variantId);
    const { amount, startsAt, endsAt } = req.body;
    if (!variantId) return res.status(400).json({ message: "invalid id" });
    const amt = String(amount ?? "").trim();
    if (!amt || Number.isNaN(Number(amt)))
      return res.status(400).json({ message: "amount must be a number" });
    await prisma.$transaction([
      prisma.price.updateMany({
        where: { variantId, isActive: true },
        data: { isActive: false },
      }),
      prisma.price.create({
        data: {
          variantId,
          amount: amt,
          isActive: true,
          startsAt: startsAt ? new Date(startsAt) : null,
          endsAt: endsAt ? new Date(endsAt) : null,
        },
      }),
    ]);
    return res.json({ success: true });
  } catch (err) {
    console.error("setVariantPrice error:", err);
    return res.status(500).json({ message: "error" });
  }
};

// GET /api/variant/:variantId/prices
export const getVariantPrices = async (req, res) => {
  try {
    const variantId = Number(req.params.variantId);
    if (!variantId) return res.status(400).json({ message: "invalid id" });
    const prices = await prisma.price.findMany({
      where: { variantId },
      orderBy: [{ isActive: "desc" }, { startsAt: "desc" }, { id: "desc" }],
    });
    return res.json(prices);
  } catch (err) {
    console.error("getVariantPrices error:", err);
    return res.status(500).json({ message: "error" });
  }
};

// GET /api/variant/:variantId/inventory
export const getInventory = async (req, res) => {
  try {
    const variantId = Number(req.params.variantId);
    if (!variantId) return res.status(400).json({ message: "invalid id" });
    const inv = await prisma.inventory.findUnique({ where: { variantId } });
    return res.json(inv || { variantId, quantity: 0, safetyStock: 0 });
  } catch (err) {
    console.error("getInventory error:", err);
    return res.status(500).json({ message: "error" });
  }
};

// PATCH /api/variant/:variantId/inventory
export const updateInventory = async (req, res) => {
  try {
    const variantId = Number(req.params.variantId);
    if (!variantId) return res.status(400).json({ message: "invalid id" });
    const { quantity, safetyStock } = req.body;
    const q = quantity !== undefined ? Number(quantity) : undefined;
    const s = safetyStock !== undefined ? Number(safetyStock) : undefined;
    if (
      (q !== undefined && Number.isNaN(q)) ||
      (s !== undefined && Number.isNaN(s))
    ) {
      return res
        .status(400)
        .json({ message: "quantity/safetyStock must be numbers" });
    }
    const data = {};
    if (q !== undefined) data.quantity = Math.max(0, q);
    if (s !== undefined) data.safetyStock = Math.max(0, s);
    const up = await prisma.inventory.upsert({
      where: { variantId },
      update: data,
      create: {
        variantId,
        quantity: data.quantity || 0,
        safetyStock: data.safetyStock || 0,
      },
    });
    return res.json({ success: true, variantId: up.variantId });
  } catch (err) {
    console.error("updateInventory error:", err);
    return res.status(500).json({ message: "error" });
  }
};

export default {
  addProduct,
  listProducts,
  getProduct,
  updateProduct,
  removeProduct,
  deleteProduct,
  setProductCategories,
  addProductCategory,
  removeProductCategoryLink,
  addProductMedia,
  deleteProductMedia,
  reorderProductMedia,
  updateProductMedia,
  createVariant,
  updateVariant,
  deleteVariant,
  setVariantPrice,
  getVariantPrices,
  getInventory,
  updateInventory,
};
