import userService from "../../services/user.service.js";
import bcrypt from "bcryptjs";

const handleError = (res, error) => {
  if (error.isOperational) {
    return res
      .status(error.statusCode)
      .json({ success: false, message: error.message });
  }
  console.error(error);
  return res.status(500).json({ success: false, message: "Lỗi server" });
};

// Get user profile
export const getUserProfile = async (req, res) => {
  try {
    const user = await userService.getProfile(req.userId);
    return res.json({ success: true, user });
  } catch (error) {
    return handleError(res, error);
  }
};

// Update user profile
export const updateUserProfile = async (req, res) => {
  try {
    const user = await userService.updateProfile(req.userId, req.body);
    return res.json({ success: true, user });
  } catch (error) {
    return handleError(res, error);
  }
};

// Change password
export const changePassword = async (req, res) => {
  try {
    await userService.changePassword(req.userId, req.body);
    return res.json({
      success: true,
      message: "Mật khẩu đã được đổi thành công",
    });
  } catch (error) {
    return handleError(res, error);
  }
};
