import prisma from "../../config/prisma.js";

/**
 * POST /api/coupon
 * Create a new coupon (ADMIN only)
 */
export async function createCoupon(req, res, next) {
  try {
    const {
      code,
      type,
      value,
      startsAt,
      endsAt,
      minSubtotal,
      maxRedemptions,
      perUserLimit,
      isActive,
    } = req.body;

    // Check for duplicate code
    const existing = await prisma.coupon.findUnique({ where: { code } });
    if (existing) {
      return res
        .status(409)
        .json({ success: false, message: "Mã giảm giá đã tồn tại" });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code,
        type,
        value,
        startsAt: startsAt ?? null,
        endsAt: endsAt ?? null,
        minSubtotal: minSubtotal ?? null,
        maxRedemptions: maxRedemptions ?? null,
        perUserLimit: perUserLimit ?? null,
        isActive: isActive ?? true,
      },
    });

    return res.status(201).json({ success: true, data: coupon });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/coupon
 * List coupons with pagination (ADMIN/STAFF)
 */
export async function listCoupons(req, res, next) {
  try {
    const { page = 1, limit = 20, isActive, code } = req.query;
    const where = {};
    if (isActive !== undefined) where.isActive = isActive;
    if (code) where.code = { contains: code, mode: "insensitive" };

    const [total, items] = await Promise.all([
      prisma.coupon.count({ where }),
      prisma.coupon.findMany({
        where,
        orderBy: { id: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return res.json({
      success: true,
      data: items,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/coupon/:id
 * Get single coupon (ADMIN/STAFF)
 */
export async function getCoupon(req, res, next) {
  try {
    const { id } = req.params;
    const coupon = await prisma.coupon.findUnique({ where: { id } });
    if (!coupon) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy mã giảm giá" });
    }
    return res.json({ success: true, data: coupon });
  } catch (err) {
    return next(err);
  }
}

/**
 * PATCH /api/coupon/:id
 * Update coupon (ADMIN only)
 */
export async function updateCoupon(req, res, next) {
  try {
    const { id } = req.params;
    const data = req.body;

    const coupon = await prisma.coupon.update({
      where: { id },
      data,
    });

    return res.json({ success: true, data: coupon });
  } catch (err) {
    if (err.code === "P2025") {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy mã giảm giá" });
    }
    return next(err);
  }
}

/**
 * DELETE /api/coupon/:id
 * Delete coupon (ADMIN only)
 */
export async function deleteCoupon(req, res, next) {
  try {
    const { id } = req.params;
    await prisma.coupon.delete({ where: { id } });
    return res.json({ success: true, message: "Xóa mã giảm giá thành công" });
  } catch (err) {
    if (err.code === "P2025") {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy mã giảm giá" });
    }
    return next(err);
  }
}

/**
 * GET /api/coupon/:id/redemptions
 * Get all redemptions for a coupon (ADMIN/STAFF)
 */
export async function getCouponRedemptions(req, res, next) {
  try {
    const { id } = req.params;
    const coupon = await prisma.coupon.findUnique({ where: { id } });
    if (!coupon) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy mã giảm giá" });
    }

    const redemptions = await prisma.couponRedemption.findMany({
      where: { couponId: id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        order: {
          select: {
            id: true,
            code: true,
            status: true,
            total: true,
            createdAt: true,
          },
        },
      },
      orderBy: { redeemedAt: "desc" },
    });

    return res.json({ success: true, data: redemptions });
  } catch (err) {
    return next(err);
  }
}
