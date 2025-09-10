const express = require("express")
const ballotController = require("../controllers/ballotController")
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware")
const router = express.Router()

// SSG Ballot Routes
router.get("/ssg", authMiddleware, authorizeRoles("election_committee"), ballotController.getSSGBallots)
router.get("/ssg/statistics", authMiddleware, authorizeRoles("election_committee", "sao"), ballotController.getSSGBallotStatistics)
router.delete("/ssg/:id", authMiddleware, authorizeRoles("election_committee"), ballotController.deleteSSGBallot)
router.post("/ssg/start", authMiddleware, authorizeRoles("voter"), ballotController.startSSGBallot)
router.put("/ssg/:id/submit", authMiddleware, authorizeRoles("voter"), ballotController.submitSSGBallot)
router.delete("/ssg/:id/abandon", authMiddleware, authorizeRoles("voter"), ballotController.abandonSSGBallot)
router.get("/ssg/status/:electionId", authMiddleware, authorizeRoles("voter"), ballotController.getVoterSSGBallotStatus)
router.get("/ssg/:id/review", authMiddleware, authorizeRoles("voter"), ballotController.getSSGBallotWithVotes)

// Departmental Ballot Routes
router.get("/departmental", authMiddleware, authorizeRoles("election_committee"), ballotController.getDepartmentalBallots)
router.get("/departmental/statistics", authMiddleware, authorizeRoles("election_committee", "sao"), ballotController.getDepartmentalBallotStatistics)
router.delete("/departmental/:id", authMiddleware, authorizeRoles("election_committee"), ballotController.deleteDepartmentalBallot)
router.post("/departmental/start", authMiddleware, authorizeRoles("voter"), ballotController.startDepartmentalBallot)
router.put("/departmental/:id/submit", authMiddleware, authorizeRoles("voter"), ballotController.submitDepartmentalBallot)
router.delete("/departmental/:id/abandon", authMiddleware, authorizeRoles("voter"), ballotController.abandonDepartmentalBallot)
router.get("/departmental/status/:electionId", authMiddleware, authorizeRoles("voter"), ballotController.getVoterDepartmentalBallotStatus)
router.get("/departmental/:id/review", authMiddleware, authorizeRoles("voter"), ballotController.getDepartmentalBallotWithVotes)

// General Ballot Routes
router.get("/:id", authMiddleware, authorizeRoles("election_committee", "voter"), ballotController.getBallotById)

module.exports = router