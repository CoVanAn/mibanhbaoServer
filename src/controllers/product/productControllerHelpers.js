import prisma from "../../config/prisma.js";

export function parsePositiveId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }
  return id;
}

export async function getExistingProduct(productId) {
  return prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
}

export async function getVariantWithOwnership(variantId, productId = null) {
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
  });

  if (!variant) {
    return { variant: null, reason: "not_found" };
  }

  if (productId && variant.productId !== productId) {
    return { variant: null, reason: "ownership_mismatch" };
  }

  return { variant, reason: null };
}
