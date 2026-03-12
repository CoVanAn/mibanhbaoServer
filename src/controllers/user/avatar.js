import userService from "../../services/user.service.js";

const handleError = (res, error) => {
  if (error.isOperational) {
    return res
      .status(error.statusCode)
      .json({ success: false, message: error.message });
  }
  console.error(error);
  return res.status(500).json({ success: false, message: "Lỗi server" });
};

// Upload avatar
export const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No image file provided" });
    }
    const user = await userService.uploadAvatar(req.userId, req.file.buffer);
    return res.json({
      success: true,
      message: "Avatar uploaded successfully",
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
      message: "Avatar deleted successfully",
      user,
    });
  } catch (error) {
    return handleError(res, error);
  }
};
