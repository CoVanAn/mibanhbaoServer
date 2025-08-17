import express from "express";
import prisma from "../config/prisma.js";
import jwt from "jsonwebtoken";
import {
  loginUser,
  registerUser,
  setPassword,
} from "../controllers/userController.js";
import authMiddleware from "../middleware/auth.js";

const userRouter = express.Router();

// Lấy thông tin user từ JWT (Authorization: Bearer <token> hoặc header token)
userRouter.get("/profile", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: "Không tìm thấy user" });
    res.json({ user });
  } catch (err) {
    res.status(400).json({ message: "Token không hợp lệ" });
  }
});

userRouter.post("/register", registerUser);
userRouter.post("/login", loginUser);
userRouter.post("/set-password", authMiddleware, setPassword);

export default userRouter;
