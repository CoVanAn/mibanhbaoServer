import userService from "../../services/user.service.js";
import { createControllerErrorHandler } from "../../utils/controllerError.js";

const getRefreshCookieName = (req) =>
  req.headers["x-client-type"] === "admin"
    ? "adminRefreshToken"
    : "refreshToken";

const setCookieOptions = (res, cookieName, token) => {
  const isProduction = process.env.NODE_ENV === "production";
  const sameSite = isProduction ? "none" : "lax";

  res.cookie(cookieName, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/",
  });
};

const handleError = createControllerErrorHandler({
  defaultMessage: "Lỗi server",
  includeOperationalErrors: true,
});

// Register user
const registerUser = async (req, res) => {
  try {
    const { user, accessToken, refreshToken } = await userService.register(
      req.body,
    );
    setCookieOptions(res, "refreshToken", refreshToken);
    return res.status(201).json({
      success: true,
      message: "Đăng ký thành công",
      accessToken,
      user,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// Login user
const loginUser = async (req, res) => {
  try {
    const { user, accessToken, refreshToken } = await userService.login(
      req.body,
    );
    const cookieName = getRefreshCookieName(req);
    setCookieOptions(res, cookieName, refreshToken);
    return res.status(200).json({
      success: true,
      message: "Đăng nhập thành công",
      accessToken,
      user,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// Get current user (for token validation)

const getCurrentUser = async (req, res) => {
  try {
    const user = await userService.getCurrentUser(req.user.id);
    return res.status(200).json({ success: true, user });
  } catch (error) {
    return handleError(res, error);
  }
};

// Refresh token - verify from DB and rotate
const refreshToken = async (req, res) => {
  try {
    const cookieName = getRefreshCookieName(req);
    const token = req.cookies[cookieName];
    if (!token) {
      return res
        .status(400)
        .json({ success: false, message: "Refresh token là bắt buộc" });
    }
    const { accessToken, refreshToken: newRefreshToken } =
      await userService.rotateRefreshToken(token);
    setCookieOptions(res, cookieName, newRefreshToken);
    return res.status(200).json({ success: true, accessToken });
  } catch (error) {
    return handleError(res, error);
  }
};

// Logout - delete refresh token from DB and clear cookie
const logout = async (req, res) => {
  try {
    const isProduction = process.env.NODE_ENV === "production";
    const sameSite = isProduction ? "none" : "lax";
    const cookieName = getRefreshCookieName(req);
    const token = req.cookies[cookieName];
    await userService.deleteRefreshToken(token);
    res.clearCookie(cookieName, {
      httpOnly: true,
      secure: isProduction,
      sameSite,
      path: "/",
    });
    return res
      .status(200)
      .json({ success: true, message: "Đăng xuất thành công" });
  } catch (error) {
    return handleError(res, error);
  }
};

export { registerUser, loginUser, getCurrentUser, refreshToken, logout };
