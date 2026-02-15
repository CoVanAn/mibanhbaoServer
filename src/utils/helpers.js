/**
 * Utility Helper Functions
 */

/**
 * Convert string to URL-friendly slug (with Vietnamese support)
 */
export const slugify = (text) => {
  if (!text) return "";

  // Convert Vietnamese characters to ASCII
  const from =
    "àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ";
  const to =
    "aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiioooooooooooooooooouuuuuuuuuuuyyyyyd";

  let result = text.toString().trim().toLowerCase();
  for (let i = 0; i < from.length; i++) {
    result = result.replace(new RegExp(from[i], "g"), to[i]);
  }

  return result
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^a-z0-9-]/g, "") // Remove invalid chars
    .replace(/-+/g, "-") // Collapse multiple dashes
    .replace(/^-|-$/g, ""); // Trim dashes from ends
};

/**
 * Generate unique slug with timestamp
 */
export const uniqueSlug = (baseSlug) => {
  return `${slugify(baseSlug)}-${Date.now()}`;
};

/**
 * Parse pagination parameters
 */
export const parsePagination = (query) => {
  const page = parseInt(query.page) || 1;
  const limit = Math.min(parseInt(query.limit) || 20, 100); // Max 100
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Format pagination response
 */
export const formatPaginationResponse = (data, total, page, limit) => {
  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  };
};

/**
 * Async handler wrapper to catch errors
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Pick specific fields from object
 */
export const pick = (obj, keys) => {
  return keys.reduce((result, key) => {
    if (obj && Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = obj[key];
    }
    return result;
  }, {});
};

/**
 * Omit specific fields from object
 */
export const omit = (obj, keys) => {
  const result = { ...obj };
  keys.forEach((key) => {
    delete result[key];
  });
  return result;
};
