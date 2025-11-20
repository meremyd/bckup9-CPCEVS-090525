
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
    // Try to get token from both possible header formats
    let token = req.header('Authorization')?.replace('Bearer ', '')
    
    // Fallback to x-auth-token if Authorization header is not present
    if (!token) {
      token = req.header('x-auth-token')
    }

    if (!token) {
      console.log('voterAuthMiddleware: No token provided')
      return res.status(401).json({ message: 'Access denied. No token provided.' })
    }

    // Ensure we have a secret available
    const secret = process.env.JWT_SECRET || 'your-secret-key'
    if (!secret) {
      console.error('voterAuthMiddleware: JWT secret is not defined')
      return res.status(500).json({ message: 'Server misconfiguration: missing JWT secret' })
    }

    // Verify and decode token
    const decoded = jwt.verify(token, secret)
    
    // DETAILED LOGGING for debugging
    console.log('voterAuthMiddleware: Token decoded:', {
      hasVoterId: !!decoded.voterId,
      hasUserId: !!decoded.userId,
      userType: decoded.userType,
      schoolId: decoded.schoolId
    })
    
    // Check if this is a voter token (has voterId instead of userId)
    if (!decoded.voterId) {
      console.log('voterAuthMiddleware: Token does not have voterId')
      return res.status(401).json({ message: 'Invalid token. Voter access required.' })
    }

    // Get voter information
    const voter = await Voter.findById(decoded.voterId)
    if (!voter) {
      console.log('voterAuthMiddleware: Voter not found for ID:', decoded.voterId)
      return res.status(401).json({ message: 'Voter account not found.' })
    }
    
    if (!voter.isActive) {
      console.log('voterAuthMiddleware: Voter account is inactive:', decoded.voterId)
      return res.status(401).json({ message: 'Voter account is inactive.' })
    }

    // Attach voter info to request
    req.user = {
      voterId: decoded.voterId,
      schoolId: voter.schoolId,
      userType: 'voter'
    }
    
    console.log('voterAuthMiddleware: Authentication successful for voter:', voter.schoolId)
    next()
  } catch (error) {
    console.error('voterAuthMiddleware error:', error.message)
    
    // Provide more specific error messages
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired. Please login again.' })
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token format.' })
    }
    
    res.status(401).json({ message: 'Authentication failed.' })
  }
}

module.exports = { 
  authMiddleware, 
  authorizeRoles, 
  authorizeStaffAndVoters, 
  voterAuthMiddleware 
}