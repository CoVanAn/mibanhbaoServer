import jwt from "jsonwebtoken";

const authMiddleware = async (req, res, next) => {
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

  if (!token) {
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
    next();
  } catch (error) {
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
