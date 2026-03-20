export function createControllerErrorHandler({
  defaultMessage,
  includeOperationalErrors = true,
  includeOperationalDetails = false,
  includeErrorDetails = false,
}) {
  return (res, error) => {
    if (includeOperationalErrors && error?.isOperational) {
      const body = { success: false, message: error.message };
      if (includeOperationalDetails && error.errors !== undefined) {
        body.errors = error.errors;
      }
      if (!error.statusCode) error.statusCode = 500;
      return res.status(error.statusCode).json(body);
    }

    console.error(error);

    const body = { success: false, message: defaultMessage };
    if (includeErrorDetails) {
      body.error = error?.message;
    }

    return res.status(500).json(body);
  };
}
