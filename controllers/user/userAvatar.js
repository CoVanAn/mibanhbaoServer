import prisma from "../../config/prisma.js";
import cloudinary from "../../config/cloudinary.js";

// Helper function to upload to Cloudinary
const uploadToCloudinary = (buffer, folder) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: folder || process.env.CLOUDINARY_FOLDER || "mibanhbao/avatars",
        resource_type: "image",
        transformation: [
          { width: 300, height: 300, crop: "fill", gravity: "face" },
        ],
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });

// Helper function to extract public_id from Cloudinary URL
const getPublicIdFromUrl = (url) => {
  const matches = url.match(/\/v\d+\/(.+)\./);
  return matches ? matches[1] : null;
};

// Upload avatar
export const uploadAvatar = async (req, res) => {
  try {
    const userId = req.userId;
    const file = req.file;

    if (!file) {
      return res
        .status(400)
        .json({ success: false, message: "No image file provided" });
    }

    // Get current user to check for existing avatar
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true },
    });

    // Upload new avatar to Cloudinary
    const folder =
      process.env.CLOUDINARY_FOLDER?.replace("/products", "/avatars") ||
      "mibanhbao/avatars";
    const uploadResult = await uploadToCloudinary(file.buffer, folder);

    // Update user avatar in database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatar: uploadResult.secure_url },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        // dateOfBirth: true,
        avatar: true,
        role: true,
      },
    });

    // Delete old avatar from Cloudinary if exists
    if (user.avatar) {
      try {
        const oldPublicId = getPublicIdFromUrl(user.avatar);
        if (oldPublicId) {
          await cloudinary.uploader.destroy(oldPublicId);
        }
      } catch (cleanupError) {
        console.warn("Failed to delete old avatar:", cleanupError);
        // Don't fail the request for cleanup errors
      }
    }

    res.json({
      success: true,
      message: "Avatar uploaded successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("uploadAvatar error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to upload avatar" });
  }
};

// Delete avatar
export const deleteAvatar = async (req, res) => {
  try {
    const userId = req.userId;

    // Get current user avatar
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true },
    });

    if (!user || !user.avatar) {
      return res
        .status(404)
        .json({ success: false, message: "No avatar to delete" });
    }

    // Remove avatar from database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatar: null },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        // dateOfBirth: true,
        avatar: true,
        role: true,
      },
    });

    // Delete from Cloudinary
    try {
      const publicId = getPublicIdFromUrl(user.avatar);
      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
      }
    } catch (cleanupError) {
      console.warn("Failed to delete avatar from Cloudinary:", cleanupError);
      // Don't fail the request for cleanup errors
    }

    res.json({
      success: true,
      message: "Avatar deleted successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("deleteAvatar error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete avatar" });
  }
};
