import { HTTP_STATUS } from "../constants/index.js";
import { AppError } from "../exceptions/index.js";

/**
 * Global Error Handler Middleware
 * Handles all errors thrown in the application
 */
export const errorHandler = (err, req, res, next) => {
  // Log error for debugging
  console.error("❌ Error:", {
    message: err.message,
    code: err.code,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    url: req.url,
    method: req.method,
  });

  // Default error values
  let statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let message = "Internal server error";
  let code = "INTERNAL_ERROR";
  let errors = undefined;

  // Handle operational errors (AppError instances)
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code;
    errors = err.errors;
  }
  // Handle Prisma errors
  else if (err.code?.startsWith("P")) {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    code = "DATABASE_ERROR";

    // P2002: Unique constraint violation
    if (err.code === "P2002") {
      message = `Duplicate value for ${err.meta?.target?.join(", ") || "field"}`;
      statusCode = HTTP_STATUS.CONFLICT;
      code = "ALREADY_EXISTS";
    }
    // P2025: Record not found
    else if (err.code === "P2025") {
      message = "Record not found";
      statusCode = HTTP_STATUS.NOT_FOUND;
      code = "NOT_FOUND";
    }
    // P2003: Foreign key constraint failed
    else if (err.code === "P2003") {
      message = "Related record not found";
      statusCode = HTTP_STATUS.BAD_REQUEST;
    } else {
      message = "Database operation failed";
    }
  }
  // Handle JWT errors
  else if (err.name === "JsonWebTokenError") {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    message = "Invalid token";
    code = "INVALID_TOKEN";
  } else if (err.name === "TokenExpiredError") {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    message = "Token expired";
    code = "TOKEN_EXPIRED";
  }
  // Handle validation errors (Zod)
  else if (err.name === "ZodError") {
    statusCode = HTTP_STATUS.VALIDATION_ERROR;
    message = "Validation failed";
    code = "VALIDATION_ERROR";
    errors = err.errors?.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }));
  }
  // Handle Multer errors
  else if (err.name === "MulterError") {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    code = "UPLOAD_ERROR";

    if (err.code === "LIMIT_FILE_SIZE") {
      message = "File size exceeds limit";
    } else if (err.code === "LIMIT_FILE_COUNT") {
      message = "Too many files";
    } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
      message = "Unexpected file field";
    } else {
      message = err.message;
    }
  }

  // Send error response
  const response = {
    success: false,
    error: message,
    code,
  };

  // Include errors array if present (validation errors)
  if (errors) {
    response.errors = errors;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === "development") {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};
