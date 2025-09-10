const express = require("express")
const BallotController = require("../controllers/ballotController")
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware")
const router = express.Router()

// SSG Ballot Routes
router.get("/ssg", authMiddleware, authorizeRoles("admin", "election_committee", "sao"), BallotController.getSSGBallots)
router.get("/ssg/statistics", authMiddleware, authorizeRoles("admin", "election_committee", "sao"), BallotController.getSSGBallotStatistics)
router.delete("/ssg/:id", authMiddleware, authorizeRoles("admin"), BallotController.deleteSSGBallot)
router.post("/ssg/start", authMiddleware, authorizeRoles("voter"), BallotController.startSSGBallot)
router.put("/ssg/:id/submit", authMiddleware, authorizeRoles("voter"), BallotController.submitSSGBallot)
router.delete("/ssg/:id/abandon", authMiddleware, authorizeRoles("voter"), BallotController.abandonSSGBallot)
router.get("/ssg/status/:electionId", authMiddleware, authorizeRoles("voter"), BallotController.getVoterSSGBallotStatus)
router.get("/ssg/:id/review", authMiddleware, authorizeRoles("voter"), BallotController.getSSGBallotWithVotes)

// Departmental Ballot Routes
router.get("/departmental", authMiddleware, authorizeRoles("admin", "election_committee", "sao"), BallotController.getDepartmentalBallots)
router.get("/departmental/statistics", authMiddleware, authorizeRoles("admin", "election_committee", "sao"), BallotController.getDepartmentalBallotStatistics)
router.get("/departmental/:electionId/available-positions", authMiddleware, authorizeRoles("voter"), BallotController.getAvailablePositionsForVoting)
router.get("/departmental/:electionId/next-position", authMiddleware, authorizeRoles("voter"), BallotController.getNextPositionForVoting)
router.delete("/departmental/:id", authMiddleware, authorizeRoles("admin"), BallotController.deleteDepartmentalBallot)
router.post("/departmental/start", authMiddleware, authorizeRoles("voter"), BallotController.startDepartmentalBallot)
router.put("/departmental/:id/submit", authMiddleware, authorizeRoles("voter"), BallotController.submitDepartmentalBallot)
router.delete("/departmental/:id/abandon", authMiddleware, authorizeRoles("voter"), BallotController.abandonDepartmentalBallot)

// Split the problematic route into two separate routes
// Route with positionId parameter
router.get("/departmental/status/:electionId/:positionId", authMiddleware, authorizeRoles("voter", "admin", "election_committee", "sao"), BallotController.getVoterDepartmentalBallotStatus)
// Route without positionId parameter  
router.get("/departmental/status/:electionId", authMiddleware, authorizeRoles("voter", "admin", "election_committee", "sao"), BallotController.getVoterDepartmentalBallotStatus)

router.get("/departmental/:id/review", authMiddleware, authorizeRoles("voter"), BallotController.getDepartmentalBallotWithVotes)

// General Ballot Routes
router.get("/:id", authMiddleware, authorizeRoles("admin", "election_committee", "sao", "voter"), BallotController.getBallotById)

module.exports = router