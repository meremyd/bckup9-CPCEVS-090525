const jwt = require("jsonwebtoken")
const Voter = require("../models/Voter") 

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

// middleware that allows both staff and voters
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

const voterAuthMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    
    // Check if this is a voter token (has voterId instead of userId)
    if (!decoded.voterId) {
      return res.status(401).json({ message: 'Invalid token. Voter access required.' })
    }

    // Get voter information
    const voter = await Voter.findById(decoded.voterId)
    if (!voter || !voter.isActive) {
      return res.status(401).json({ message: 'Voter account not found or inactive.' })
    }

    req.user = {
      voterId: decoded.voterId,
      schoolId: voter.schoolId,
      userType: 'voter'
    }
    
    next()
  } catch (error) {
    console.error('Voter auth error:', error)
    res.status(401).json({ message: 'Invalid token.' })
  }
}

module.exports = { 
  authMiddleware, 
  authorizeRoles, 
  authorizeStaffAndVoters, 
  voterAuthMiddleware 
}