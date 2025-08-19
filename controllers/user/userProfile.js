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
        // dateOfBirth: true,
        avatar: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error("getUserProfile error:", error);
    res.status(500).json({ success: false, message: "Failed to get profile" });
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
          .json({ success: false, message: "Email already in use" });
      }
    }

    // Build update data
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    // if (dateOfBirth !== undefined) {
    //   updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
    // }

    if (Object.keys(updateData).length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No fields to update" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        // dateOfBirth: true,
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
      .json({ success: false, message: "Failed to update profile" });
  }
};

// Change password
export const changePassword = async (req, res) => {
  try {
    const userId = req.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters",
      });
    }

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isCurrentPasswordValid) {
      return res
        .status(400)
        .json({ success: false, message: "Current password is incorrect" });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    res.json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    console.error("changePassword error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to change password" });
  }
};
