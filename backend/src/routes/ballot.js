const express = require("express")
const BallotController = require("../controllers/ballotController")
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware")
const router = express.Router()

// ==================== SSG BALLOT ROUTES ====================

router.get("/ssg/:electionId/ballots", authMiddleware, authorizeRoles("election_committee", "admin"), BallotController.getSelectedSSGElectionBallots)
router.get("/ssg/:electionId/statistics", authMiddleware, authorizeRoles("election_committee", "admin"), BallotController.getSelectedSSGElectionBallotStatistics)
router.get("/ssg/:electionId/preview", authMiddleware, authorizeRoles("election_committee", "admin"), BallotController.previewSSGBallot)
router.post("/ssg/:ballotId/submit", authMiddleware, authorizeRoles("voter", "election_committee"), BallotController.submitSelectedSSGBallot)
router.get("/ssg/:electionId/voter-status", authMiddleware, authorizeRoles("voter", "election_committee"), BallotController.getVoterSelectedSSGBallotStatus)
router.get("/ssg/ballot/:ballotId/votes", authMiddleware, authorizeRoles("voter", "election_committee", "admin"), BallotController.getSelectedSSGBallotWithVotes)
router.put("/ssg/:ballotId/timer", authMiddleware, authorizeRoles("election_committee", "admin"), BallotController.updateSSGBallotTimer)
router.post("/ssg/start", authMiddleware, authorizeRoles("voter", "election_committee"), BallotController.startSSGBallot)

// ==================== DEPARTMENTAL BALLOT ROUTES ====================

router.get("/departmental/:electionId/:positionId/ballots", authMiddleware, authorizeRoles("election_committee", "admin"), BallotController.getDepartmentalBallots)
router.get("/departmental/:electionId/:positionId/statistics", authMiddleware, authorizeRoles("election_committee", "admin"), BallotController.getDepartmentalBallotStatistics)
router.get("/departmental/:electionId/:positionId/preview", authMiddleware, authorizeRoles("election_committee", "admin"), BallotController.previewDepartmentalBallot)
router.get("/departmental/:electionId/available-positions", authMiddleware, authorizeRoles("voter", "election_committee"), BallotController.getAvailablePositionsForVoting)
router.get("/departmental/:electionId/preview-positions", authMiddleware, authorizeRoles("election_committee", "admin"), BallotController.getPositionsForPreview)
router.delete("/departmental/:ballotId", authMiddleware, authorizeRoles("election_committee", "admin"), BallotController.deleteDepartmentalBallot)
router.get("/departmental/:electionId/:positionId/voter-status", authMiddleware, authorizeRoles("voter", "election_committee"), BallotController.getVoterDepartmentalBallotStatus)
router.put("/departmental/position/:positionId/year-restriction", authMiddleware, authorizeRoles("election_committee", "admin"), BallotController.updateYearLevelRestriction)
router.post("/departmental/start", authMiddleware, authorizeRoles("voter", "election_committee"), BallotController.startDepartmentalBallot)

module.exports = router