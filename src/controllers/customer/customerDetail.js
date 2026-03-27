import prisma from "../../config/prisma.js";
import { linkedProvidersFrom } from "../user/adminUserHelpers.js";

import { parsePositiveInt } from "../../utils/id.js";
/**
 * GET /api/admin/customers/:id
 * Get full customer detail: profile + addresses + order history + coupon usage
 * Roles: ADMIN, STAFF
 */
export async function getCustomerDetail(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "ID khách hàng không hợp lệ" });
    }

    const customer = await prisma.user.findUnique({
      where: { id, role: "CUSTOMER" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        isActive: true,
        hasPassword: true,
        createdAt: true,
        updatedAt: true,
        oauthAccounts: {
          select: {
            provider: true,
          },
        },
        addresses: {
          select: {
            id: true,
            name: true,
            phone: true,
            company: true,
            addressLine: true,
            province: true,
            district: true,
            ward: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        orders: {
          select: {
            id: true,
            code: true,
            method: true,
            status: true,
            total: true,
            itemsSubtotal: true,
            shippingFee: true,
            discount: true,
            customerNote: true,
            createdAt: true,
            payments: {
              select: {
                status: true,
                provider: true,
                amount: true,
              },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
            _count: {
              select: { items: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        couponRedemptions: {
          select: {
            id: true,
            discountApplied: true,
            redeemedAt: true,
            status: true,
            coupon: {
              select: {
                code: true,
                type: true,
                value: true,
              },
            },
            order: {
              select: {
                id: true,
                code: true,
                total: true,
              },
            },
          },
          orderBy: { redeemedAt: "desc" },
        },
      },
    });

    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy khách hàng" });
    }

    // Reshape orders for cleaner response
    const orders = customer.orders.map((o) => ({
      id: o.id,
      code: o.code,
      method: o.method,
      status: o.status,
      total: o.total,
      itemsSubtotal: o.itemsSubtotal,
      shippingFee: o.shippingFee,
      discount: o.discount,
      customerNote: o.customerNote,
      itemsCount: o._count.items,
      paymentStatus: o.payments[0]?.status ?? null,
      paymentProvider: o.payments[0]?.provider ?? null,
      createdAt: o.createdAt,
    }));

    return res.json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone ?? null,
        avatar: customer.avatar ?? null,
        isActive: customer.isActive,
        hasPassword: customer.hasPassword,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
        linkedProviders: linkedProvidersFrom(customer),
        addresses: customer.addresses,
        orders,
        couponRedemptions: customer.couponRedemptions,
      },
    });
  } catch (error) {
    return next(error);
  }
}
