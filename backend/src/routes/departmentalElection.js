const express = require("express")
const router = express.Router()
const DepartmentalElectionController = require("../controllers/departmentalElectionController")
const { authMiddleware, authorizeRoles, voterOnly, authorizeStaffAndVoters } = require("../middleware/authMiddleware")

// Apply authentication middleware to all routes
router.use(authMiddleware)

router.get("/", authorizeStaffAndVoters("admin", "election_committee", "sao"),DepartmentalElectionController.getAllDepartmentalElections)
router.get("/departments", 
  authorizeStaffAndVoters("admin", "election_committee", "sao"),
  DepartmentalElectionController.getAvailableDepartments
)

router.get("/dashboard", authorizeRoles("election_committee"),DepartmentalElectionController.getDepartmentalDashboardSummary)
router.get("/audit-logs", authorizeRoles("admin"),DepartmentalElectionController.getDepartmentalElectionAuditLogs)
router.get("/department/:departmentId", authorizeStaffAndVoters("admin", "election_committee", "sao"),DepartmentalElectionController.getElectionsByDepartment)
router.get("/:electionId/candidates/voter",voterOnly,DepartmentalElectionController.getCandidatesForVoter)
router.get("/:id", authorizeStaffAndVoters("admin", "election_committee", "sao"),DepartmentalElectionController.getDepartmentalElection)
router.get("/:id/results", authorizeStaffAndVoters("admin", "election_committee", "sao"),DepartmentalElectionController.getDepartmentalElectionResults)
router.get("/:id/statistics", authorizeStaffAndVoters("admin", "election_committee"),DepartmentalElectionController.getDepartmentalElectionStatistics)
router.post("/", authorizeRoles("admin", "election_committee"),DepartmentalElectionController.createDepartmentalElection)
router.put("/:id", authorizeRoles("admin", "election_committee"),DepartmentalElectionController.updateDepartmentalElection)
router.patch("/:id/status", authorizeRoles("admin", "election_committee"),DepartmentalElectionController.toggleDepartmentalElectionStatus)
router.get("/:id/officers-count", authorizeStaffAndVoters("admin", "election_committee", "sao"),DepartmentalElectionController.getDepartmentalElectionOfficersCount)
router.get("/:id/voter-eligibility", voterOnly,DepartmentalElectionController.checkVoterEligibilityForDepartmentalElection)
router.delete("/:id", authorizeRoles("admin"),DepartmentalElectionController.deleteDepartmentalElection)

module.exports = router