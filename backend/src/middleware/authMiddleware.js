const jwt = require("jsonwebtoken")

const authMiddleware = (req, res, next) => {
  // Get token from header
  const token = req.header("x-auth-token")

  // Check if not token
  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" })
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key")

    // Attach user/voter to request
    req.user = decoded
    next()
  } catch (error) {
    res.status(401).json({ message: "Token is not valid" })
  }
}

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.userType)) {
      return res.status(403).json({ message: "Forbidden: You do not have permission to access this resource" })
    }
    next()
  }
}

module.exports = { authMiddleware, authorizeRoles }