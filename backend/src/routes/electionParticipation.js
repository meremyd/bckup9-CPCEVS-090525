const express = require("express")
const router = express.Router()
const ElectionParticipationController = require("../controllers/electionParticipationController")
const { voterAuthMiddleware, authMiddleware, authorizeRoles } = require("../middleware/authMiddleware")

// Voter routes (require voter authentication)
// Confirm participation in elections
router.post("/confirm/ssg", voterAuthMiddleware, ElectionParticipationController.confirmSSGParticipation)
router.post("/confirm/departmental", voterAuthMiddleware, ElectionParticipationController.confirmDepartmentalParticipation)

// Check voter status in elections
router.get("/status/ssg/:ssgElectionId", voterAuthMiddleware, ElectionParticipationController.checkSSGStatus)
router.get("/status/departmental/:deptElectionId", voterAuthMiddleware, ElectionParticipationController.checkDepartmentalStatus)

// Generate voting receipts
router.get("/receipt/ssg/:ssgElectionId", voterAuthMiddleware, ElectionParticipationController.getSSGVotingReceipt)
router.get("/receipt/departmental/:deptElectionId", voterAuthMiddleware, ElectionParticipationController.getDepartmentalVotingReceipt)

// Admin/Committee/SAO routes (require staff authentication)
router.get("/participants/ssg/:ssgElectionId", authMiddleware, authorizeRoles("election_committee", "sao"), ElectionParticipationController.getSSGParticipants)
router.get("/participants/departmental/:deptElectionId", authMiddleware, authorizeRoles("election_committee", "sao"), ElectionParticipationController.getDepartmentalParticipants)
router.get("/statistics/ssg/:ssgElectionId", authMiddleware, authorizeRoles("election_committee", "sao"), ElectionParticipationController.getSSGStatistics)
router.get("/statistics/departmental/:deptElectionId", authMiddleware, authorizeRoles("election_committee", "sao"), ElectionParticipationController.getDepartmentalStatistics)
router.get("/export/ssg/:ssgElectionId/pdf", authMiddleware, authorizeRoles("election_committee", "sao"), ElectionParticipationController.exportSSGParticipantsPDF)
router.get("/export/departmental/:deptElectionId/pdf", authMiddleware, authorizeRoles("election_committee", "sao"), ElectionParticipationController.exportDepartmentalParticipantsPDF)

module.exports = router