import userService from "../../services/user.service.js";
import { createControllerErrorHandler } from "../../utils/controllerError.js";

const handleError = createControllerErrorHandler({
  defaultMessage: "Lỗi server",
  includeOperationalErrors: true,
});

// Upload avatar
export const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "Không có tệp ảnh được cung cấp" });
    }
    const user = await userService.uploadAvatar(req.userId, req.file.buffer);
    return res.json({
      success: true,
      message: "Tải ảnh đại diện lên thành công",
      user,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// Delete avatar
export const deleteAvatar = async (req, res) => {
  try {
    const user = await userService.deleteAvatar(req.userId);
    return res.json({
      success: true,
      message: "Xóa ảnh đại diện thành công",
      user,
    });
  } catch (error) {
    return handleError(res, error);
  }
};
