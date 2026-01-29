import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Helper function to generate JWT (Access Token - 15 minutes)
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "15m" });
};

// Helper function to generate and store Refresh Token (30 days)
const generateRefreshToken = async (userId) => {
  // Generate random token
  const token = crypto.randomBytes(40).toString("hex");

  // Set expiration to 30 days from now
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  // Store in database
  await prisma.refreshToken.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  return token;
};

// Register user
const registerUser = async (req, res) => {
  try {
    const { email, password, name, phone } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: "Email, password và tên là bắt buộc",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Email không hợp lệ",
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu phải có ít nhất 6 ký tự",
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email đã được sử dụng",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name: name.trim(),
        phone: phone || null,
        role: "CUSTOMER", // Default role
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        avatar: true,
        createdAt: true,
      },
    });

    // Generate tokens
    const accessToken = generateToken(user.id);
    const refreshToken = await generateRefreshToken(user.id);

    // Set refresh token as HttpOnly cookie
    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProduction, // HTTPS in production
      sameSite: isProduction ? "strict" : "lax", // strict in production, lax in development
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: "/", // Ensure cookie is sent for all paths
    });

    res.status(201).json({
      success: true,
      message: "Đăng ký thành công",
      accessToken,
      user,
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
    });
  }
};

// Login user
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email và mật khẩu là bắt buộc",
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        phone: true,
        role: true,
        avatar: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Email hoặc mật khẩu không chính xác",
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Email hoặc mật khẩu không chính xác",
      });
    }

    // Generate tokens
    const accessToken = generateToken(user.id);
    const refreshToken = await generateRefreshToken(user.id);

    // Set refresh token as HttpOnly cookie
    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProduction, // HTTPS in production
      sameSite: isProduction ? "strict" : "lax", // strict in production, lax in development
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: "/", // Ensure cookie is sent for all paths
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.status(200).json({
      success: true,
      message: "Đăng nhập thành công",
      accessToken,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
    });
  }
};

// Get current user (for token validation)
const getCurrentUser = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        avatar: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Người dùng không tồn tại",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
    });
  }
};

// Refresh token - verify from DB and rotate
const refreshToken = async (req, res) => {
  try {
    // Read refresh token from HttpOnly cookie
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token là bắt buộc",
      });
    }

    // Find refresh token in database
    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    // Validate token exists and not expired
    if (!tokenRecord) {
      return res.status(401).json({
        success: false,
        message: "Refresh token không hợp lệ",
      });
    }

    if (new Date() > tokenRecord.expiresAt) {
      // Delete expired token
      await prisma.refreshToken.delete({
        where: { token: refreshToken },
      });

      return res.status(401).json({
        success: false,
        message: "Refresh token đã hết hạn",
      });
    }

    // Token rotation: delete old token and create new one
    await prisma.refreshToken.delete({
      where: { token: refreshToken },
    });

    // Generate new tokens
    const newAccessToken = generateToken(tokenRecord.userId);
    const newRefreshToken = await generateRefreshToken(tokenRecord.userId);

    // Set new refresh token as HttpOnly cookie
    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "strict" : "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: "/",
    });

    res.status(200).json({
      success: true,
      accessToken: newAccessToken,
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
    });
  }
};

// Logout - delete refresh token from DB and clear cookie
const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      // Delete refresh token from database
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    }

    // Clear cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    res.status(200).json({
      success: true,
      message: "Đăng xuất thành công",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
    });
  }
};

export { registerUser, loginUser, getCurrentUser, refreshToken, logout };
