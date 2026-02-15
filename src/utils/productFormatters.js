/**
 * Product data formatting utilities
 * Shared between controllers and services
 */

/**
 * Get current price from already-loaded prices array
 * This avoids extra database queries
 */
export const getCurrentPriceFromArray = (prices) => {
  if (!prices || prices.length === 0) return null;

  const now = new Date();
  const activePrices = prices.filter((p) => p.isActive);

  // Find scheduled price (has dates and currently valid)
  const scheduledPrice = activePrices.find((p) => {
    const hasDateRange = p.startsAt || p.endsAt;
    if (!hasDateRange) return false;

    const startsOk = !p.startsAt || new Date(p.startsAt) <= now;
    const endsOk = !p.endsAt || new Date(p.endsAt) >= now;
    return startsOk && endsOk;
  });

  if (scheduledPrice) return scheduledPrice;

  // Fall back to permanent price (no dates)
  const permanentPrice = activePrices.find((p) => !p.startsAt && !p.endsAt);
  return permanentPrice || null;
};

/**
 * Build product summary for list responses
 */
export const buildProductSummary = (product) => {
  const mediaList = product.media || [];
  const image = mediaList[0]?.url ?? null;

  // Use prices already loaded in the query instead of making extra DB calls
  const variantsWithPrice = (product.variants || []).map((variant) => {
    const currentPrice = getCurrentPriceFromArray(variant.prices);
    const normalizedAmount =
      currentPrice?.amount !== undefined && currentPrice?.amount !== null
        ? Number(currentPrice.amount)
        : null;
    return {
      id: variant.id,
      name: variant.name,
      sku: variant.sku,
      isActive: variant.isActive,
      price: normalizedAmount,
      currentPrice: normalizedAmount,
      quantity: variant.inventory?.quantity ?? null,
      safetyStock: variant.inventory?.safetyStock ?? null,
    };
  });

  const defaultVariant =
    variantsWithPrice.find((v) => v.name === "Default") || variantsWithPrice[0];
  const currentPrice = defaultVariant?.price ?? null;

  const categoryLinks = product.categories || [];
  const categoryNames = categoryLinks
    .map((link) => link.category?.name)
    .filter(Boolean);
  const resolvedPrice = currentPrice;
  const createdAt = product.createdAt ? product.createdAt.toISOString() : null;

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: resolvedPrice,
    currentPrice: resolvedPrice,
    description: product.description,
    image,
    createdAt,
    categoryIds: categoryLinks.map((c) => c.categoryId),
    categoryNames,
    isActive: product.isActive,
    isFeatured: product.isFeatured,
    variants: variantsWithPrice,
  };
};

/**
 * Build detailed product response
 */
export const buildProductDetail = (product) => {
  const image = product.media?.[0]?.url ?? null;

  // Get current price for each variant using pre-loaded prices
  const variantsWithPrice = (product.variants || []).map((v) => {
    const currentPrice = getCurrentPriceFromArray(v.prices);
    const normalizedAmount =
      currentPrice?.amount !== undefined && currentPrice?.amount !== null
        ? Number(currentPrice.amount)
        : null;
    return {
      id: v.id,
      name: v.name,
      sku: v.sku,
      isActive: v.isActive,
      price: normalizedAmount,
      currentPrice: normalizedAmount,
      quantity: v.inventory?.quantity ?? null,
      safetyStock: v.inventory?.safetyStock ?? null,
    };
  });

  // Product price is the default variant's current price
  const defaultVariant =
    variantsWithPrice.find((v) => v.name === "Default") || variantsWithPrice[0];
  const productPrice = defaultVariant?.price ?? null;

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    content: product.content,
    isActive: product.isActive,
    isFeatured: product.isFeatured,
    image,
    images: product.media.map((m) => ({
      id: m.id,
      url: m.url,
      position: m.position,
      alt: m.alt,
    })),
    price: productPrice,
    currentPrice: productPrice,
    variants: variantsWithPrice,
    categories: product.categories.map((c) => ({
      id: c.categoryId,
      name: c.category?.name,
    })),
  };
};
