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
    if (!req.user || !req.user.userType) {
      return res.status(403).json({ message: "Forbidden: You do not have permission to access this resource" })
    }
    
    // Special handling for "voter" userType since it's not in User model enum
    // but is used in JWT tokens for voter authentication
    const allowedRoles = [...roles]
    
    if (!allowedRoles.includes(req.user.userType)) {
      return res.status(403).json({ 
        message: "Forbidden: You do not have permission to access this resource",
        requiredRole: allowedRoles,
        yourRole: req.user.userType
      })
    }
    next()
  }
}

// New middleware specifically for voter-only routes
const voterOnly = (req, res, next) => {
  if (!req.user || req.user.userType !== "voter") {
    return res.status(403).json({ 
      message: "Forbidden: This resource is only accessible to voters" 
    })
  }
  next()
}

// New middleware that allows both staff and voters
const authorizeStaffAndVoters = (...staffRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.userType) {
      return res.status(403).json({ message: "Forbidden: You do not have permission to access this resource" })
    }
    
    // Allow if user is a voter OR has one of the specified staff roles
    if (req.user.userType === "voter" || staffRoles.includes(req.user.userType)) {
      return next()
    }
    
    return res.status(403).json({ 
      message: "Forbidden: You do not have permission to access this resource" 
    })
  }
}

module.exports = { 
  authMiddleware, 
  authorizeRoles, 
  voterOnly,
  authorizeStaffAndVoters 
}