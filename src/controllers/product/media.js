import prisma from "../../config/prisma.js";
import cloudinary from "../../config/cloudinary.js";
import { BadRequestError } from "../../exceptions/index.js";

const extractPublicIdFromUrl = (url) => {
  if (!url) return null;
  const match = url.match(/upload\/(?:v\d+\/)?(.+?)\.[a-zA-Z0-9]+$/);
  return match ? match[1] : null;
};

const cleanupUploadedMedia = async (uploads) => {
  await Promise.all(
    uploads.map(async (upload) => {
      if (!upload.publicId) return;
      try {
        await cloudinary.uploader.destroy(upload.publicId);
      } catch (error) {
        console.warn("Cloudinary rollback failed:", error?.message || error);
      }
    }),
  );
};

// POST /api/product/:id/media
export const addProductMedia = async (req, res, next) => {
  try {
    const pid = req.params.id;

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
            (err, result) => (err ? reject(err) : resolve(result)),
          );
          stream.end(f.buffer);
        });
        uploads.push({
          url: up.secure_url,
          publicId: up.public_id || extractPublicIdFromUrl(up.secure_url),
        });
      } catch (e) {
        await cleanupUploadedMedia(uploads);
        throw new BadRequestError("Image upload failed");
      }
    }

    try {
      await prisma.$transaction(async (tx) => {
        // Get next position inside transaction to avoid stale reads
        const lastMedia = await tx.productMedia.findFirst({
          where: { productId: pid },
          orderBy: { position: "desc" },
        });
        const nextPos = (lastMedia?.position ?? -1) + 1;

        await tx.productMedia.createMany({
          data: uploads.map((u, idx) => ({
            productId: pid,
            url: u.url,
            position: nextPos + idx,
          })),
        });
      });
    } catch (error) {
      await cleanupUploadedMedia(uploads);
      throw error;
    }

    return res.json({ success: true, message: "Media added" });
  } catch (err) {
    return next(err);
  }
};

// DELETE /api/product/:id/media/:mediaId
export const deleteProductMedia = async (req, res, next) => {
  try {
    const pid = req.params.id;
    const mid = req.params.mediaId;

    const media = await prisma.productMedia.findUnique({ where: { id: mid } });
    if (!media || media.productId !== pid) {
      return res.status(404).json({ message: "Media not found" });
    }

    await prisma.productMedia.delete({ where: { id: mid } });

    // Cleanup Cloudinary after DB success (best effort)
    if (media.url) {
      try {
        const publicId = extractPublicIdFromUrl(media.url);
        if (publicId) {
          await cloudinary.uploader.destroy(publicId);
        }
      } catch (e) {
        console.warn("Cloudinary destroy failed:", e?.message || e);
      }
    }

    return res.json({ success: true, message: "Media deleted" });
  } catch (err) {
    return next(err);
  }
};

// PATCH /api/product/:id/media/reorder
export const reorderProductMedia = async (req, res, next) => {
  try {
    const pid = req.params.id;

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
    if (new Set(mediaIds).size !== mediaIds.length) {
      return res.status(400).json({ message: "mediaIds contains duplicates" });
    }

    // Verify all media belong to this product
    const medias = await prisma.productMedia.findMany({
      where: { productId: pid, id: { in: mediaIds } },
    });
    if (medias.length !== mediaIds.length) {
      return res.status(400).json({ message: "Some media not found" });
    }

    // Update positions atomically
    await prisma.$transaction(
      mediaIds.map((id, index) =>
        prisma.productMedia.update({
          where: { id },
          data: { position: index },
        }),
      ),
    );

    return res.json({ success: true, message: "Media reordered" });
  } catch (err) {
    return next(err);
  }
};

// PATCH /api/product/:id/media/:mediaId
export const updateProductMedia = async (req, res, next) => {
  try {
    const pid = req.params.id;
    const mid = req.params.mediaId;

    const media = await prisma.productMedia.findUnique({ where: { id: mid } });
    if (!media || media.productId !== pid) {
      return res.status(404).json({ message: "Media not found" });
    }

    const { alt, position } = req.body;
    const data = {};
    if (alt !== undefined) data.alt = alt;
    if (position !== undefined) {
      const parsedPosition = Number(position);
      if (Number.isNaN(parsedPosition) || parsedPosition < 0) {
        return res
          .status(400)
          .json({ message: "position must be a non-negative number" });
      }
      data.position = parsedPosition;
    }

    await prisma.productMedia.update({ where: { id: mid }, data });

    return res.json({ success: true, message: "Media updated" });
  } catch (err) {
    return next(err);
  }
};
