import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import prisma from "../config/prisma.js";
import cloudinary from "../config/cloudinary.js";
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
  AuthenticationError,
} from "../exceptions/index.js";

export class UserService {
  // ──────────── Auth ────────────

  generateToken(userId, role) {
    return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });
  }

  async generateRefreshToken(userId) {
    const token = crypto.randomBytes(40).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await prisma.refreshToken.create({ data: { token, userId, expiresAt } });
    return token;
  }

  async register({ email, password, name, phone }) {
    if (!email || !password || !name) {
      throw new BadRequestError("Email, password và tên là bắt buộc");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestError("Email không hợp lệ");
    }

    if (password.length < 6) {
      throw new BadRequestError("Mật khẩu phải có ít nhất 6 ký tự");
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictError("Email đã được sử dụng");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        hasPassword: true,
        name: name.trim(),
        phone: phone || null,
        role: "CUSTOMER",
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        avatar: true,
        createdAt: true,
      },
    });

    const accessToken = this.generateToken(user.id, user.role);
    const refreshToken = await this.generateRefreshToken(user.id);
    return { user, accessToken, refreshToken };
  }

  async login({ email, password }) {
    if (!email || !password) {
      throw new BadRequestError("Email và mật khẩu là bắt buộc");
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        phone: true,
        role: true,
        avatar: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AuthenticationError("Email hoặc mật khẩu không chính xác");
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new AuthenticationError("Email hoặc mật khẩu không chính xác");
    }

    const accessToken = this.generateToken(user.id, user.role);
    const refreshToken = await this.generateRefreshToken(user.id);
    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, accessToken, refreshToken };
  }

  async getCurrentUser(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        avatar: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundError("Người dùng");
    return user;
  }

  async rotateRefreshToken(token) {
    const record = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!record) {
      throw new AuthenticationError("Refresh token không hợp lệ");
    }

    if (new Date() > record.expiresAt) {
      await prisma.refreshToken.delete({ where: { token } });
      throw new AuthenticationError("Refresh token đã hết hạn");
    }

    await prisma.refreshToken.delete({ where: { token } });
    const accessToken = this.generateToken(record.userId, record.user?.role);
    const refreshToken = await this.generateRefreshToken(record.userId);
    return { accessToken, refreshToken };
  }

  async deleteRefreshToken(token) {
    if (token) {
      await prisma.refreshToken.deleteMany({ where: { token } });
    }
  }

  // ──────────── Profile ────────────

  async getProfile(userId) {
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
    if (!user) throw new NotFoundError("Người dùng");
    return user;
  }

  async updateProfile(userId, { name, email, phone }) {
    if (email) {
      const existing = await prisma.user.findFirst({
        where: { email, NOT: { id: userId } },
      });
      if (existing) throw new ConflictError("Email đã được sử dụng");
    }

    const data = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (phone !== undefined) data.phone = phone;

    if (!Object.keys(data).length) {
      throw new BadRequestError("Không có trường nào để cập nhật");
    }

    return prisma.user.update({
      where: { id: userId },
      data,
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
  }

  async changePassword(userId, { currentPassword, newPassword }) {
    if (!newPassword) throw new BadRequestError("Mật khẩu mới là bắt buộc");
    if (newPassword.length < 6)
      throw new BadRequestError("Mật khẩu mới phải có ít nhất 6 ký tự");

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError("Người dùng");

    if (user.hasPassword) {
      if (!currentPassword)
        throw new BadRequestError("Mật khẩu hiện tại là bắt buộc");
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) throw new BadRequestError("Mật khẩu hiện tại không đúng");
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed, hasPassword: true },
    });
  }

  // ──────────── Address ────────────

  async getAddresses(userId) {
    return prisma.address.findMany({
      where: { userId },
      orderBy: [{ id: "desc" }],
    });
  }

  async getAddress(userId, addressId) {
    const address = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });
    if (!address) throw new NotFoundError("Địa chỉ");
    return address;
  }

  async addAddress(
    userId,
    { name, phone, company, addressLine, province, district, ward },
  ) {
    if (!name || !phone || !addressLine || !province || !district || !ward) {
      throw new BadRequestError(
        "Các trường bắt buộc: name, phone, addressLine, province, district, ward",
      );
    }
    return prisma.address.create({
      data: {
        userId,
        name,
        phone,
        company: company || null,
        addressLine,
        province,
        district,
        ward,
      },
    });
  }

  async updateAddress(userId, addressId, data) {
    const existing = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });
    if (!existing) throw new NotFoundError("Địa chỉ");

    const { name, phone, company, addressLine, province, district, ward } =
      data;
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (company !== undefined) updateData.company = company;
    if (addressLine !== undefined) updateData.addressLine = addressLine;
    if (province !== undefined) updateData.province = province;
    if (district !== undefined) updateData.district = district;
    if (ward !== undefined) updateData.ward = ward;

    if (!Object.keys(updateData).length) {
      throw new BadRequestError("No fields to update");
    }

    return prisma.address.update({
      where: { id: addressId },
      data: updateData,
    });
  }

  async deleteAddress(userId, addressId) {
    const existing = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });
    if (!existing) throw new NotFoundError("Địa chỉ");
    await prisma.address.delete({ where: { id: addressId } });
  }

  // ──────────── Avatar ────────────

  _uploadToCloudinary(buffer, folder) {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder:
            folder || process.env.CLOUDINARY_FOLDER || "mibanhbao/avatars",
          resource_type: "image",
          transformation: [
            { width: 300, height: 300, crop: "fill", gravity: "face" },
          ],
        },
        (err, result) => (err ? reject(err) : resolve(result)),
      );
      stream.end(buffer);
    });
  }

  _getPublicIdFromUrl(url) {
    const matches = url.match(/\/v\d+\/(.+)\./);
    return matches ? matches[1] : null;
  }

  async uploadAvatar(userId, fileBuffer) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true },
    });

    const folder =
      process.env.CLOUDINARY_FOLDER?.replace("/products", "/avatars") ||
      "mibanhbao/avatars";
    const uploadResult = await this._uploadToCloudinary(fileBuffer, folder);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatar: uploadResult.secure_url },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        role: true,
      },
    });

    if (user?.avatar) {
      try {
        const oldPublicId = this._getPublicIdFromUrl(user.avatar);
        if (oldPublicId) await cloudinary.uploader.destroy(oldPublicId);
      } catch (cleanupError) {
        console.warn("Không thể xóa avatar cũ:", cleanupError);
      }
    }

    return updatedUser;
  }

  async deleteAvatar(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true },
    });

    if (!user?.avatar) throw new NotFoundError("Avatar");

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatar: null },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        role: true,
      },
    });

    try {
      const publicId = this._getPublicIdFromUrl(user.avatar);
      if (publicId) await cloudinary.uploader.destroy(publicId);
    } catch (cleanupError) {
      console.warn("Không thể xóa avatar từ Cloudinary:", cleanupError);
    }

    return updatedUser;
  }
}

export default new UserService();
