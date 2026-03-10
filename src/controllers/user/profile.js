import prisma from "../../config/prisma.js";
import bcrypt from "bcryptjs";

// Get user profile
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        role: true,
        isActive: true,
        hasPassword: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Người dùng không tồn tại" });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error("getUserProfile error:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi khi lấy thông tin người dùng" });
  }
};

// Update user profile
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { name, email, phone } = req.body;

    // Validate email uniqueness if changed
    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id: userId },
        },
      });

      if (existingUser) {
        return res
          .status(400)
          .json({ success: false, message: "Email đã được sử dụng" });
      }
    }

    // Build update data
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;

    if (Object.keys(updateData).length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Không có trường nào để cập nhật" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        role: true,
        isActive: true,
      },
    });

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("updateUserProfile error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Lỗi khi cập nhật thông tin người dùng",
      });
  }
};

// Change password
export const changePassword = async (req, res) => {
  try {
    const userId = req.userId;
    const { currentPassword, newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu mới là bắt buộc",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu mới phải có ít nhất 6 ký tự",
      });
    }

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Người dùng không tồn tại" });
    }

    // If user has a password set, verify the current password
    if (user.hasPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: "Mật khẩu hiện tại là bắt buộc",
        });
      }
      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password,
      );
      if (!isCurrentPasswordValid) {
        return res
          .status(400)
          .json({ success: false, message: "Mật khẩu hiện tại không đúng" });
      }
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password and mark hasPassword as true
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword, hasPassword: true },
    });

    res.json({ success: true, message: "Mật khẩu đã được đổi thành công" });
  } catch (error) {
    console.error("changePassword error:", error);
    res.status(500).json({ success: false, message: "Lỗi khi đổi mật khẩu" });
  }
};
