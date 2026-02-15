import jwt from "jsonwebtoken";

const authMiddleware = async (req, res, next) => {
  console.log("=== AUTH MIDDLEWARE DEBUG ===");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  console.log("Headers:", req.headers);

  // Prefer standard Authorization: Bearer <token>, fallback to custom header `token`
  const authHeader = req.headers.authorization || req.headers.Authorization;
  let token = req.headers.token;

  if (
    authHeader &&
    typeof authHeader === "string" &&
    authHeader.startsWith("Bearer ")
  ) {
    token = authHeader.substring(7);
  }

  console.log("Token found:", !!token);
  console.log("Token value:", token?.substring(0, 20) + "...");

  if (!token) {
    console.log("No token provided - returning 401");
    return res.status(401).json({
      success: false,
      error: "Not Authorized. Login again.",
      code: "NO_TOKEN",
    });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.body.userId = decoded.id;
    req.userId = decoded.id;
    req.user = decoded;
    console.log("Auth successful for user:", decoded.id);
    next();
  } catch (error) {
    console.log("Token verification failed:", error.message);

    // Distinguish between expired token and other errors
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        error: "Token expired",
        code: "TOKEN_EXPIRED",
      });
    }

    res.status(401).json({
      success: false,
      error: "Please authenticate",
      code: "INVALID_TOKEN",
    });
  }
};

export default authMiddleware;
