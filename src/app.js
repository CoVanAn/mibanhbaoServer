import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";
import passport from "./middleware/googleAuth.js";
import productRouter from "./routes/productRoute.js";
import userRouter from "./routes/userRoute.js";
import cartRouter from "./routes/cartRoute.js";
import categoryRouter from "./routes/categoryRoute.js";
import authRouter from "./routes/authRoute.js";
import orderRouter from "./routes/orderRoute.js";
import couponRouter from "./routes/couponRoute.js";
import customerRouter from "./routes/customerRoute.js";
import employeeRouter from "./routes/employeeRoute.js";
import dashboardRouter from "./routes/dashboardRoute.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFoundHandler } from "./middleware/notFoundHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";
import "dotenv/config";

// Create Express app
const app = express();
const isProduction = process.env.NODE_ENV === "production";
const sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret) {
  if (isProduction) {
    throw new Error("SESSION_SECRET is required in production");
  }
  console.warn("SESSION_SECRET is not set. Using development fallback secret.");
}

// CORS configuration
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

const allowedOrigins = [
  process.env.CLIENT_URL || "https://mibanhbao-client-v1.vercel.app",
  process.env.ADMIN_URL || "https://mibanhbao-admin.vercel.app",
  process.env.FRONTEND_URL,
  process.env.ADMIN_FRONTEND_URL,
]
  .map(normalizeOrigin)
  .filter(Boolean);

const isAllowedVercelAdminOrigin = (origin) => {
  try {
    const { hostname, protocol } = new URL(origin);
    return (
      protocol === "https:" &&
      (hostname === "mibanhbao-admin.vercel.app" ||
        hostname.endsWith("-mibanhbao-admin.vercel.app"))
    );
  } catch {
    return false;
  }
};

if (isProduction) {
  app.set("trust proxy", 1);
}

// Global middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      const normalizedOrigin = normalizeOrigin(origin);

      if (
        (normalizedOrigin && allowedOrigins.includes(normalizedOrigin)) ||
        isAllowedVercelAdminOrigin(origin)
      ) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Blocked origin: ${origin}`);
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "token", "x-client-type"],
    exposedHeaders: ["Set-Cookie"],
  }),
);

app.use(
  session({
    secret: sessionSecret || "dev-only-secret-change-me",
    name: "sid",
    proxy: isProduction,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction,
      httpOnly: true,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }),
);

app.use(passport.initialize());
app.use(passport.session());

// Request logging middleware
if (process.env.NODE_ENV !== "production") {
  app.use(requestLogger);
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Mi Banh Bao API",
    version: "1.0.0",
    endpoints: {
      products: "/api/product",
      users: "/api/user",
      cart: "/api/cart",
      categories: "/api/category",
      orders: "/api/order",
      coupons: "/api/coupon",
      dashboard: "/api/dashboard",
      auth: "/auth",
    },
  });
});

// API routes
app.use("/api/product", productRouter);
app.use("/api/user", userRouter);
app.use("/api/cart", cartRouter);
app.use("/api/category", categoryRouter);
app.use("/api/order", orderRouter);
app.use("/api/coupon", couponRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/auth", authRouter);
app.use("/", customerRouter);
app.use("/", employeeRouter);

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Global error handler - must be last
app.use(errorHandler);

export default app;
