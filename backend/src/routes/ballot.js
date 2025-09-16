const express = require("express")
const BallotController = require("../controllers/ballotController")
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware")
const router = express.Router()

router.get("/", authMiddleware, authorizeRoles("admin", "election_committee", "sao", "voter"), BallotController.getAllBallots)
router.get("/statistics", authMiddleware, authorizeRoles("admin", "election_committee", "sao", "voter"), BallotController.getBallotStatistics)
router.get("/export", authMiddleware, authorizeRoles("admin", "election_committee"), BallotController.exportBallotData)

router.get("/expired/check", authMiddleware, authorizeRoles("admin", "election_committee", "sao"), BallotController.checkExpiredBallots)
router.get("/:ballotId/timeout-status", authMiddleware, authorizeRoles("admin", "election_committee", "sao", "voter"), BallotController.getBallotTimeoutStatus)
router.put("/:ballotId/extend-timeout", authMiddleware, authorizeRoles("admin", "election_committee"), BallotController.extendBallotTimeout)

// SSG Ballot APIs
router.get("/ssg", authMiddleware, authorizeRoles("admin", "election_committee", "sao", "voter"), BallotController.getSSGBallots)
router.get("/ssg/statistics", authMiddleware, authorizeRoles("admin", "election_committee", "sao", "voter"), BallotController.getSSGBallotStatistics)
router.delete("/ssg/:id", authMiddleware, authorizeRoles("admin", "election_committee"), BallotController.deleteSSGBallot)
router.post("/ssg/start", authMiddleware, authorizeRoles("voter", "election_committee"), BallotController.startSSGBallot)
router.post("/ssg/start-with-timeout", authMiddleware, authorizeRoles("voter", "election_committee"), BallotController.startSSGBallotWithTimeout)
router.put("/ssg/:id/submit", authMiddleware, authorizeRoles("voter", "election_committee"), BallotController.submitSSGBallot)
router.delete("/ssg/:id/abandon", authMiddleware, authorizeRoles("voter", "election_committee"), BallotController.abandonSSGBallot)
router.get("/ssg/status/:electionId", authMiddleware, authorizeRoles("voter", "election_committee"), BallotController.getVoterSSGBallotStatus)
router.get("/ssg/:id/review", authMiddleware, authorizeRoles("voter", "election_committee"), BallotController.getSSGBallotWithVotes)

// Departmental Ballot APIs
router.get("/departmental", authMiddleware, authorizeRoles("admin", "election_committee", "sao", "voter"), BallotController.getDepartmentalBallots)
router.get("/departmental/statistics", authMiddleware, authorizeRoles("admin", "election_committee", "sao"), BallotController.getDepartmentalBallotStatistics)
router.get("/departmental/:electionId/available-positions", authMiddleware, authorizeRoles("voter", "election_committee"), BallotController.getAvailablePositionsForVoting)
router.get("/departmental/:electionId/next-position", authMiddleware, authorizeRoles("voter", "election_committee"), BallotController.getNextPositionForVoting)
router.delete("/departmental/:id", authMiddleware, authorizeRoles("admin", "election_committee"), BallotController.deleteDepartmentalBallot)
router.post("/departmental/start", authMiddleware, authorizeRoles("voter"), BallotController.startDepartmentalBallot)
router.put("/departmental/:id/submit", authMiddleware, authorizeRoles("voter"), BallotController.submitDepartmentalBallot)
router.delete("/departmental/:id/abandon", authMiddleware, authorizeRoles("voter"), BallotController.abandonDepartmentalBallot)

router.get("/departmental/status/:electionId/:positionId", authMiddleware, authorizeRoles("admin", "voter", "election_committee", "sao"), BallotController.getVoterDepartmentalBallotStatus)
router.get("/departmental/status/:electionId", authMiddleware, authorizeRoles("admin", "election_committee", "sao"), BallotController.getVoterDepartmentalBallotStatus)
router.get("/departmental/:id/review", authMiddleware, authorizeRoles("voter"), BallotController.getDepartmentalBallotWithVotes)

// ⚠️ IMPORTANT: This should be LAST to avoid conflicts with specific routes above
router.get("/:id", authMiddleware, authorizeRoles("admin", "election_committee", "sao", "voter"), BallotController.getBallotById)

module.exports = router