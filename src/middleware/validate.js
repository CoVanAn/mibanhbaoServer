/**
 * Validation Middleware
 * Using Zod to validate request body, params, and query strings
 */

/**
 * Middleware to validate request body
 * @param {Object} schema - Zod validation schema
 */
export const validateBody = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    req.body = result.data; // Replace body with validated value
    next();
  };
};

/**
 * Middleware to validate request params
 * @param {Object} schema - Zod validation schema
 */
export const validateParams = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    req.params = result.data;
    next();
  };
};

/**
 * Middleware to validate request query
 * @param {Object} schema - Zod validation schema
 */
export const validateQuery = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    req.query = result.data;
    next();
  };
};

/**
 * Shorthand for validateBody
 */
export const validate = validateBody;
