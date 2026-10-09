/**
 * Centralized error handling middleware.
 * Formats operational and unexpected errors, hiding database internals in production.
 */
export const errorHandler = (err, req, res, next) => {
  console.error('[Error Details]:', err);

  // Catch any unhandled MySQL duplicate entry errors safely
  if (err.code === 'ER_DUP_ENTRY') {
    const errMsg = (err.message || '').toLowerCase();
    if (errMsg.includes('email')) {
      return res.status(409).json({
        status: 'fail',
        message: 'Email is already registered'
      });
    }
    if (errMsg.includes('mobile')) {
      return res.status(409).json({
        status: 'fail',
        message: 'Mobile number is already registered'
      });
    }
    return res.status(409).json({
      status: 'fail',
      message: 'A duplicate record already exists'
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(statusCode).json({
    status: statusCode >= 500 ? 'error' : 'fail',
    message: err.message || 'Internal Server Error',
    ...(isDevelopment && statusCode >= 500 ? { stack: err.stack } : {})
  });
};

export default errorHandler;
