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
    return res
      .status(401)
      .json({ success: false, error: "Not Authorized. Login again." });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.body.userId = decoded.id;
    req.userId = decoded.id;
    next();
  } catch (error) {
    console.log(error);
    res.status(401).json({ success: false, error: "Please authenticate" });
  }
};

export default authMiddleware;
