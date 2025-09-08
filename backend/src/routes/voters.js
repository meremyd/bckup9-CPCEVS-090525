const express = require("express")
const voterController = require("../controllers/voterController")
const router = express.Router()

// Stats route must come before parameterized routes to avoid conflicts
router.get("/stats/summary", voterController.getStatistics)

// Lookup route - specific path to avoid conflicts
router.get("/lookup/:schoolId", voterController.lookupVoter)

// Registered voters route
router.get("/registered", voterController.getRegisteredVoters)

// General routes
router.get("/", voterController.getAllVoters)
router.post("/", voterController.createVoter)

// Parameterized routes - these should come last
router.get("/:id", voterController.getVoter)
router.put("/:id", voterController.updateVoter)
router.put("/:id/deactivate", voterController.deactivateVoter)
router.delete("/:id", voterController.deleteVoter)

module.exports = router