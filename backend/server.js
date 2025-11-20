const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const helmet = require("helmet")
const morgan = require("morgan")
require("dotenv").config()

const { authMiddleware, authorizeRoles, voterAuthMiddleware } = require("./src/middleware/authMiddleware")
const errorHandler = require("./src/middleware/errorHandler")

const {
  globalLimiter,
  loginLimiter,
  registrationLimiter,
  adminLimiter,
  voterLimiter,
  votingLimiter,
  chatSupportLimiter,
  dashboardLimiter
} = require("./src/middleware/rateLimiter")

const app = express()

/* ---------------- SECURITY MIDDLEWARE ---------------- */
app.use(helmet())
app.use(morgan("combined"))
app.use(globalLimiter) 
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

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Cordova Public College E-Voting Backend is running",
    timestamp: new Date().toISOString(),
  })
})

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB")
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error)
    process.exit(1)
  })

console.log("Loading routes...")

try {
  console.log("Loading auth routes...")
  // Auth routes with appropriate limiters
  app.use("/api/auth/login", loginLimiter)
  app.use("/api/auth/voter-login", loginLimiter)
  app.use("/api/auth/pre-register-step1", registrationLimiter)
  app.use("/api/auth/pre-register-step2", registrationLimiter)
  app.use("/api/auth", require("./src/routes/auth"))
  console.log("Auth routes loaded")
} catch (error) {
  console.error("Error loading auth routes:", error.message)
  process.exit(1)
}

try {
  console.log("Loading users routes...")
  app.use("/api/users", authMiddleware, authorizeRoles("admin"), adminLimiter, require("./src/routes/users"))
  console.log("Users routes loaded")
} catch (error) {
  console.error("Error loading users routes:", error.message)
  process.exit(1)
}

try {
  console.log("Loading voters routes...")
  app.use("/api/voters", require("./src/routes/voters"))
  console.log("Voters routes loaded")
} catch (error) {
  console.error("Error loading voters routes:", error.message)
  process.exit(1)
}

try {
  console.log("Loading candidates routes...")
  app.use("/api/candidates", require("./src/routes/candidate"))
  console.log("Candidates routes loaded")
} catch (error) {
  console.error("Error loading candidates routes:", error.message)
  process.exit(1)
}

try {
  console.log("Loading departments routes...")
  app.use("/api/departments", require("./src/routes/department"))
  console.log("Departments routes loaded")
} catch (error) {
  console.error("Error loading departments routes:", error.message)
  process.exit(1)
}

try {
  console.log("Loading audit-logs routes...")
  app.use("/api/audit-logs", require("./src/routes/audit-logs"))
  console.log("Audit-logs routes loaded")
} catch (error) {
  console.error("Error loading audit-logs routes:", error.message)
  process.exit(1)
}

try {
  console.log("Loading positions routes...")
  app.use("/api/positions", require("./src/routes/positions"))
  console.log("Positions routes loaded")
} catch (error) {
  console.error("Error loading positions routes:", error.message)
  process.exit(1)
}

try {
  console.log("Loading ballots routes...")
  app.use("/api/ballots", require("./src/routes/ballot"))
  console.log("Ballots routes loaded")
} catch (error) {
  console.error("Error loading ballots routes:", error.message)
  process.exit(1)
}

try {
  console.log("Loading partylist routes...")
  app.use("/api/partylists", require("./src/routes/partylist"))
  console.log("Partylist routes loaded")
} catch (error) {
  console.error("Error loading partylist routes:", error.message)
  process.exit(1)
}

try {
  console.log("Loading voting routes...")
  app.use("/api/voting", votingLimiter, require("./src/routes/voting"))
  console.log("Voting routes loaded")
} catch (error) {
  console.error("Error loading voting routes:", error.message)
  process.exit(1)
}

try {
  console.log("Loading election-participation routes...")
  app.use("/api/election-participation", authMiddleware, voterLimiter, require("./src/routes/electionParticipation"))
  console.log("Election-participation routes loaded")
} catch (error) {
  console.error("Error loading election-participation routes:", error.message)
  process.exit(1)
}

try {
  console.log("Loading chat-support routes...")
  app.use("/api/chat-support", chatSupportLimiter, require("./src/routes/chat-support"))
  console.log("Chat-support routes loaded")
} catch (error) {
  console.error("Error loading chat-support routes:", error.message)
  process.exit(1)
}

try {
  console.log("Loading admin routes...")
  app.use("/api/admin", require("./src/routes/admin-accounts"))
  console.log("Admin routes loaded")
} catch (error) {
  console.error("Error loading admin routes:", error.message)
  process.exit(1)
}

try {
  console.log("Loading dashboard routes...")
  app.use("/api/dashboard", dashboardLimiter, require("./src/routes/dashboard"))
  console.log("Dashboard routes loaded")
} catch (error) {
  console.error("Error loading dashboard routes:", error.message)
  process.exit(1)
}

try {
  console.log("Loading SSG election routes...")
  app.use("/api/ssgElections", require("./src/routes/ssgElection"))
  console.log("SSG election routes loaded")
} catch (error) {
  console.error("Error loading SSG election routes:", error.message)
  process.exit(1)
}

try {
  console.log("Loading departmental election routes...")
  app.use("/api/departmentalElections", require("./src/routes/departmentalElection"))
  console.log(" Departmental election routes loaded")
} catch (error) {
  console.error("Error loading departmental election routes:", error.message)
  process.exit(1)
}

console.log("All routes loaded successfully")

// Debug endpoint to send a test email directly from the running server
app.post('/api/debug/send-test-email', async (req, res) => {
  const { to, subject, text, html } = req.body || {}
  if (!to) return res.status(400).json({ message: 'Missing `to` in body' })
  try {
    const { sendMail } = require('./src/utils/mailer')
    const info = await sendMail({ to, subject: subject || 'Test email', text: text || 'Test', html })
    return res.json({ ok: true, info })
  } catch (err) {
    console.error('Debug send-test-email failed:', err && err.message)
    console.error(err && err.stack)
    return res.status(500).json({ ok: false, message: err && err.message })
  }
})

app.use(errorHandler)

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`)
  console.log(` Health check: http://localhost:${PORT}/api/health`)
  console.log(` Available routes:`)
  console.log(`   - POST http://localhost:${PORT}/api/auth/login`)
  console.log(`   - POST http://localhost:${PORT}/api/auth/voter-login`)
  console.log(`   - POST http://localhost:${PORT}/api/auth/pre-register-step1`)
  console.log(`   - POST http://localhost:${PORT}/api/auth/pre-register-step2`)
  console.log(`   - POST http://localhost:${PORT}/api/auth/pre-register-verify-otp`)
  console.log(`   - POST http://localhost:${PORT}/api/auth/pre-register-step3`)
  console.log(`   - GET  http://localhost:${PORT}/api/users (Protected - Admin)`)
  console.log(`   - GET  http://localhost:${PORT}/api/voters (Protected - Admin/Committee)`)
  console.log(`   - GET  http://localhost:${PORT}/api/departments`)
  console.log(`   - GET  http://localhost:${PORT}/api/candidates`)
  console.log(`   - GET  http://localhost:${PORT}/api/positions`)
  console.log(`   - GET  http://localhost:${PORT}/api/partylists`)
  console.log(`   - GET  http://localhost:${PORT}/api/voting/ssg-elections/active (Protected - Voters)`)
  console.log(`   - GET  http://localhost:${PORT}/api/voting/ssg-election/:id/details (Protected - Staff/Voters)`)
  console.log(`   - GET  http://localhost:${PORT}/api/voting/ssg-election/:id/candidates (Protected - Staff/Voters)`)
  console.log(`   - POST http://localhost:${PORT}/api/voting/ssg-election/cast-vote (Protected - Registered Voters)`)
  console.log(`   - GET  http://localhost:${PORT}/api/voting/ssg-votes/my-votes (Protected - Voters)`)
  console.log(`   - GET  http://localhost:${PORT}/api/voting/ssg-voting-status (Protected - Voters)`)
  console.log(`   - GET  http://localhost:${PORT}/api/voting/departmental-elections/active (Protected - Voters)`)
  console.log(`   - GET  http://localhost:${PORT}/api/voting/departmental-election/:id/details (Protected - Staff/Voters)`)
  console.log(`   - GET  http://localhost:${PORT}/api/voting/departmental-election/:id/candidates (Protected - Staff/Voters)`)
  console.log(`   - POST http://localhost:${PORT}/api/voting/departmental-election/cast-vote (Protected - Class Officers)`)
  console.log(`   - GET  http://localhost:${PORT}/api/voting/departmental-votes/my-votes (Protected - Voters)`)
  console.log(`   - GET  http://localhost:${PORT}/api/voting/departmental-voting-status (Protected - Voters)`)
  console.log(`   - GET  http://localhost:${PORT}/api/ballots`)
  console.log(`   - GET  http://localhost:${PORT}/api/audit-logs`)
  console.log(`   - POST http://localhost:${PORT}/api/chat-support`)
  console.log(`   - GET  http://localhost:${PORT}/api/dashboard/admin (Protected - Admin)`)
  console.log(`   - GET  http://localhost:${PORT}/api/dashboard/committee (Protected - Committee)`)
  console.log(`   - GET  http://localhost:${PORT}/api/dashboard/sao (Protected - SAO)`)
  console.log(`   - GET  http://localhost:${PORT}/api/dashboard/voter (Protected - Voter)`)
  console.log(`   - GET  http://localhost:${PORT}/api/ssgElections (Protected - Admin/Committee/SAO)`)
  console.log(`   - POST http://localhost:${PORT}/api/ssgElections (Protected - Admin/Committee)`)
  console.log(`   - GET  http://localhost:${PORT}/api/departmentalElections (Protected - Admin/Committee/SAO/Voters)`)
  console.log(`   - POST http://localhost:${PORT}/api/departmentalElections (Protected - Admin/Committee)`)
})

module.exports = app