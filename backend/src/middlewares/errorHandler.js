/**
 * Centralized error handling middleware.
 * Formats operational and unexpected errors, hiding database internals in production.
 */
export const errorHandler = (err, req, res, next) => {
  console.error('[Error Details]:', err);

  const statusCode = err.statusCode || err.status || 500;
  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(statusCode).json({
    status: statusCode >= 500 ? 'error' : 'fail',
    message: statusCode >= 500 && !isDevelopment
      ? 'An unexpected internal server error occurred'
      : (err.message || 'Internal Server Error'),
    ...(isDevelopment && statusCode >= 500 ? { stack: err.stack } : {})
  });
};

export default errorHandler;
