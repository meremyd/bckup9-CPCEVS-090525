const express = require("express")
const voterController = require("../controllers/voterController")
const { authMiddleware, authorizeRoles, voterAuthMiddleware } = require("../middleware/authMiddleware")
const router = express.Router()

// Public endpoint for voter lookup
router.get("/lookup/:schoolId", voterController.lookupVoter)

// Voter-authenticated routes (for voter profile access)
router.get("/profile", voterAuthMiddleware, voterController.getVoterProfile)
router.put("/profile", voterAuthMiddleware, voterController.updateVoterProfile)

// Staff-only routes (requires authentication)
router.use(authMiddleware)

// Statistics routes
router.get("/stats/summary", authorizeRoles("admin", "election_committee", "sao"), voterController.getStatistics)
router.get("/stats/by-department", authorizeRoles("admin", "election_committee", "sao"), voterController.getStatisticsByDepartment)

// Export routes
router.get("/export/all", authorizeRoles("admin", "election_committee"), voterController.exportVoters)
router.get("/export/registered", authorizeRoles("admin", "election_committee"), voterController.exportRegisteredVoters)

// Department-specific routes
router.get("/department-code/:departmentCode", authorizeRoles("admin", "election_committee", "sao"), voterController.getVotersByDepartmentCode)
router.get("/department-code/:departmentCode/registered", authorizeRoles("admin", "election_committee", "sao"), voterController.getRegisteredVotersByDepartmentCode)
router.get("/department-code/:departmentCode/officers", authorizeRoles("admin", "election_committee", "sao"), voterController.getOfficersByDepartmentCode)

// College-specific routes
router.get("/college/:college", authorizeRoles("admin", "election_committee", "sao"), voterController.getVotersByCollege)

// General voter routes
router.get("/registered", authorizeRoles("admin", "election_committee", "sao"), voterController.getRegisteredVoters)
router.get("/officers", authorizeRoles("admin", "election_committee", "sao"), voterController.getOfficers)

// Individual voter routes
router.get("/:id", authorizeRoles("admin", "election_committee", "sao"), voterController.getVoter)
router.post("/", authorizeRoles("admin"), voterController.createVoter)
router.post("/bulk", authMiddleware, authorizeRoles("admin"), voterController.bulkCreate)
router.put("/:id", authorizeRoles("admin"), voterController.updateVoter)
router.delete("/:id", authorizeRoles("admin"), voterController.deleteVoter)
router.put("/:id/deactivate", authorizeRoles("admin"), voterController.deactivateVoter)
router.put("/:id/toggle-officer", authorizeRoles("election_committee"), voterController.toggleOfficerStatus)
router.put("/:id/year-level", authMiddleware, authorizeRoles("admin", "election_committee"), voterController.updateYearLevel)

// Get all voters (should be last to avoid route conflicts)
router.get("/", authorizeRoles("admin", "election_committee", "sao"), voterController.getAllVoters)

module.exports = router