import express from "express";
import passport from "../middleware/googleAuth.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import prisma from "../config/prisma.js";

const router = express.Router();
const oauthCodeStore = new Map();
const OAUTH_CODE_TTL_MS = 2 * 60 * 1000;

const resolveFrontendBaseUrl = () => {
  const fallbackUrl = "http://localhost:3000";
  const rawFrontendUrl = process.env.FRONTEND_URL || fallbackUrl;

  try {
    const parsed = new URL(rawFrontendUrl);
    parsed.search = "";
    parsed.hash = "";
    parsed.pathname = parsed.pathname.replace(/\/+$/, "");
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return fallbackUrl;
  }
};

const cleanupExpiredOauthCodes = () => {
  const now = Date.now();
  for (const [code, value] of oauthCodeStore.entries()) {
    if (value.expiresAt <= now) {
      oauthCodeStore.delete(code);
    }
  }
};

const createOauthExchangeCode = (payload) => {
  cleanupExpiredOauthCodes();
  const code = crypto.randomBytes(32).toString("hex");
  oauthCodeStore.set(code, {
    ...payload,
    expiresAt: Date.now() + OAUTH_CODE_TTL_MS,
  });
  return code;
};

const consumeOauthExchangeCode = (code) => {
  cleanupExpiredOauthCodes();
  const value = oauthCodeStore.get(code);
  if (!value) {
    return null;
  }

  oauthCodeStore.delete(code);
  if (value.expiresAt <= Date.now()) {
    return null;
  }

  return value;
};

// Helper function to generate JWT (Access Token - 15 minutes)
const generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });
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
      const accessToken = generateToken(user.id, user.role);
      const refreshToken = await generateRefreshToken(user.id);
      const code = createOauthExchangeCode({ accessToken, refreshToken });

      // Redirect with one-time opaque code instead of tokens to avoid URL token leakage
      const frontendBaseUrl = resolveFrontendBaseUrl();
      const callbackUrl = new URL(
        "api/auth/google/callback",
        `${frontendBaseUrl}/`,
      );
      callbackUrl.searchParams.set("code", code);

      return res.redirect(callbackUrl.toString());
    } catch (error) {
      console.error("[Google OAuth Callback] Error:", error);
      const frontendBaseUrl = resolveFrontendBaseUrl();
      const errorUrl = new URL(
        "api/auth/google/callback",
        `${frontendBaseUrl}/`,
      );
      errorUrl.searchParams.set("error", "server_error");
      return res.redirect(errorUrl.toString());
    }
  },
);

router.post("/google/exchange", (req, res) => {
  const code = typeof req.body?.code === "string" ? req.body.code : "";
  if (!code) {
    return res.status(400).json({
      success: false,
      message: "Mã xác thực không hợp lệ",
    });
  }

  const payload = consumeOauthExchangeCode(code);
  if (!payload) {
    return res.status(400).json({
      success: false,
      message: "Mã xác thực đã hết hạn hoặc không tồn tại",
    });
  }

  return res.status(200).json({
    success: true,
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
  });
});

export default router;
