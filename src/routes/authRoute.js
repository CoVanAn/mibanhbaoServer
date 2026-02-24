import express from "express";
import passport from "../middleware/googleAuth.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = express.Router();

// Helper function to generate JWT (Access Token - 15 minutes)
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "15m" });
};

// Helper function to generate and store Refresh Token (30 days)
const generateRefreshToken = async (userId) => {
  const token = crypto.randomBytes(40).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await prisma.refreshToken.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  return token;
};

// Bắt đầu đăng nhập Google
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

// Callback sau khi đăng nhập Google
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  async (req, res) => {
    try {
      const user = req.user;

      // Generate both access token and refresh token
      const accessToken = generateToken(user.id);
      const refreshToken = await generateRefreshToken(user.id);

      // Redirect to Next.js API route with tokens as query params
      // Next.js route will set them as HttpOnly cookies
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      const callbackUrl = `${frontendUrl}/api/auth/google/callback?accessToken=${encodeURIComponent(accessToken)}&refreshToken=${encodeURIComponent(refreshToken)}`;

      return res.redirect(callbackUrl);
    } catch (error) {
      console.error("[Google OAuth Callback] Error:", error);
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      return res.redirect(
        `${frontendUrl}/api/auth/google/callback?error=server_error`,
      );
    }
  },
);

export default router;
