import { randomBytes } from "crypto";

/**
 * Middleware to ensure guest users have a guestToken
 * Sets a cookie if user is not authenticated
 */
export const ensureGuestToken = (req, res, next) => {
  // If user is authenticated, skip
  if (req.user?.id) {
    return next();
  }

  // Check if guestToken already exists in cookies
  let guestToken = req.cookies.guestToken;

  // If not, create a new one
  if (!guestToken) {
    guestToken = `guest_${randomBytes(32).toString("hex")}`;

    // Set cookie for 30 days
    res.cookie("guestToken", guestToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
  }

  next();
};

export default ensureGuestToken;
