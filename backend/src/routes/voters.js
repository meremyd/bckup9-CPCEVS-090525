const express = require("express")
const voterController = require("../controllers/voterController")
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware")
const router = express.Router()

router.use(authMiddleware)


router.get("/lookup/:schoolId", voterController.lookupVoter)
router.get("/stats/summary", authorizeRoles("admin", "election_committee", "sao"), voterController.getStatistics)
router.get("/stats/by-department", authorizeRoles("admin", "election_committee", "sao"), voterController.getStatisticsByDepartment)
router.get("/registered", authorizeRoles("admin", "election_committee", "sao"), voterController.getRegisteredVoters)
router.get("/officers", authorizeRoles("admin", "election_committee", "sao"), voterController.getOfficers)
router.get("/:id", authorizeRoles("admin", "election_committee", "sao"), voterController.getVoter)
router.post("/", authorizeRoles("admin"), voterController.createVoter)
router.put("/:id", authorizeRoles("admin"), voterController.updateVoter)
router.delete("/:id", authorizeRoles("admin"), voterController.deleteVoter)
router.put("/:id/deactivate", authorizeRoles("admin"), voterController.deactivateVoter)
router.put("/:id/toggle-officer", authorizeRoles("election_committee"), voterController.toggleOfficerStatus)
router.get("/", authorizeRoles("admin", "election_committee", "sao"), voterController.getAllVoters)

module.exports = router