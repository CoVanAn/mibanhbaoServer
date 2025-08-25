import prisma from "../../config/prisma.js";
import cloudinary from "../../config/cloudinary.js";
import { uniqueSlug } from "./helpers.js";
import {
  sanitizeProductContent,
  validateProductContent,
} from "../../utils/htmlSanitizer.js";
import { setPermanentPrice } from "../../utils/priceHelpers.js";
import { createInventoryForVariant } from "../../utils/inventoryHelpers.js";

// POST /api/products (or /api/product/add)
export const addProduct = async (req, res) => {
  try {
    const { name, price, description, content, categoryId } = req.body;
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

    // Validate and sanitize content if provided
    let sanitizedContent = null;
    if (content && content.trim()) {
      const validation = validateProductContent(content);
      if (!validation.isValid) {
        return res
          .status(400)
          .json({
            success: false,
            message: `Content validation failed: ${validation.errors.join(
              ", "
            )}`,
          });
      }

      sanitizedContent = sanitizeProductContent(content);
      if (!sanitizedContent) {
        return res
          .status(400)
          .json({ success: false, message: "Content sanitization failed" });
      }
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
        content: sanitizedContent,
        isActive: true,
        categories: connectCategory,
      },
    });

    // Create default variant
    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        name: "Default",
        sku: `${product.slug}-default`,
        isActive: true,
      },
    });

    // Create permanent price using helper
    await setPermanentPrice(variant.id, priceStr);

    // Auto-create inventory for the default variant
    await createInventoryForVariant(variant.id, 0, 0);

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
          variants: { 
            include: { prices: { where: { isActive: true }, orderBy: { amount: "desc" } } },
            orderBy: { createdAt: "asc" }
          },
          categories: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.product.count({ where }),
    ]);

    // Simplify output to mimic old food list: id,name,price,description,image,categoryIds + isActive,isFeatured + variants
    const data = items.map((p) => {
      const firstVariant = p.variants?.[0];
      const currentPrice = firstVariant?.prices?.[0]?.amount ?? p.price ?? null;
      const image = p.media?.[0]?.url ?? null;
      
      // Include all variants with their current prices, sorted by price ascending
      const variants = p.variants
        .map(variant => {
          const currentVariantPrice = variant.prices?.[0]?.amount ?? 0;
          return {
            id: variant.id,
            name: variant.name,
            sku: variant.sku,
            isActive: variant.isActive,
            price: currentVariantPrice,
            currentPrice: currentVariantPrice
          };
        })
        .sort((a, b) => a.price - b.price); // Sort by price ascending
      
      return {
        id: p.id,
        name: p.name,
        price: currentPrice,
        description: p.description,
        image,
        categoryIds: p.categories.map((c) => c.categoryId),
        isActive: p.isActive,
        isFeatured: p.isFeatured,
        variants: variants
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
        variants: { 
          include: { prices: { where: { isActive: true }, orderBy: { amount: "desc" } } },
          orderBy: { createdAt: "asc" }
        },
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
      content: p.content,
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
      variants: p.variants
        .map((v) => ({
          id: v.id,
          name: v.name,
          sku: v.sku,
          isActive: v.isActive,
          price: v.prices?.[0]?.amount ?? null,
        }))
        .sort((a, b) => (a.price || 0) - (b.price || 0)), // Sort by price ascending
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
    console.log("=== UPDATE PRODUCT DEBUG ===");
    console.log("Request params:", req.params);
    console.log("Request body:", req.body);
    console.log("Request files:", req.files);
    console.log("========================");

    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "invalid id" });

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Not found" });

    const {
      name,
      description,
      content,
      isActive,
      isFeatured,
      price,
      categoryId,
      existingImageIds,
      imagePositions,
    } = req.body;

    const data = {};

    if (name && name !== existing.name) {
      data.name = name;
      data.slug = await uniqueSlug(name, "product");
    }
    if (description !== undefined) data.description = description || null;

    // Handle content update
    if (content !== undefined) {
      if (content && content.trim()) {
        const validation = validateProductContent(content);
        if (!validation.isValid) {
          return res
            .status(400)
            .json({
              message: `Content validation failed: ${validation.errors.join(
                ", "
              )}`,
            });
        }

        const sanitizedContent = sanitizeProductContent(content);
        if (!sanitizedContent) {
          return res
            .status(400)
            .json({ message: "Content sanitization failed" });
        }
        data.content = sanitizedContent;
      } else {
        data.content = null;
      }
    }

    if (isActive !== undefined)
      data.isActive =
        typeof isActive === "boolean" ? isActive : String(isActive) === "true";
    if (isFeatured !== undefined)
      data.isFeatured =
        typeof isFeatured === "boolean"
          ? isFeatured
          : String(isFeatured) === "true";

    const updated = await prisma.product.update({ where: { id }, data });

    // Handle price update (simplified approach)
    if (price !== undefined && price !== null && String(price).trim() !== "") {
      const priceValue = Number(String(price).trim());
      console.log("Processing price update:", priceValue);

      if (!isNaN(priceValue)) {
        // Find or create the default variant
        let variant = await prisma.productVariant.findFirst({
          where: {
            productId: id,
            name: "Default",
          },
        });

        if (!variant) {
          // Create default variant if none exists
          variant = await prisma.productVariant.create({
            data: {
              productId: id,
              name: "Default",
              sku: `${updated.slug}-default`,
              isActive: true,
            },
          });
          console.log("Created new default variant:", variant);
          
          // Auto-create inventory for new variant
          await createInventoryForVariant(variant.id, 0, 0);
        }

        // Use price helper for better price management
        await setPermanentPrice(variant.id, priceValue);
        console.log("Updated price using helper:", priceValue);
      }
    }

    // Handle category update
    if (categoryId !== undefined) {
      // Remove existing category relationships
      await prisma.productCategory.deleteMany({
        where: { productId: id },
      });

      // Add new category if provided
      if (
        categoryId &&
        categoryId !== null &&
        String(categoryId).trim() !== ""
      ) {
        const catId = Number(categoryId);
        if (!isNaN(catId)) {
          // Verify category exists
          const categoryExists = await prisma.category.findUnique({
            where: { id: catId },
          });

          if (categoryExists) {
            await prisma.productCategory.create({
              data: {
                productId: id,
                categoryId: catId,
              },
            });
            console.log("Updated category:", catId);
          }
        }
      }
    }

    // Handle image updates
    console.log("Processing image updates...");
    console.log("Existing image IDs:", existingImageIds);
    console.log("Image positions:", imagePositions);

    // Parse image positions if it's a string
    let parsedImagePositions = imagePositions;
    if (typeof imagePositions === "string") {
      try {
        parsedImagePositions = JSON.parse(imagePositions);
      } catch (e) {
        console.error("Failed to parse imagePositions:", e);
        parsedImagePositions = [];
      }
    }

    // Update positions for existing images
    if (
      Array.isArray(parsedImagePositions) &&
      parsedImagePositions.length > 0
    ) {
      console.log("Updating image positions:", parsedImagePositions);

      for (const positionData of parsedImagePositions) {
        if (positionData.id && positionData.position !== undefined) {
          await prisma.productMedia.updateMany({
            where: {
              productId: id,
              id: Number(positionData.id),
            },
            data: {
              position: Number(positionData.position),
            },
          });
        }
      }
      console.log("Image positions updated successfully");
    }

    // Handle new image uploads
    const files = Array.isArray(req.files)
      ? req.files
      : [...(req.files?.newImages || []), ...(req.files?.images || [])];

    if (files.length > 0) {
      console.log("Processing new image uploads:", files.length);
      const folder = process.env.CLOUDINARY_FOLDER || "mibanhbao/products";

      // Get current max position
      const maxPosition = await prisma.productMedia.findFirst({
        where: { productId: id },
        orderBy: { position: "desc" },
        select: { position: true },
      });

      let startPosition = (maxPosition?.position || -1) + 1;

      for (const file of files) {
        try {
          const uploadResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder, resource_type: "image" },
              (err, result) => (err ? reject(err) : resolve(result))
            );
            stream.end(file.buffer);
          });

          await prisma.productMedia.create({
            data: {
              productId: id,
              url: uploadResult.secure_url,
              alt: `${updated.name} - Image ${startPosition + 1}`,
              position: startPosition++,
            },
          });

          console.log("New image uploaded:", uploadResult.secure_url);
        } catch (uploadError) {
          console.error("Image upload error:", uploadError);
        }
      }
    }

    // Remove images not in existingImageIds
    if (Array.isArray(existingImageIds)) {
      const numericImageIds = existingImageIds
        .map((id) => Number(id))
        .filter((id) => !isNaN(id));

      if (numericImageIds.length > 0) {
        const deletedImages = await prisma.productMedia.deleteMany({
          where: {
            productId: id,
            id: { notIn: numericImageIds },
          },
        });
        console.log("Removed unused images:", deletedImages.count);
      } else {
        // If no existing images specified, remove all
        const deletedImages = await prisma.productMedia.deleteMany({
          where: { productId: id },
        });
        console.log("Removed all images:", deletedImages.count);
      }
    }

    // If product is deactivated, remove it from all carts
    if (data.isActive === false) {
      await prisma.cartItem.deleteMany({ where: { productId: id } });
    }

    console.log("Product update completed successfully");
    return res.json({
      success: true,
      id: updated.id,
      message: "Product updated successfully",
    });
  } catch (err) {
    console.error("updateProduct error:", err);
    return res
      .status(500)
      .json({ message: "Internal server error", error: err.message });
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
