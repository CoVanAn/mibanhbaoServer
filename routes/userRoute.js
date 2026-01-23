import express from "express";
import multer from "multer";
import authMiddleware from "../middleware/auth.js";
import {
  // Profile
  getUserProfile,
  updateUserProfile,
  changePassword,
  // Address
  getUserAddresses,
  getAddress,
  addAddress,
  updateAddress,
  deleteAddress,
  // Avatar
  uploadAvatar,
  deleteAvatar,
  // Authentication
  registerUser,
  loginUser,
  getCurrentUser,
  refreshToken,
  logout,
} from "../controllers/user/index.js";

const router = express.Router();

// Authentication routes (no auth middleware)
router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", authMiddleware, getCurrentUser);
router.post("/refresh-token", refreshToken);
router.post("/logout", logout);

// Setup multer for avatar upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only PNG, JPEG, WEBP images are allowed"));
    }
    cb(null, true);
  },
});

// Profile routes
router.get("/profile", authMiddleware, getUserProfile);
router.patch("/profile", authMiddleware, updateUserProfile);
router.put("/profile", authMiddleware, updateUserProfile); // Fallback

// Password routes
router.post("/change-password", authMiddleware, changePassword);

// Address routes
router.get("/addresses", authMiddleware, getUserAddresses);
router.post("/addresses", authMiddleware, addAddress);
router.get("/addresses/:id", authMiddleware, getAddress);
router.patch("/addresses/:id", authMiddleware, updateAddress);
router.put("/addresses/:id", authMiddleware, updateAddress); // Fallback
router.delete("/addresses/:id", authMiddleware, deleteAddress);

// Avatar routes
router.post("/avatar", authMiddleware, upload.single("avatar"), uploadAvatar);
router.delete("/avatar", authMiddleware, deleteAvatar);

// Handle multer errors
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError || error.message.includes("image")) {
    return res.status(400).json({ success: false, message: error.message });
  }
  next(error);
});

export default router;
