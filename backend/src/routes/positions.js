const express = require("express")
const router = express.Router()
const PositionController = require("../controllers/positionController")
const { authMiddleware, authorizeRoles, authorizeStaffAndVoters } = require("../middleware/authMiddleware")

router.use(authMiddleware)

router.get("/ssg", authorizeRoles("admin", "election_committee", "sao"), PositionController.getAllSSGPositions)
router.get("/ssg/:id", authorizeRoles("admin", "election_committee", "sao"), PositionController.getSSGPositionById)
router.post("/ssg", authorizeRoles("admin", "election_committee"), PositionController.createSSGPosition)
router.put("/ssg/:id", authorizeRoles("admin", "election_committee"), PositionController.updateSSGPosition)
router.delete("/ssg/:id", authorizeRoles("admin", "election_committee"), PositionController.deleteSSGPosition)
router.get("/ssg/elections/:ssgElectionId", authorizeStaffAndVoters("admin", "election_committee", "sao"), PositionController.getPositionsBySSGElection)
router.put("/ssg/elections/:ssgElectionId/reorder", authorizeRoles("admin", "election_committee"), PositionController.reorderSSGPositions)
router.get("/ssg/:positionId/stats", authorizeStaffAndVoters("admin", "election_committee", "sao"), PositionController.getSSGPositionStats)
router.get("/ssg/:positionId/can-delete", authorizeRoles("admin", "election_committee"), PositionController.canDeleteSSGPosition)

router.get("/departmental", authorizeRoles("admin", "election_committee", "sao"), PositionController.getAllDepartmentalPositions)
router.get("/departmental/:id", authorizeRoles("admin", "election_committee", "sao"), PositionController.getDepartmentalPositionById)
router.post("/departmental", authorizeRoles("admin", "election_committee"), PositionController.createDepartmentalPosition)
router.put("/departmental/:id", authorizeRoles("admin", "election_committee"), PositionController.updateDepartmentalPosition)
router.delete("/departmental/:id", authorizeRoles("admin", "election_committee"), PositionController.deleteDepartmentalPosition)
router.get("/departmental/elections/:deptElectionId", authorizeStaffAndVoters("admin", "election_committee", "sao"), PositionController.getPositionsByDepartmentalElection)
router.put("/departmental/elections/:deptElectionId/reorder", authorizeRoles("admin", "election_committee"), PositionController.reorderDepartmentalPositions)
router.get("/departmental/:positionId/stats", authorizeStaffAndVoters("admin", "election_committee", "sao"), PositionController.getDepartmentalPositionStats)
router.get("/departmental/:positionId/can-delete", authorizeRoles("admin", "election_committee"), PositionController.canDeleteDepartmentalPosition)

module.exports = router