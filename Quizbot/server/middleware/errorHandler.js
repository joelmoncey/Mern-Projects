export function notFoundHandler(req, res) {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || err.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  if (statusCode >= 500) {
    console.error(
      `[error] ${req?.method} ${req?.originalUrl} -> ${statusCode}:`,
      err.code ? `code=${err.code}` : '',
      err.message,
      err.keyPattern ? `keyPattern=${JSON.stringify(err.keyPattern)}` : ''
    );
  }

  const message =
    isProduction && statusCode === 500
      ? 'Internal Server Error'
      : err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: message,
    ...(isProduction ? {} : { stack: err.stack }),
  });
}
