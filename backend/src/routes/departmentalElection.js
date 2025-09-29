const express = require("express")
const router = express.Router()
const DepartmentalElectionController = require("../controllers/departmentalElectionController")
const { authMiddleware, authorizeRoles, voterAuthMiddleware } = require("../middleware/authMiddleware")

router.use('/user', authMiddleware) 
router.get("/user/", authorizeRoles("admin", "election_committee", "sao"), DepartmentalElectionController.getAllDepartmentalElections)
router.get("/user/departments", authorizeRoles("admin", "election_committee", "sao"), DepartmentalElectionController.getAvailableDepartments)
router.get("/user/dashboard", authorizeRoles("election_committee", "sao"), DepartmentalElectionController.getDepartmentalDashboardSummary)
router.get("/user/audit-logs", authorizeRoles("admin"), DepartmentalElectionController.getDepartmentalElectionAuditLogs)
router.get("/user/department/:departmentId", authorizeRoles("admin", "election_committee", "sao"), DepartmentalElectionController.getElectionsByDepartment)
router.get("/user/:id", authorizeRoles("admin", "election_committee", "sao"), DepartmentalElectionController.getDepartmentalElection)
router.get("/user/:id/results", authorizeRoles("admin", "election_committee", "sao"), DepartmentalElectionController.getDepartmentalElectionResults)
router.get("/user/:id/statistics", authorizeRoles("admin", "election_committee", "sao"), DepartmentalElectionController.getDepartmentalElectionStatistics)
router.get("/user/:id/officers-count", authorizeRoles("admin", "election_committee", "sao"), DepartmentalElectionController.getDepartmentalElectionOfficersCount)

router.post("/user/", authorizeRoles("admin", "election_committee"), DepartmentalElectionController.createDepartmentalElection)
router.put("/user/:id", authorizeRoles("admin", "election_committee"), DepartmentalElectionController.updateDepartmentalElection)
router.patch("/user/:id/status", authorizeRoles("admin", "election_committee"), DepartmentalElectionController.toggleDepartmentalElectionStatus)
router.delete("/user/:id", authorizeRoles("admin"), DepartmentalElectionController.deleteDepartmentalElection)

router.use('/voter', voterAuthMiddleware) 
router.get("/voter/", DepartmentalElectionController.getAllDepartmentalElectionsForVoters)
router.get("/voter/:electionId/candidates", DepartmentalElectionController.getCandidatesForVoter)
router.get("/voter/:id", DepartmentalElectionController.getDepartmentalElectionForVoters) 
router.get("/voter/:id/results", DepartmentalElectionController.getDepartmentalElectionResultsForVoters)
router.get("/voter/:id/statistics", DepartmentalElectionController.getDepartmentalElectionStatisticsForVoters) 
router.get("/voter/:id/voter-eligibility", DepartmentalElectionController.checkVoterEligibilityForDepartmentalElection)

router.get("/", authMiddleware, authorizeRoles("admin", "election_committee", "sao"), (req, res) => {res.redirect('/departmentalElections/user/')})

module.exports = router