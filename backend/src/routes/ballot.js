const express = require("express")
const BallotController = require("../controllers/ballotController")
const { authMiddleware, authorizeRoles, voterAuthMiddleware } = require("../middleware/authMiddleware")
const router = express.Router()

// ==================== STAFF/ADMIN ROUTES - SSG BALLOTS ====================
router.use('/user/ssg', authMiddleware)

router.get("/user/ssg/:electionId/ballots", authorizeRoles("election_committee", "admin"), BallotController.getSelectedSSGElectionBallots)
router.get("/user/ssg/:electionId/statistics", authorizeRoles("election_committee", "admin"), BallotController.getSelectedSSGElectionBallotStatistics)
router.get("/user/ssg/:electionId/preview", authorizeRoles("election_committee", "admin"), BallotController.previewSSGBallot)
router.get("/user/ssg/ballot/:ballotId/votes", authorizeRoles("election_committee", "admin"), BallotController.getSelectedSSGBallotWithVotes)
router.put("/user/ssg/:ballotId/timer", authorizeRoles("election_committee", "admin"), BallotController.updateSSGBallotTimer)
router.put("/user/ssg/:electionId/ballot-duration", authorizeRoles("election_committee", "admin"), BallotController.updateSSGBallotDuration)
router.post("/user/ssg/:ballotId/submit", authorizeRoles("election_committee"), BallotController.submitSelectedSSGBallot)

// ==================== STAFF/ADMIN ROUTES - DEPARTMENTAL BALLOTS ====================
router.use('/user/departmental', authMiddleware)

router.get("/user/departmental/:electionId/:positionId/ballots", authorizeRoles("election_committee", "admin"), BallotController.getDepartmentalBallots)
router.get("/user/departmental/:electionId/:positionId/statistics", authorizeRoles("election_committee", "admin"), BallotController.getDepartmentalBallotStatistics)
router.get("/user/departmental/:electionId/:positionId/preview", authorizeRoles("election_committee", "admin"), BallotController.previewDepartmentalBallot)
router.get("/user/departmental/:electionId/preview-positions", authorizeRoles("election_committee", "admin"), BallotController.getPositionsForPreview)
router.delete("/user/departmental/:ballotId", authorizeRoles("election_committee", "admin"), BallotController.deleteDepartmentalBallot)
router.put("/user/departmental/position/:positionId/year-restriction", authorizeRoles("election_committee", "admin"), BallotController.updateYearLevelRestriction)
router.get("/user/departmental/position/:positionId/timing", authorizeRoles("election_committee", "admin"), BallotController.getDepartmentalPositionBallotTiming)
router.put("/user/departmental/position/:positionId/timing", authorizeRoles("election_committee", "admin"), BallotController.updateDepartmentalPositionBallotTiming)
router.post("/user/departmental/position/:positionId/open", authorizeRoles("election_committee", "admin"), BallotController.openDepartmentalPositionBallot)
router.post("/user/departmental/position/:positionId/close", authorizeRoles("election_committee", "admin"), BallotController.closeDepartmentalPositionBallot)
router.put("/user/departmental/position/:positionId/year-level", authorizeRoles("election_committee", "admin"), BallotController.updateDepartmentalPositionYearLevel)


// ==================== VOTER ROUTES - SSG BALLOTS ====================
router.use('/voter/ssg', voterAuthMiddleware)

router.get("/voter/ssg/:electionId/preview", BallotController.previewSSGBallot)
router.get("/voter/ssg/:electionId/voter-status", BallotController.getVoterSelectedSSGBallotStatus)
router.get("/voter/ssg/ballot/:ballotId/votes", BallotController.getSelectedSSGBallotWithVotes)
router.post("/voter/ssg/start", BallotController.startSSGBallot)
router.post("/voter/ssg/:ballotId/submit", BallotController.submitSelectedSSGBallot)

// ==================== VOTER ROUTES - DEPARTMENTAL BALLOTS ====================
router.use('/voter/departmental', voterAuthMiddleware)

router.get("/voter/departmental/:electionId/available-positions", BallotController.getAvailablePositionsForVoting)
router.get("/voter/departmental/:electionId/:positionId/voter-status", BallotController.getVoterDepartmentalBallotStatus)
router.post("/voter/departmental/start", BallotController.startDepartmentalBallot)
router.post("/voter/departmental/:ballotId/submit", BallotController.submitDepartmentalBallot)

module.exports = router