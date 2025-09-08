const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const helmet = require("helmet")
const morgan = require("morgan")
const rateLimit = require("express-rate-limit")
require("dotenv").config()

const { authMiddleware, authorizeRoles } = require("./src/middleware/authMiddleware")
const errorHandler = require("./src/middleware/errorHandler")

const app = express()

/* ---------------- RATE LIMITERS ---------------- */
// Global limiter (default for all routes)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  handler: (req, res) => {
    res.status(429).json({
      message: "Too many requests from this IP, please try again later."
    })
  }
})

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  handler: (req, res) => {
    res.status(429).json({
      message: "Too many login attempts, please wait 15 minutes before retrying."
    })
  }
})

const committeeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 200,
  handler: (req, res) => {
    res.status(429).json({
      message: "Too many requests for admin staff, please slow down."
    })
  }
})

const voterLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 50,
  handler: (req, res) => {
    res.status(429).json({
      message: "Too many requests from voter, please try again later."
    })
  }
})
/* ---------------- SECURITY MIDDLEWARE ---------------- */
app.use(helmet())
app.use(morgan("combined"))
app.use(globalLimiter) // Apply global limiter by default
app.use(
  cors({
    origin: process.env.NODE_ENV === "production"
      ? ["https://your-frontend-domain.com"]
      : ["http://localhost:3000"],
    credentials: true,
  })
)
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

/* ---------------- HEALTH CHECK ---------------- */
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Cordova Public College E-Voting Backend is running",
    timestamp: new Date().toISOString(),
  })
})

/* ---------------- DATABASE CONNECTION ---------------- */
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB")
  })
  .catch((error) => {
    console.error("❌ MongoDB connection error:", error)
    process.exit(1)
  })

console.log("📄 Loading routes...")

/* ---------------- ROUTES ---------------- */
try {
  console.log("Loading auth routes...")
  // Login endpoints with strict limiter
  app.use("/api/auth/login", loginLimiter, require("./src/routes/auth"))
  app.use("/api/auth/voter-login", loginLimiter, require("./src/routes/auth"))
  // Other auth routes (registration, etc.)
  app.use("/api/auth", require("./src/routes/auth"))
  console.log("✅ Auth routes loaded")
} catch (error) {
  console.error("❌ Error loading auth routes:", error.message)
  process.exit(1)
}

try {
  console.log("Loading users routes...")
  app.use("/api/users", authMiddleware, authorizeRoles("admin"), committeeLimiter, require("./src/routes/users"))
  console.log("✅ Users routes loaded")
} catch (error) {
  console.error("❌ Error loading users routes:", error.message)
  process.exit(1)
}

try {
  console.log("Loading voters routes...")
  app.use("/api/voters", authMiddleware, authorizeRoles("admin", "election_committee"), voterLimiter, require("./src/routes/voters"))
  console.log("✅ Voters routes loaded")
} catch (error) {
  console.error("❌ Error loading voters routes:", error.message)
  process.exit(1)
}

try {
  console.log("Loading degrees routes...")
  app.use("/api/degrees", authMiddleware, authorizeRoles("admin", "election_committee"), committeeLimiter, require("./src/routes/degrees"))
  console.log("✅ Degrees routes loaded")
} catch (error) {
  console.error("❌ Error loading degrees routes:", error.message)
  process.exit(1)
}

try {
  console.log("Loading audit-logs routes...")
  app.use("/api/audit-logs", authMiddleware, authorizeRoles("admin"), committeeLimiter, require("./src/routes/audit-logs"))
  console.log("✅ Audit-logs routes loaded")
} catch (error) {
  console.error("❌ Error loading audit-logs routes:", error.message)
  process.exit(1)
}

try {
  console.log("Loading elections routes...")
  app.use("/api/elections", authMiddleware, authorizeRoles("admin", "election_committee"), committeeLimiter, require("./src/routes/elections"))
  console.log("✅ Elections routes loaded")
} catch (error) {
  console.error("❌ Error loading elections routes:", error.message)
  process.exit(1)
}


try {
  console.log("Loading chat-support routes...")
  app.use("/api/chat-support", require("./src/routes/chat-support"))
  console.log("✅ Chat-support routes loaded")
} catch (error) {
  console.error("❌ Error loading chat-support routes:", error.message)
  process.exit(1)
}

try {
  console.log("Loading dashboard routes...")
  app.use("/api/dashboard", authMiddleware, committeeLimiter, require("./src/routes/dashboard"))
  console.log("✅ Dashboard routes loaded")
} catch (error) {
  console.error("❌ Error loading dashboard routes:", error.message)
  process.exit(1)
}

console.log("✅ All routes loaded successfully")

/* ---------------- ERROR HANDLERS ---------------- */
app.use(errorHandler)

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" })
})

/* ---------------- SERVER START ---------------- */
const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`🔍 Health check: http://localhost:${PORT}/api/health`)
  console.log(`🔍 Available routes:`)
  console.log(`   - POST http://localhost:${PORT}/api/auth/login`)
  console.log(`   - POST http://localhost:${PORT}/api/auth/voter-login`)
  console.log(`   - POST http://localhost:${PORT}/api/auth/pre-register-step1`)
  console.log(`   - POST http://localhost:${PORT}/api/auth/pre-register-step2`)
  console.log(`   - GET  http://localhost:${PORT}/api/users (Protected - Admin)`)
  console.log(`   - GET  http://localhost:${PORT}/api/voters (Protected - Admin/Committee)`)
  console.log(`   - GET  http://localhost:${PORT}/api/degrees (Protected - Admin/Committee)`)
  console.log(`   - GET  http://localhost:${PORT}/api/elections (Protected - Admin/Committee)`)
  console.log(`   - GET  http://localhost:${PORT}/api/voting/active-elections (Protected - Voters)`)
  console.log(`   - POST http://localhost:${PORT}/api/voting/cast-vote (Protected - Voters)`)
  console.log(`   - GET  http://localhost:${PORT}/api/audit-logs (Protected - Admin)`)
  console.log(`   - POST http://localhost:${PORT}/api/chat-support (Public)`)
  console.log(`   - GET  http://localhost:${PORT}/api/chat-support (Protected - Admin)`)
  console.log(`   - GET  http://localhost:${PORT}/api/dashboard/admin (Protected - Admin)`)
  console.log(`   - GET  http://localhost:${PORT}/api/dashboard/committee (Protected - Committee)`)
  console.log(`   - GET  http://localhost:${PORT}/api/dashboard/sao (Protected - SAO)`)
})

module.exports = app
