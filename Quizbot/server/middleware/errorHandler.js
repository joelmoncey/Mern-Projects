export function notFoundHandler(req, res) {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(err, _req, res, _next) {
  const statusCode = err.statusCode || err.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  const message =
    isProduction && statusCode === 500
      ? 'Internal Server Error'
      : err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: message,
    ...(isProduction ? {} : { stack: err.stack }),
  });
}
