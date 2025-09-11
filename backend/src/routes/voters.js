const express = require("express")
const voterController = require("../controllers/voterController")
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware")
const router = express.Router()

// Apply authentication to all routes
router.use(authMiddleware)

// Public lookup - no additional authorization needed
router.get("/lookup/:schoolId", voterController.lookupVoter)

// Statistics routes - accessible to all authenticated users
router.get("/stats/summary", authorizeRoles("admin", "election_committee", "sao"), voterController.getStatistics)
router.get("/stats/by-degree", authorizeRoles("admin", "election_committee", "sao"), voterController.getStatisticsByDegree)

// Voter listing routes - admin and election_committee only
router.get("/registered", authorizeRoles("admin", "election_committee"), voterController.getRegisteredVoters)
router.get("/officers", authorizeRoles("admin", "election_committee"), voterController.getOfficers)
router.get("/", authorizeRoles("admin", "election_committee"), voterController.getAllVoters)

router.get("/:id", authorizeRoles("admin", "election_committee"), voterController.getVoter)

router.post("/", authorizeRoles("admin"), voterController.createVoter)
router.put("/:id", authorizeRoles("admin"), voterController.updateVoter)
router.delete("/:id", authorizeRoles("admin"), voterController.deleteVoter)

router.put("/:id/deactivate", authorizeRoles("admin"), voterController.deactivateVoter)
router.put("/:id/toggle-officer", authorizeRoles("election_committee", "admin"), voterController.toggleOfficerStatus)

module.exports = router