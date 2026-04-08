import userService from "../../services/user.service.js";
import { createControllerErrorHandler } from "../../utils/controllerError.js";

const getRefreshCookieName = (req) =>
  req.headers["x-client-type"] === "admin"
    ? "adminRefreshToken"
    : "refreshToken";

const getCookieSecurityOptions = (req) => {
  const isProductionLike =
    process.env.NODE_ENV === "production" ||
    process.env.RENDER === "true" ||
    process.env.COOKIE_SECURE === "true";

  const isHttpsRequest =
    req.secure || req.headers["x-forwarded-proto"] === "https";

  const secure = isProductionLike || isHttpsRequest;
  const sameSite = secure ? "none" : "lax";

  return { secure, sameSite };
};

const setCookieOptions = (req, res, cookieName, token) => {
  const { secure, sameSite } = getCookieSecurityOptions(req);

  res.cookie(cookieName, token, {
    httpOnly: true,
    secure,
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
    setCookieOptions(req, res, "refreshToken", refreshToken);
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
    setCookieOptions(req, res, cookieName, refreshToken);
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
    setCookieOptions(req, res, cookieName, newRefreshToken);
    return res.status(200).json({ success: true, accessToken });
  } catch (error) {
    return handleError(res, error);
  }
};

// Logout - delete refresh token from DB and clear cookie
const logout = async (req, res) => {
  try {
    const { secure, sameSite } = getCookieSecurityOptions(req);
    const cookieName = getRefreshCookieName(req);
    const token = req.cookies[cookieName];
    await userService.deleteRefreshToken(token);
    res.clearCookie(cookieName, {
      httpOnly: true,
      secure,
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
