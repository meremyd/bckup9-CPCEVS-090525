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

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
})

// Middleware
app.use(helmet())
app.use(morgan("combined"))
app.use(limiter)
app.use(
  cors({
    origin: process.env.NODE_ENV === "production" ? ["https://your-frontend-domain.com"] : ["http://localhost:3000"],
    credentials: true,
  }),
)
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Cordova Public College E-Voting Backend is running",
    timestamp: new Date().toISOString(),
  })
})

// Database connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB")
  })
  .catch((error) => {
    console.error("❌ MongoDB connection error:", error)
    process.exit(1)
  })

console.log("🔄 Loading routes...")

try {
  console.log("Loading auth routes...")
  app.use("/api/auth", require("./src/routes/auth"))
  console.log("✅ Auth routes loaded")
} catch (error) {
  console.error("❌ Error loading auth routes:", error.message)
  process.exit(1)
}

try {
  console.log("Loading users routes...")
  app.use("/api/users", authMiddleware, authorizeRoles("admin"), require("./src/routes/users"))
  console.log("✅ Users routes loaded")
} catch (error) {
  console.error("❌ Error loading users routes:", error.message)
  process.exit(1)
}

try {
  console.log("Loading voters routes...")
  app.use("/api/voters", authMiddleware, authorizeRoles("admin", "election_committee"), require("./src/routes/voters"))
  console.log("✅ Voters routes loaded")
} catch (error) {
  console.error("❌ Error loading voters routes:", error.message)
  process.exit(1)
}

try {
  console.log("Loading degrees routes...")
  app.use("/api/degrees", authMiddleware, authorizeRoles("admin", "election_committee"), require("./src/routes/degrees"))
  console.log("✅ Degrees routes loaded")
} catch (error) {
  console.error("❌ Error loading degrees routes:", error.message)
  process.exit(1)
}

try {
  console.log("Loading audit-logs routes...")
  app.use("/api/audit-logs", authMiddleware, authorizeRoles("admin"), require("./src/routes/audit-logs"))
  console.log("✅ Audit-logs routes loaded")
} catch (error) {
  console.error("❌ Error loading audit-logs routes:", error.message)
  process.exit(1)
}

try {
  console.log("Loading elections routes...")
  app.use("/api/elections", authMiddleware, authorizeRoles("admin", "election_committee"), require("./src/routes/elections"))
  console.log("✅ Elections routes loaded")
} catch (error) {
  console.error("❌ Error loading elections routes:", error.message)
  process.exit(1)
}

try {
  console.log("Loading chat-support routes...")
  app.use("/api/chat-support", require("./src/routes/chat-support")) // Public route for submission
  app.use("/api/chat-support", authMiddleware, authorizeRoles("admin"), require("./src/routes/chat-support")) // Protected for viewing/updating
  console.log("✅ Chat-support routes loaded")
} catch (error) {
  console.error("❌ Error loading chat-support routes:", error.message)
  process.exit(1)
}

try {
  console.log("Loading dashboard routes...")
  app.use("/api/dashboard", authMiddleware, require("./src/routes/dashboard"))
  console.log("✅ Dashboard routes loaded")
} catch (error) {
  console.error("❌ Error loading dashboard routes:", error.message)
  process.exit(1)
}

console.log("✅ All routes loaded successfully")

// Error handling middleware (should be last)
app.use(errorHandler)

// 404 handler - Express 5 compatible (no path pattern needed for catch-all)
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`)
  console.log(`📍 Available routes:`)
  console.log(`   - POST http://localhost:${PORT}/api/auth/login`)
  console.log(`   - GET  http://localhost:${PORT}/api/users (Protected)`)
  console.log(`   - GET  http://localhost:${PORT}/api/voters (Protected)`)
  console.log(`   - GET  http://localhost:${PORT}/api/degrees (Protected)`)
  console.log(`   - GET  http://localhost:${PORT}/api/elections (Protected)`)
  console.log(`   - GET  http://localhost:${PORT}/api/audit-logs (Protected)`)
  console.log(`   - POST http://localhost:${PORT}/api/chat-support (Public)`)
  console.log(`   - GET  http://localhost:${PORT}/api/dashboard/admin (Protected)`)
  console.log(`   - GET  http://localhost:${PORT}/api/dashboard/committee (Protected)`)
  console.log(`   - GET  http://localhost:${PORT}/api/dashboard/sao (Protected)`)
})

module.exports = app