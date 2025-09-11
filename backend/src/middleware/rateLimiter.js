const rateLimit = require("express-rate-limit")

// Global limiter - applies to all routes by default
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, // Reduced from 200 for better security
  message: {
    error: "Too many requests from this IP address",
    message: "Please wait 15 minutes before making more requests",
    retryAfter: 15 * 60 
  },
  standardHeaders: true, 
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: "Rate limit exceeded",
      message: "Too many requests from this IP address. Please wait 15 minutes before trying again.",
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    })
  }
})

// Strict login limiter - prevents brute force attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Reduced from 10 for better security
  message: {
    error: "Too many login attempts",
    message: "Please wait 15 minutes before attempting to login again",
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful login attempts
  keyGenerator: (req) => {
    // Use IP + attempted username for more granular limiting
    const username = req.body?.username || req.body?.userId || 'unknown'
    return `${req.ip}-${username}`
  },
  handler: (req, res) => {
    res.status(429).json({
      error: "Too many login attempts",
      message: "Too many failed login attempts. Please wait 15 minutes before trying again.",
      retryAfter: Math.round(req.rateLimit.resetTime / 1000),
      hint: "If you've forgotten your password, please contact your system administrator."
    })
  }
})

// Registration limiter - prevents spam registrations
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, 
  max: 3, 
  message: {
    error: "Registration limit exceeded",
    message: "Too many registration attempts. Please wait 1 hour before trying again.",
    retryAfter: 60 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: "Registration limit exceeded",
      message: "Too many registration attempts from this IP. Please wait 1 hour before trying again.",
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    })
  }
})


const adminLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 150, // Reduced from 200, but still allows productive work
  message: {
    error: "Admin request limit exceeded",
    message: "Please slow down your requests and try again in a few minutes",
    retryAfter: 10 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: "Request limit exceeded",
      message: "Too many administrative requests. Please wait 10 minutes before continuing.",
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    })
  }
})

// Voter operations limiter - restrictive to prevent voting manipulation
const voterLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, 
  max: 20, 
  message: {
    error: "Voter request limit exceeded",
    message: "Please wait a few minutes before making more requests",
    retryAfter: 5 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: "Request limit exceeded", 
      message: "Too many requests. Please wait 5 minutes before trying again.",
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    })
  }
})

// Voting action limiter - extremely strict for ballot submissions
const votingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Very few voting-related requests per hour
  message: {
    error: "Voting limit exceeded",
    message: "Too many voting attempts. Please contact support if you need assistance.",
    retryAfter: 60 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => {
    // Use voter ID from token if available for more accurate limiting
    const voterId = req.user?.voterId || req.user?.userId || 'unknown-user'
    const ipKey = req.ip || req.connection.remoteAddress || 'unknown-ip'
    return `voting-${voterId}-${ipKey}`
  },
  handler: (req, res) => {
    res.status(429).json({
      error: "Voting limit exceeded",
      message: "Too many voting attempts detected. Please contact technical support for assistance.",
      retryAfter: Math.round(req.rateLimit.resetTime / 1000),
      supportContact: "Please reach out to election officials if this appears to be an error."
    })
  }
})

// Chat support limiter - prevent spam
const chatSupportLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 5, // 5 support requests per 30 minutes
  message: {
    error: "Support request limit exceeded",
    message: "Please wait before submitting another support request",
    retryAfter: 30 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: "Support request limit exceeded",
      message: "Too many support requests. Please wait 30 minutes before submitting another request.",
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    })
  }
})

// Dashboard limiter - moderate restrictions for dashboard access
const dashboardLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // 50 requests per 5 minutes
  message: {
    error: "Dashboard request limit exceeded",
    message: "Please wait a few minutes before refreshing the dashboard",
    retryAfter: 5 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: "Request limit exceeded",
      message: "Too many dashboard requests. Please wait 5 minutes before trying again.",
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    })
  }
})

module.exports = {
  globalLimiter,
  loginLimiter,
  registrationLimiter,
  adminLimiter,
  voterLimiter,
  votingLimiter,
  chatSupportLimiter,
  dashboardLimiter
}