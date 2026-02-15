import prisma from "../../config/prisma.js";
import cloudinary from "../../config/cloudinary.js";

// POST /api/product/:id/media
export const addProductMedia = async (req, res) => {
  try {
    const pid = Number(req.params.id);
    if (!pid) return res.status(400).json({ message: "invalid id" });

    const product = await prisma.product.findUnique({ where: { id: pid } });
    if (!product) return res.status(404).json({ message: "Product not found" });

    const files = Array.isArray(req.files)
      ? req.files
      : [...(req.files?.images || []), ...(req.files?.image || [])];

    if (!files.length) {
      return res.status(400).json({ message: "No files provided" });
    }

    const uploads = [];
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

    // Get next position
    const lastMedia = await prisma.productMedia.findFirst({
      where: { productId: pid },
      orderBy: { position: "desc" },
    });
    const nextPos = (lastMedia?.position ?? -1) + 1;

    await prisma.productMedia.createMany({
      data: uploads.map((u, idx) => ({
        productId: pid,
        url: u.url,
        position: nextPos + idx,
      })),
    });

    return res.json({ success: true, message: "Media added" });
  } catch (err) {
    console.error("addProductMedia error:", err);
    return res.status(500).json({ message: "error" });
  }
};

// DELETE /api/product/:id/media/:mediaId
export const deleteProductMedia = async (req, res) => {
  try {
    const pid = Number(req.params.id);
    const mid = Number(req.params.mediaId);
    if (!pid || !mid)
      return res.status(400).json({ message: "invalid id or mediaId" });

    const media = await prisma.productMedia.findUnique({ where: { id: mid } });
    if (!media || media.productId !== pid) {
      return res.status(404).json({ message: "Media not found" });
    }

    // Cleanup Cloudinary (try to infer public_id from URL)
    if (media.url) {
      try {
        const match = media.url.match(
          /upload\/(?:v\d+\/)?(.+?)\.[a-zA-Z0-9]+$/
        );
        const publicId = match ? match[1] : null;
        if (publicId) {
          await cloudinary.uploader.destroy(publicId);
        }
      } catch (e) {
        console.warn("Cloudinary destroy failed:", e?.message || e);
      }
    }

    await prisma.productMedia.delete({ where: { id: mid } });

    return res.json({ success: true, message: "Media deleted" });
  } catch (err) {
    console.error("deleteProductMedia error:", err);
    return res.status(500).json({ message: "error" });
  }
};

// PATCH /api/product/:id/media/reorder
export const reorderProductMedia = async (req, res) => {
  try {
    const pid = Number(req.params.id);
    if (!pid) return res.status(400).json({ message: "invalid id" });

    const product = await prisma.product.findUnique({ where: { id: pid } });
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Accept either { mediaIds: [...] } or { order: [...] } or just [...]
    let mediaIds;
    if (Array.isArray(req.body)) {
      mediaIds = req.body;
    } else if (req.body.mediaIds) {
      mediaIds = req.body.mediaIds;
    } else if (req.body.order) {
      mediaIds = req.body.order;
    } else {
      return res.status(400).json({ message: "mediaIds array required" });
    }

    if (!Array.isArray(mediaIds)) {
      return res.status(400).json({ message: "mediaIds must be an array" });
    }

    // Verify all media belong to this product
    const medias = await prisma.productMedia.findMany({
      where: { productId: pid, id: { in: mediaIds } },
    });
    if (medias.length !== mediaIds.length) {
      return res.status(400).json({ message: "Some media not found" });
    }

    // Update positions
    for (let i = 0; i < mediaIds.length; i++) {
      // eslint-disable-next-line no-await-in-loop
      await prisma.productMedia.update({
        where: { id: mediaIds[i] },
        data: { position: i },
      });
    }

    return res.json({ success: true, message: "Media reordered" });
  } catch (err) {
    console.error("reorderProductMedia error:", err);
    return res.status(500).json({ message: "error" });
  }
};

// PATCH /api/product/:id/media/:mediaId
export const updateProductMedia = async (req, res) => {
  try {
    const pid = Number(req.params.id);
    const mid = Number(req.params.mediaId);
    if (!pid || !mid)
      return res.status(400).json({ message: "invalid id or mediaId" });

    const media = await prisma.productMedia.findUnique({ where: { id: mid } });
    if (!media || media.productId !== pid) {
      return res.status(404).json({ message: "Media not found" });
    }

    const { alt, position } = req.body;
    const data = {};
    if (alt !== undefined) data.alt = alt;
    if (position !== undefined) data.position = Number(position);

    await prisma.productMedia.update({ where: { id: mid }, data });

    return res.json({ success: true, message: "Media updated" });
  } catch (err) {
    console.error("updateProductMedia error:", err);
    return res.status(500).json({ message: "error" });
  }
};
