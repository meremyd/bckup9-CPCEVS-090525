const express = require("express")
const voterController = require("../controllers/voterController")
const router = express.Router()

router.get("/lookup/:schoolId", voterController.lookupVoter)
router.get("/registered", voterController.getRegisteredVoters)
router.get("/", voterController.getAllVoters)
router.get("/:id", voterController.getVoter)
router.post("/", voterController.createVoter)
router.put("/:id", voterController.updateVoter)
router.put("/:id/deactivate", voterController.deactivateVoter)
router.delete("/:id", voterController.deleteVoter)
router.get("/stats/summary", voterController.getStatistics)

module.exports = router
