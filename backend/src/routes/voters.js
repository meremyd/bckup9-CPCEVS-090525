const express = require("express")
const voterController = require("../controllers/voterController")
const { authMiddleware, authorizeRoles, voterAuthMiddleware } = require("../middleware/authMiddleware")
const router = express.Router()

router.get("/lookup/:schoolId", voterController.lookupVoter)

router.get("/profile", voterAuthMiddleware, voterController.getVoterProfile)
router.put("/profile", voterAuthMiddleware, voterController.updateVoterProfile)

router.use(authMiddleware)

router.get("/stats/summary", authorizeRoles("admin", "election_committee", "sao"), voterController.getStatistics)
router.get("/stats/by-department", authorizeRoles("admin", "election_committee", "sao"), voterController.getStatisticsByDepartment)

router.get("/export/all", authorizeRoles("admin", "election_committee", "sao"), voterController.exportVoters)
router.get("/export/registered", authorizeRoles("admin", "election_committee", "sao"), voterController.exportRegisteredVoters)

router.get("/active/registered", authorizeRoles("admin", "election_committee", "sao"), voterController.getActiveRegisteredVoters)
router.get("/active/officers", authorizeRoles("admin", "election_committee", "sao"), voterController.getActiveOfficers)
router.get("/active", authorizeRoles("admin", "election_committee", "sao"), voterController.getActiveVoters)

router.get("/department/:departmentId/officers", authorizeRoles("admin", "election_committee", "sao"), voterController.getDepartmentalOfficers)
router.get("/department-code/:departmentCode/active", authorizeRoles("admin", "election_committee", "sao"), voterController.getActiveVotersByDepartmentCode)
router.get("/department-code/:departmentCode/officers/active", authorizeRoles("admin", "election_committee", "sao"), voterController.getActiveOfficersByDepartmentCode)

router.get("/department-code/:departmentCode", authorizeRoles("admin", "election_committee", "sao"), voterController.getVotersByDepartmentCode)
router.get("/department-code/:departmentCode/registered", authorizeRoles("admin", "election_committee", "sao"), voterController.getRegisteredVotersByDepartmentCode)
router.get("/department-code/:departmentCode/officers", authorizeRoles("admin", "election_committee", "sao"), voterController.getOfficersByDepartmentCode)

router.get("/college/:college", authorizeRoles("admin", "election_committee", "sao"), voterController.getVotersByCollege)

router.get("/registered", authorizeRoles("admin", "election_committee", "sao"), voterController.getRegisteredVoters)
router.get("/officers", authorizeRoles("admin", "election_committee", "sao"), voterController.getOfficers)

router.get("/:id", authorizeRoles("admin", "election_committee", "sao"), voterController.getVoter)
router.post("/", authorizeRoles("admin"), voterController.createVoter)
router.post("/bulk", authMiddleware, authorizeRoles("admin"), voterController.bulkCreate)
router.put("/:id", authorizeRoles("admin"), voterController.updateVoter)
router.delete("/:id", authorizeRoles("admin"), voterController.deleteVoter)
router.put("/:id/deactivate", authorizeRoles("admin"), voterController.deactivateVoter)
router.put("/:id/toggle-officer", authorizeRoles("election_committee"), voterController.toggleOfficerStatus)
router.put("/:id/year-level", authMiddleware, authorizeRoles("admin", "election_committee"), voterController.updateYearLevel)

router.get("/", authorizeRoles("admin", "election_committee", "sao"), voterController.getAllVoters)

module.exports = router