import userService from "../../services/user.service.js";
import { createControllerErrorHandler } from "../../utils/controllerError.js";

const handleError = createControllerErrorHandler({
  defaultMessage: "Lỗi server",
  includeOperationalErrors: true,
});

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
