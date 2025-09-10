const express = require("express")
const router = express.Router()
const SSGElectionController = require("../controllers/ssgElectionController")
const { authMiddleware, authorizeRoles, authorizeStaffAndVoters } = require("../middleware/authMiddleware")

// Apply authentication middleware to all routes
router.use(authMiddleware)

// Get all SSG elections with filtering and pagination
// GET /api/ssg-elections
router.get("/", 
  authorizeRoles("admin", "election_committee", "sao"), 
  SSGElectionController.getAllSSGElections
)

// Get SSG dashboard summary
// GET /api/ssg-elections/dashboard
router.get("/dashboard", 
  authorizeRoles("admin", "election_committee", "sao"), 
  SSGElectionController.getSSGDashboardSummary
)

// Get upcoming SSG elections
// GET /api/ssg-elections/upcoming
router.get("/upcoming", 
  authorizeRoles("admin", "election_committee", "sao"), 
  SSGElectionController.getUpcomingSSGElections
)

// Get SSG elections for voting (accessible by registered voters)
// GET /api/ssg-elections/for-voting
router.get("/for-voting", 
  authorizeStaffAndVoters("admin", "election_committee", "sao"), 
  SSGElectionController.getSSGElectionsForVoting
)

// Get SSG elections for specific voter
// GET /api/ssg-elections/for-voting/:voterId
router.get("/for-voting/:voterId", 
  authorizeStaffAndVoters("admin", "election_committee", "sao"), 
  SSGElectionController.getSSGElectionsForVoting
)

// Get single SSG election details
// GET /api/ssg-elections/:id
router.get("/:id", 
  authorizeRoles("admin", "election_committee", "sao"), 
  SSGElectionController.getSSGElection
)

// Get SSG election statistics (accessible by registered voters for viewing)
// GET /api/ssg-elections/:id/statistics
router.get("/:id/statistics", 
  authorizeStaffAndVoters("admin", "election_committee", "sao"), 
  SSGElectionController.getSSGElectionStatistics
)

// Get SSG election results (accessible by registered voters for viewing)
// GET /api/ssg-elections/:id/results
router.get("/:id/results", 
  authorizeStaffAndVoters("admin", "election_committee", "sao"), 
  SSGElectionController.getSSGElectionResults
)

// Create new SSG election
// POST /api/ssg-elections
router.post("/", 
  authorizeRoles("admin", "election_committee"), 
  SSGElectionController.createSSGElection
)

// Update SSG election
// PUT /api/ssg-elections/:id
router.put("/:id", 
  authorizeRoles("admin", "election_committee"), 
  SSGElectionController.updateSSGElection
)

// Toggle SSG election status
// PATCH /api/ssg-elections/:id/status
router.patch("/:id/status", 
  authorizeRoles("admin", "election_committee"), 
  SSGElectionController.toggleSSGElectionStatus
)

// Delete SSG election
// DELETE /api/ssg-elections/:id
router.delete("/:id", 
  authorizeRoles("admin"), 
  SSGElectionController.deleteSSGElection
)

module.exports = router