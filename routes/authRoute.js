import express from "express";
import passport from "../middleware/googleAuth.js";

const router = express.Router();

// Bắt đầu đăng nhập Google
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Callback sau khi đăng nhập Google
import jwt from "jsonwebtoken";

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    // Đăng nhập thành công, trả về JWT token
    const user = req.user;
    const token = jwt.sign(
      { id: user.id || user._id, email: user.email },
      process.env.JWT_SECRET || "your_jwt_secret",
      { expiresIn: "7d" }
    );
    // Trả về token cho frontend (có thể trả về JSON hoặc redirect kèm token)
    res.redirect(`http://localhost:5173?token=${token}`);
    // res.json({ token, user });
  }
);

export default router;
