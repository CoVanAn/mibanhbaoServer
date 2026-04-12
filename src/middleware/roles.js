import prisma from "../config/prisma.js";

// Usage: requireRoles('ADMIN','STAFF')
export const requireRoles = (...roles) => {
  return async (req, res, next) => {
    try {
      const userId = req.userId || req.body.userId;
      if (!userId)
        return res.status(401).json({ message: "Chưa được xác thực" });
      const user = await prisma.user.findUnique({
        where: { id: Number(userId) },
        select: { role: true, isActive: true },
      });
      if (!user || user.isActive === false)
        return res.status(401).json({ message: "Chưa được xác thực" });
      if (!roles.includes(user.role))
        return res.status(403).json({ message: "Không có quyền truy cập" });
      return next();
    } catch (err) {
      console.error("requireRoles error:", err);
      return res.status(500).json({ message: "Lỗi máy chủ" });
    }
  };
};

export default { requireRoles };
