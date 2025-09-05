const errorHandler = (err, req, res, next) => {
  console.error(err.stack) // Log the error stack for debugging

  const statusCode = err.statusCode || 500
  const message = err.message || "Something went wrong!"

  res.status(statusCode).json({
    message: message,
    // Only send error details in development environment
    error: process.env.NODE_ENV === "development" ? err : {},
  })
}

module.exports = errorHandler