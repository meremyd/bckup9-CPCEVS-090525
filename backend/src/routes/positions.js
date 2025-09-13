const express = require("express")
const router = express.Router()
const PositionController = require("../controllers/positionController")
const { authMiddleware, authorizeRoles, authorizeStaffAndVoters } = require("../middleware/authMiddleware")

// Apply authentication middleware to all routes
router.use(authMiddleware)

// SSG Position Routes
router.get("/ssg", authorizeRoles("election_committee", "sao", "voter"), PositionController.getAllSSGPositions)
router.get("/ssg/:id", authorizeRoles("election_committee", "sao", "voter"), PositionController.getSSGPositionById)
router.post("/ssg", authorizeRoles("election_committee"), PositionController.createSSGPosition)
router.put("/ssg/:id", authorizeRoles("election_committee"), PositionController.updateSSGPosition)
router.delete("/ssg/:id", authorizeRoles("election_committee"), PositionController.deleteSSGPosition)
router.get("/ssg/elections/:ssgElectionId", authorizeStaffAndVoters("election_committee", "sao", "voter"), PositionController.getPositionsBySSGElection)
router.put("/ssg/elections/:ssgElectionId/reorder", authorizeRoles("election_committee"), PositionController.reorderSSGPositions)
router.get("/ssg/:positionId/stats", authorizeStaffAndVoters("election_committee", "sao", "voter"), PositionController.getSSGPositionStats)
router.get("/ssg/:positionId/can-delete", authorizeRoles("election_committee"), PositionController.canDeleteSSGPosition)

// Departmental Position Routes
router.get("/departmental", authorizeRoles("election_committee", "sao", "voter"), PositionController.getAllDepartmentalPositions)
router.get("/departmental/:id", authorizeRoles("election_committee", "sao", "voter"), PositionController.getDepartmentalPositionById)
router.post("/departmental", authorizeRoles("election_committee"), PositionController.createDepartmentalPosition)
router.put("/departmental/:id", authorizeRoles("election_committee"), PositionController.updateDepartmentalPosition)
router.delete("/departmental/:id", authorizeRoles("election_committee"), PositionController.deleteDepartmentalPosition)
router.get("/departmental/elections/:deptElectionId", authorizeStaffAndVoters("election_committee", "sao", "voter"), PositionController.getPositionsByDepartmentalElection)
router.put("/departmental/elections/:deptElectionId/reorder", authorizeRoles("election_committee"), PositionController.reorderDepartmentalPositions)
router.get("/departmental/:positionId/stats", authorizeStaffAndVoters("election_committee", "sao", "voter"), PositionController.getDepartmentalPositionStats)
router.get("/departmental/:positionId/can-delete", authorizeRoles("election_committee"), PositionController.canDeleteDepartmentalPosition)

module.exports = router