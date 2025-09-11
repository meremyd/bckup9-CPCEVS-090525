const express = require("express")
const PartylistController = require("../controllers/partylistController")
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware")
const router = express.Router()

router.use(authMiddleware)

router.get("/", authorizeRoles("election_committee", "sao", "voter"), PartylistController.getAllPartylists)
router.get("/ssg-election/:ssgElectionId", authorizeRoles("election_committee", "sao", "voter"), PartylistController.getPartylistsBySSGElection)
router.get("/:id", authorizeRoles("election_committee", "sao", "voter"), PartylistController.getPartylist)
router.get("/:id/statistics", authorizeRoles("election_committee", "sao", "voter"), PartylistController.getPartylistStatistics)
router.post("/", authorizeRoles("election_committee"), PartylistController.createPartylist)
router.put("/:id", authorizeRoles("election_committee"), PartylistController.updatePartylist)
router.delete("/:id", authorizeRoles("election_committee"), PartylistController.deletePartylist)

module.exports = router