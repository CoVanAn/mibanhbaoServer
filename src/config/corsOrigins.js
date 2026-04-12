const normalizeOrigin = (value) => {
  if (!value || typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    return new URL(trimmed).origin;
  } catch {
    try {
      return new URL(`https://${trimmed}`).origin;
    } catch {
      return null;
    }
  }
};

const parseOriginsFromList = (value) => {
  if (!value || typeof value !== "string") {
    return [];
  }

  return value
    .split(",")
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);
};

export const getAllowedCorsOrigins = ({ isProduction = false } = {}) => {
  const explicitOrigins = parseOriginsFromList(process.env.CORS_ORIGINS);

  const legacyOrigins = [
    process.env.CLIENT_URL,
    process.env.ADMIN_URL,
    process.env.FRONTEND_URL,
    process.env.ADMIN_FRONTEND_URL,
  ]
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);

  const localDevOrigins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ];

  const merged = new Set([
    ...explicitOrigins,
    ...legacyOrigins,
    ...(isProduction ? [] : localDevOrigins),
  ]);

  return [...merged];
};
