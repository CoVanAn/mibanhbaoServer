import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import { getAllowedCorsOrigins } from "../config/corsOrigins.js";

let ioInstance = null;

const extractToken = (socket) => {
  const authToken = socket.handshake.auth?.token;
  if (authToken && typeof authToken === "string") {
    return authToken;
  }

  const authHeader =
    socket.handshake.headers?.authorization ||
    socket.handshake.headers?.Authorization;

  if (
    authHeader &&
    typeof authHeader === "string" &&
    authHeader.startsWith("Bearer ")
  ) {
    return authHeader.substring(7);
  }

  return null;
};

const canAccessOrderRoom = async ({ userId, role, orderId }) => {
  if (role === "ADMIN" || role === "STAFF") {
    return true;
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { userId: true },
  });

  return !!order && order.userId === Number(userId);
};

const registerConnectionHandlers = (io) => {
  io.on("connection", async (socket) => {
    const user = socket.data.user;
    const userId = Number(user.id);
    const role = user.role;

    socket.join(`user:${userId}`);
    if (role === "ADMIN" || role === "STAFF") {
      socket.join("admin");
    }

    try {
      await prisma.socket.create({
        data: {
          socketId: socket.id,
          userId,
        },
      });
    } catch (error) {
      console.error(
        "[socket] failed to persist socket session:",
        error.message,
      );
    }

    socket.on("order:subscribe", async (payload, ack) => {
      try {
        const orderId = Number(payload?.orderId);
        if (!Number.isInteger(orderId) || orderId <= 0) {
          if (typeof ack === "function") {
            ack({ success: false, message: "orderId không hợp lệ" });
          }
          return;
        }

        const allowed = await canAccessOrderRoom({ userId, role, orderId });
        if (!allowed) {
          if (typeof ack === "function") {
            ack({ success: false, message: "Không có quyền truy cập" });
          }
          return;
        }

        socket.join(`order:${orderId}`);
        if (typeof ack === "function") {
          ack({ success: true, room: `order:${orderId}` });
        }
      } catch (error) {
        if (typeof ack === "function") {
          ack({ success: false, message: "Không thể đăng ký theo dõi" });
        }
      }
    });

    socket.on("order:unsubscribe", (payload) => {
      const orderId = Number(payload?.orderId);
      if (!Number.isInteger(orderId) || orderId <= 0) {
        return;
      }
      socket.leave(`order:${orderId}`);
    });

    socket.on("disconnect", async () => {
      try {
        await prisma.socket.delete({ where: { socketId: socket.id } });
      } catch (error) {
        // Ignore missing rows; stale socket rows should not crash disconnect flow.
      }
    });
  });
};

export const initSocketServer = (httpServer) => {
  if (ioInstance) {
    return ioInstance;
  }

  const io = new Server(httpServer, {
    cors: {
      origin: getAllowedCorsOrigins({
        isProduction: process.env.NODE_ENV === "production",
      }),
      credentials: true,
      methods: ["GET", "POST"],
      allowedHeaders: ["Authorization", "Content-Type", "token"],
    },
    transports: ["websocket", "polling"],
  });

  io.use((socket, next) => {
    try {
      const token = extractToken(socket);
      if (!token) {
        return next(new Error("Chưa được xác thực"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.data.user = decoded;
      return next();
    } catch (error) {
      return next(new Error("Chưa được xác thực"));
    }
  });

  registerConnectionHandlers(io);
  ioInstance = io;
  return ioInstance;
};

export const getSocketServer = () => ioInstance;
