const express = require("express")
const router = express.Router()
const SSGElectionController = require("../controllers/ssgElectionController")
const { authMiddleware, authorizeRoles, authorizeStaffAndVoters } = require("../middleware/authMiddleware")

router.use(authMiddleware)

router.get("/", authorizeRoles("election_committee", "sao", "voter"), SSGElectionController.getAllSSGElections)
router.get("/dashboard", authorizeRoles("election_committee", "sao"), SSGElectionController.getSSGDashboardSummary)
router.get("/upcoming", authorizeRoles("election_committee", "sao", "voter"), SSGElectionController.getUpcomingSSGElections)
router.get("/for-voting", authorizeStaffAndVoters("election_committee", "sao", "voter"), SSGElectionController.getSSGElectionsForVoting)
router.get("/for-voting/:voterId", authorizeStaffAndVoters("election_committee", "sao", "voter"), SSGElectionController.getSSGElectionsForVoting)
router.get("/:id", authorizeRoles("election_committee", "sao", "voter"), SSGElectionController.getSSGElection)
router.get("/:id/statistics", authorizeStaffAndVoters("election_committee", "sao", "voter"), SSGElectionController.getSSGElectionStatistics)
router.get("/:id/results", authorizeStaffAndVoters("election_committee", "sao", "voter"), SSGElectionController.getSSGElectionResults)
router.post("/", authorizeRoles("election_committee"), SSGElectionController.createSSGElection)
router.put("/:id", authorizeRoles("election_committee"), SSGElectionController.updateSSGElection)
router.patch("/:id/status", authorizeRoles("election_committee"), SSGElectionController.toggleSSGElectionStatus)
router.delete("/:id", authorizeRoles("admin"), SSGElectionController.deleteSSGElection)

module.exports = router