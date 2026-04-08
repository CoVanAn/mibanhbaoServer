import app from "./app.js";
import { connectDB } from "./config/db.js";
import { createServer } from "http";
import { initSocketServer } from "./realtime/socketServer.js";
import "dotenv/config";

const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || "0.0.0.0";
const PUBLIC_URL =
  process.env.RENDER_EXTERNAL_URL ||
  process.env.PUBLIC_URL ||
  `http://localhost:${PORT}`;

// Graceful shutdown handler
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  server.close(() => {
    console.log("HTTP server closed");

    // Close database connections
    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error("Forced shutdown after timeout");
    process.exit(1);
  }, 30000);
};

// Connect to database
try {
  await connectDB();
  console.log("✅ Database connected successfully");
} catch (error) {
  console.error("❌ Database connection failed:", error);
  process.exit(1);
}

// Start server (HTTP + Socket)
const httpServer = createServer(app);
initSocketServer(httpServer);

const server = httpServer.listen(PORT, HOST, () => {
  console.log(`\n🚀 Server listening on ${HOST}:${PORT}`);
  console.log(`🌐 Public URL: ${PUBLIC_URL}`);
  console.log(`📚 API documentation: ${PUBLIC_URL}/`);
  console.log(`🏥 Health check: ${PUBLIC_URL}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown("UNHANDLED_REJECTION");
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  gracefulShutdown("UNCAUGHT_EXCEPTION");
});

// Handle termination signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
