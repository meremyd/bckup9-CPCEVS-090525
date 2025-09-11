const express = require("express")
const voterController = require("../controllers/voterController")
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware")
const router = express.Router()

router.use(authMiddleware)

// Public voter lookup (requires auth but less restrictive)
router.get("/lookup/:schoolId", voterController.lookupVoter)

// Statistics routes (order matters - more specific routes first)
router.get("/stats/summary", authorizeRoles("admin", "election_committee", "sao"), voterController.getStatistics)
router.get("/stats/by-department", authorizeRoles("admin", "election_committee", "sao"), voterController.getStatisticsByDepartment)

// Filtered lists routes
router.get("/registered", authorizeRoles("admin", "election_committee", "sao"), voterController.getRegisteredVoters)
router.get("/officers", authorizeRoles("admin", "election_committee", "sao"), voterController.getOfficers)

// Individual voter routes
router.get("/:id", authorizeRoles("admin", "election_committee", "sao"), voterController.getVoter)

// Voter management routes (admin only)
router.post("/", authorizeRoles("admin"), voterController.createVoter)
router.put("/:id", authorizeRoles("admin"), voterController.updateVoter)
router.delete("/:id", authorizeRoles("admin"), voterController.deleteVoter)
router.put("/:id/deactivate", authorizeRoles("admin"), voterController.deactivateVoter)

// Officer status management (election committee can also manage)
router.put("/:id/toggle-officer", authorizeRoles("election_committee"), voterController.toggleOfficerStatus)

// All voters list (should be last to avoid conflicts)
router.get("/", authorizeRoles("admin", "election_committee", "sao"), voterController.getAllVoters)

module.exports = router