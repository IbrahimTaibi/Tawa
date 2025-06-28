module.exports = (err, req, res, next) => {
  const status = err.status || 500;
  const response = {
    success: false,
    message: err.message || "Internal Server Error",
  };
  if (process.env.NODE_ENV !== "production" && err.stack) {
    response.error = err.stack;
  }
  res.status(status).json(response);
};
