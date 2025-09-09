const express = require("express")
const router = express.Router()
const PositionController = require("../controllers/positionController")
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware")

// Apply authentication middleware to all routes
router.use(authMiddleware)

// Specific routes first to avoid parameter conflicts
router.get("/elections/:electionId/positions", authorizeRoles("election_committee", "sao"), PositionController.getPositionsByElection)
router.put("/elections/:electionId/positions/reorder", authorizeRoles("election_committee"), PositionController.reorderPositions)
router.get("/:positionId/stats", authorizeRoles("election_committee", "sao"), PositionController.getPositionStats)
router.get("/:positionId/can-delete", authorizeRoles("election_committee"), PositionController.canDeletePosition)

// General CRUD routes
router.get("/", authorizeRoles("election_committee", "sao"), PositionController.getAllPositions)
router.get("/:id", authorizeRoles("election_committee", "sao"), PositionController.getPositionById)
router.post("/", authorizeRoles("election_committee"), PositionController.createPosition)
router.put("/:id", authorizeRoles("election_committee"), PositionController.updatePosition)
router.delete("/:id", authorizeRoles("election_committee"), PositionController.deletePosition)

module.exports = router