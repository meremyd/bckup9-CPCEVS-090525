const express = require("express")
const router = express.Router()
const PositionController = require("../controllers/positionController")
const { authMiddleware, authorizeRoles, voterAuthMiddleware } = require("../middleware/authMiddleware")

// ==================== STAFF/ADMIN ROUTES - SSG POSITIONS ====================
router.use('/user/ssg', authMiddleware)

router.get("/user/ssg", authorizeRoles("election_committee", "sao"), PositionController.getAllSSGPositions)
router.post("/user/ssg", authorizeRoles("election_committee"), PositionController.createSSGPosition)
router.get("/user/ssg/elections/:ssgElectionId", authorizeRoles("election_committee", "sao"), PositionController.getPositionsBySSGElection)
router.put("/user/ssg/elections/:ssgElectionId/reorder", authorizeRoles("election_committee"), PositionController.reorderSSGPositions)
router.get("/user/ssg/elections/:ssgElectionId/candidate-limits", authorizeRoles("election_committee", "sao"), PositionController.getSSGPositionCandidateLimits)
router.get("/user/ssg/:positionId/stats", authorizeRoles("election_committee", "sao"), PositionController.getSSGPositionStats)
router.get("/user/ssg/:positionId/can-delete", authorizeRoles("election_committee"), PositionController.canDeleteSSGPosition)
router.get("/user/ssg/:positionId/validate-deletion", authorizeRoles("election_committee"), PositionController.validateSSGPositionDeletion)
router.get('/user/ssg/debug/:ssgElectionId', PositionController.debugSSGPositions)
router.get('/user/debug-position-state', PositionController.debugPositionState)
router.get('/user/ssg/debug/:ssgElectionId', PositionController.debugDatabaseState)
router.get("/user/ssg/:id", authorizeRoles("election_committee", "sao"), PositionController.getSSGPositionById)
router.put("/user/ssg/:id", authorizeRoles("election_committee"), PositionController.updateSSGPosition)
router.delete("/user/ssg/:id", authorizeRoles("election_committee"), PositionController.deleteSSGPosition)

// ==================== STAFF/ADMIN ROUTES - DEPARTMENTAL POSITIONS ====================
router.use('/user/departmental', authMiddleware)

router.get("/user/departmental", authorizeRoles("election_committee", "sao"), PositionController.getAllDepartmentalPositions)
router.post("/user/departmental", authorizeRoles("election_committee"), PositionController.createDepartmentalPosition)
router.get("/user/departmental/elections/:deptElectionId", authorizeRoles("election_committee", "sao"), PositionController.getPositionsByDepartmentalElection)
router.put("/user/departmental/elections/:deptElectionId/reorder", authorizeRoles("election_committee"), PositionController.reorderDepartmentalPositions)
router.get("/user/departmental/:positionId/stats", authorizeRoles("election_committee", "sao"), PositionController.getDepartmentalPositionStats)
router.get("/user/departmental/:positionId/can-delete", authorizeRoles("election_committee"), PositionController.canDeleteDepartmentalPosition)
router.get("/user/departmental/:id", authorizeRoles("election_committee", "sao"), PositionController.getDepartmentalPositionById)
router.put("/user/departmental/:id", authorizeRoles("election_committee"), PositionController.updateDepartmentalPosition)
router.delete("/user/departmental/:id", authorizeRoles("election_committee"), PositionController.deleteDepartmentalPosition)

// ==================== VOTER ROUTES - SSG POSITIONS ====================
router.use('/voter/ssg', voterAuthMiddleware)

router.get("/voter/ssg", PositionController.getAllSSGPositions)
router.get("/voter/ssg/elections/:ssgElectionId", PositionController.getPositionsBySSGElection)
router.get("/voter/ssg/:positionId/stats", PositionController.getSSGPositionStats)
router.get("/voter/ssg/:id", PositionController.getSSGPositionById)

// ==================== VOTER ROUTES - DEPARTMENTAL POSITIONS ====================
router.use('/voter/departmental', voterAuthMiddleware)

router.get("/voter/departmental", PositionController.getAllDepartmentalPositions)
router.get("/voter/departmental/elections/:deptElectionId", PositionController.getPositionsByDepartmentalElection)
router.get("/voter/departmental/:positionId/stats", PositionController.getDepartmentalPositionStats)
router.get("/voter/departmental/:id", PositionController.getDepartmentalPositionById)

module.exports = router