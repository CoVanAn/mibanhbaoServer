import { HTTP_STATUS, ERROR_CODES } from "../constants/index.js";

/**
 * 404 Not Found Handler
 * Catches all requests to undefined routes
 */
export const notFoundHandler = (req, res, next) => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    error: `Không tìm thấy đường dẫn ${req.method} ${req.url}`,
    code: ERROR_CODES.NOT_FOUND,
  });
};
