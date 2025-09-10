const express = require("express")
const router = express.Router()
const DepartmentalElectionController = require("../controllers/departmentalElectionController")
const { authMiddleware, authorizeRoles, voterOnly, authorizeStaffAndVoters } = require("../middleware/authMiddleware")

// Apply authentication middleware to all routes
router.use(authMiddleware)

// PUBLIC ROUTES (authenticated users only)
// Get all departmental elections with filtering and pagination
// GET /api/departmentalElections
router.get("/", 
  authorizeStaffAndVoters("admin", "election_committee", "sao"),
  DepartmentalElectionController.getAllDepartmentalElections
)

// Get available departments
// GET /api/departmentalElections/departments
router.get("/departments", 
  authorizeStaffAndVoters("admin", "election_committee", "sao"),
  DepartmentalElectionController.getAvailableDepartments
)

// Get departmental dashboard summary (Admin/Election Committee only)
// GET /api/departmentalElections/dashboard
router.get("/dashboard", 
  authorizeRoles("admin", "election_committee"),
  DepartmentalElectionController.getDepartmentalDashboardSummary
)

// Get audit logs for departmental elections (Admin only)
// GET /api/departmentalElections/audit-logs
router.get("/audit-logs", 
  authorizeRoles("admin"),
  DepartmentalElectionController.getDepartmentalElectionAuditLogs
)

// Get elections by specific department
// GET /api/departmentalElections/department/:department
router.get("/department/:department", 
  authorizeStaffAndVoters("admin", "election_committee", "sao"),
  DepartmentalElectionController.getElectionsByDepartment
)

// ELECTION DETAIL ROUTES
// Get single departmental election with full details
// GET /api/departmentalElections/:id
router.get("/:id", 
  authorizeStaffAndVoters("admin", "election_committee", "sao"),
  DepartmentalElectionController.getDepartmentalElection
)

// Get departmental election results (viewable after election ends or by admin/election committee)
// GET /api/departmentalElections/:id/results
router.get("/:id/results", 
  authorizeStaffAndVoters("admin", "election_committee", "sao"),
  DepartmentalElectionController.getDepartmentalElectionResults
)

// Get departmental election statistics (Admin/Election Committee only)
// GET /api/departmentalElections/:id/statistics
router.get("/:id/statistics", 
  authorizeRoles("admin", "election_committee"),
  DepartmentalElectionController.getDepartmentalElectionStatistics
)

// MANAGEMENT ROUTES (Admin/Election Committee only)
// Create new departmental election
// POST /api/departmentalElections
router.post("/", 
  authorizeRoles("admin", "election_committee"),
  DepartmentalElectionController.createDepartmentalElection
)

// Update departmental election
// PUT /api/departmentalElections/:id
router.put("/:id", 
  authorizeRoles("admin", "election_committee"),
  DepartmentalElectionController.updateDepartmentalElection
)

// Toggle departmental election status
// PATCH /api/departmentalElections/:id/status
router.patch("/:id/status", 
  authorizeRoles("admin", "election_committee"),
  DepartmentalElectionController.toggleDepartmentalElectionStatus
)

// Delete departmental election (Admin only)
// DELETE /api/departmentalElections/:id
router.delete("/:id", 
  authorizeRoles("admin"),
  DepartmentalElectionController.deleteDepartmentalElection
)

module.exports = router