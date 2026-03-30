export const EMPLOYEE_ROLES = ["ADMIN", "STAFF"];

export function isEmployeeRole(role) {
  return EMPLOYEE_ROLES.includes(role);
}

export function getPagingParams(query, defaults = { page: 1, limit: 20 }) {
  const parsedPage = Number(query.page ?? defaults.page);
  const parsedLimit = Number(query.limit ?? defaults.limit);

  const pageNum =
    Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : defaults.page;
  const limitNum = Math.min(
    Number.isInteger(parsedLimit) && parsedLimit > 0
      ? parsedLimit
      : defaults.limit,
    100,
  );
  const skip = (pageNum - 1) * limitNum;
  return { pageNum, limitNum, skip };
}

export function applyIsActiveFilter(where, isActive) {
  if (typeof isActive === "boolean") {
    where.isActive = isActive;
  } else if (isActive === "true") {
    where.isActive = true;
  } else if (isActive === "false") {
    where.isActive = false;
  }
}

export function applyUserSearchFilter(where, search) {
  const trimmedSearch = search ? search.trim() : null;

  if (trimmedSearch) {
    where.OR = [
      { name: { contains: trimmedSearch, mode: "insensitive" } },
      { email: { contains: trimmedSearch, mode: "insensitive" } },
      { phone: { contains: trimmedSearch, mode: "insensitive" } },
    ];
  }
}

export function buildPagination(pageNum, limitNum, total) {
  return {
    page: pageNum,
    limit: limitNum,
    total,
    totalPages: Math.ceil(total / limitNum),
  };
}

export function mapUserSummary(user, options = {}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone ?? null,
    avatar: user.avatar ?? null,
    ...(options.includeRole ? { role: user.role } : {}),
    isActive: user.isActive,
    createdAt: user.createdAt,
    ...(options.includeOrdersCount
      ? { ordersCount: user._count?.orders ?? 0 }
      : {}),
  };
}

export function linkedProvidersFrom(user) {
  return (user.oauthAccounts || []).map((item) => item.provider);
}
