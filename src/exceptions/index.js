import { HTTP_STATUS, ERROR_CODES } from "../constants/index.js";

/**
 * Base Application Error
 */
export class AppError extends Error {
  constructor(
    message,
    statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    code = ERROR_CODES.INTERNAL_ERROR,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation Error
 */
export class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, HTTP_STATUS.VALIDATION_ERROR, ERROR_CODES.VALIDATION_ERROR);
    this.errors = errors;
  }
}

/**
 * Authentication Error
 */
export class AuthenticationError extends AppError {
  constructor(
    message = "Authentication required",
    code = ERROR_CODES.NO_TOKEN,
  ) {
    super(message, HTTP_STATUS.UNAUTHORIZED, code);
  }
}

/**
 * Authorization Error
 */
export class AuthorizationError extends AppError {
  constructor(
    message = "Insufficient permissions",
    code = ERROR_CODES.FORBIDDEN,
  ) {
    super(message, HTTP_STATUS.FORBIDDEN, code);
  }
}

/**
 * Not Found Error
 */
export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(
      `${resource} not found`,
      HTTP_STATUS.NOT_FOUND,
      ERROR_CODES.NOT_FOUND,
    );
  }
}

/**
 * Conflict Error
 */
export class ConflictError extends AppError {
  constructor(message = "Resource already exists") {
    super(message, HTTP_STATUS.CONFLICT, ERROR_CODES.ALREADY_EXISTS);
  }
}

/**
 * Bad Request Error
 */
export class BadRequestError extends AppError {
  constructor(message = "Bad request") {
    super(message, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_INPUT);
  }
}

/**
 * Database Error
 */
export class DatabaseError extends AppError {
  constructor(message = "Database operation failed") {
    super(
      message,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_CODES.DATABASE_ERROR,
    );
  }
}

/**
 * External Service Error
 */
export class ExternalServiceError extends AppError {
  constructor(message = "External service error", service = "unknown") {
    super(
      message,
      HTTP_STATUS.SERVICE_UNAVAILABLE,
      ERROR_CODES.EXTERNAL_SERVICE_ERROR,
    );
    this.service = service;
  }
}
