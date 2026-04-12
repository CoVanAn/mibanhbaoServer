import jwt from "jsonwebtoken";

/**
 * Optional authentication middleware.
 * If token is valid, attach decoded user to request.
 * If token is missing/invalid, continue as guest.
 */
export default function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  let token = req.headers.token;

  if (
    authHeader &&
    typeof authHeader === "string" &&
    authHeader.startsWith("Bearer ")
  ) {
    token = authHeader.substring(7);
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      if (decoded?.id) {
        req.userId = decoded.id;
      }
    } catch {
      // Token không hợp lệ: continue as guest.
    }
  }

  next();
}
