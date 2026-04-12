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
    if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

    const files = Array.isArray(req.files)
      ? req.files
      : [...(req.files?.images || []), ...(req.files?.image || [])];

    if (!files.length) {
      return res.status(400).json({ message: "Không có tệp nào được cung cấp" });
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

    return res.json({ success: true, message: "Thêm phương tiện thành công" });
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
      return res.status(404).json({ message: "Không tìm thấy phương tiện" });
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

    return res.json({ success: true, message: "Xóa phương tiện thành công" });
  } catch (err) {
    return next(err);
  }
};

// PATCH /api/product/:id/media/reorder
export const reorderProductMedia = async (req, res, next) => {
  try {
    const pid = req.params.id;

    const product = await prisma.product.findUnique({ where: { id: pid } });
    if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

    // Accept either { mediaIds: [...] } or { order: [...] } or just [...]
    let mediaIds;
    if (Array.isArray(req.body)) {
      mediaIds = req.body;
    } else if (req.body.mediaIds) {
      mediaIds = req.body.mediaIds;
    } else if (req.body.order) {
      mediaIds = req.body.order;
    } else {
      return res.status(400).json({ message: "Bắt buộc truyền mảng mediaIds" });
    }

    if (!Array.isArray(mediaIds)) {
      return res.status(400).json({ message: "mediaIds phải là mảng" });
    }
    if (new Set(mediaIds).size !== mediaIds.length) {
      return res.status(400).json({ message: "mediaIds chứa phần tử trùng lặp" });
    }

    // Verify all media belong to this product
    const medias = await prisma.productMedia.findMany({
      where: { productId: pid, id: { in: mediaIds } },
    });
    if (medias.length !== mediaIds.length) {
      return res.status(400).json({ message: "Không tìm thấy một số phương tiện" });
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

    return res.json({ success: true, message: "Sắp xếp lại phương tiện thành công" });
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
      return res.status(404).json({ message: "Không tìm thấy phương tiện" });
    }

    const { alt, position } = req.body;
    const data = {};
    if (alt !== undefined) data.alt = alt;
    if (position !== undefined) {
      const parsedPosition = Number(position);
      if (Number.isNaN(parsedPosition) || parsedPosition < 0) {
        return res
          .status(400)
          .json({ message: "Vị trí phải là số không âm" });
      }
      data.position = parsedPosition;
    }

    await prisma.productMedia.update({ where: { id: mid }, data });

    return res.json({ success: true, message: "Cập nhật phương tiện thành công" });
  } catch (err) {
    return next(err);
  }
};
