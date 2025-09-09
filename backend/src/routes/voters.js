const express = require("express")
const voterController = require("../controllers/voterController")
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware")
const router = express.Router()

router.get("/stats/summary", voterController.getStatistics)
router.get("/stats/by-degree", voterController.getStatisticsByDegree)
router.get("/lookup/:schoolId", voterController.lookupVoter)
router.get("/registered", voterController.getRegisteredVoters)
router.get("/officers", voterController.getOfficers)
router.get("/", voterController.getAllVoters)

router.post("/", voterController.createVoter)
router.get("/:id", voterController.getVoter)
router.put("/:id", voterController.updateVoter)
router.put("/:id/deactivate", voterController.deactivateVoter)
router.put("/:id/toggle-officer", authorizeRoles("election_committee"), voterController.toggleOfficerStatus)
router.delete("/:id", voterController.deleteVoter)

module.exports = router