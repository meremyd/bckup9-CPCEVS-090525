const express = require("express")
const router = express.Router()
const SSGElectionController = require("../controllers/ssgElectionController")
const { authMiddleware, authorizeRoles, authorizeStaffAndVoters } = require("../middleware/authMiddleware")

router.use(authMiddleware)

// Main routes
router.get("/", authorizeStaffAndVoters("election_committee", "sao", "voter"), SSGElectionController.getAllSSGElections)
router.get("/dashboard", authorizeRoles("election_committee", "sao"), SSGElectionController.getSSGDashboardSummary)
router.get("/upcoming", authorizeStaffAndVoters("election_committee", "sao", "voter"), SSGElectionController.getUpcomingSSGElections)
router.get("/for-voting", authorizeStaffAndVoters("election_committee", "sao", "voter"), SSGElectionController.getSSGElectionsForVoting)
router.get("/for-voting/:voterId", authorizeStaffAndVoters("election_committee", "sao", "voter"), SSGElectionController.getSSGElectionsForVoting)

// Single election routes
router.get("/:id", authorizeRoles("election_committee", "sao", "voter"), SSGElectionController.getSSGElection)
router.get("/:id/overview", authorizeRoles("election_committee", "sao"), SSGElectionController.getSSGElectionOverview)
router.get("/:id/statistics", authorizeStaffAndVoters("election_committee", "sao", "voter"), SSGElectionController.getSSGElectionStatistics)
router.get("/:id/results", authorizeStaffAndVoters("election_committee", "sao", "voter"), SSGElectionController.getSSGElectionResults)

// Election management routes
router.post("/", authorizeRoles("election_committee"), SSGElectionController.createSSGElection)
router.put("/:id", authorizeRoles("election_committee"), SSGElectionController.updateSSGElection)
router.patch("/:id/status", authorizeRoles("election_committee"), SSGElectionController.toggleSSGElectionStatus)
router.delete("/:id", authorizeRoles("election_committee"), SSGElectionController.deleteSSGElection)

// Election data routes
router.get("/:id/candidates", authorizeStaffAndVoters("election_committee", "sao", "voter"), SSGElectionController.getSSGElectionCandidates)
router.get("/:id/positions", authorizeStaffAndVoters("election_committee", "sao", "voter"), SSGElectionController.getSSGElectionPositions)
router.get("/:id/partylists", authorizeStaffAndVoters("election_committee", "sao", "voter"), SSGElectionController.getSSGElectionPartylists)
router.get("/:id/participants", authorizeRoles("election_committee", "sao"), SSGElectionController.getSSGElectionVoterParticipants)
router.get("/:id/turnout", authorizeStaffAndVoters("election_committee", "sao", "voter"), SSGElectionController.getSSGElectionVoterTurnout)
router.get("/:id/ballots", authorizeRoles("election_committee", "sao"), SSGElectionController.getSSGElectionBallots)

module.exports = router