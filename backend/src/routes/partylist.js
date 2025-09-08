const express = require("express")
const PartylistController = require("../controllers/partylistController")
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware")

const router = express.Router()

router.use(authMiddleware)
router.use(authorizeRoles("admin", "election_committee, sao"))
router.get("/", PartylistController.getAllPartylists)
router.get("/election/:electionId", PartylistController.getPartylistsByElection)
router.get("/:id", PartylistController.getPartylist)
router.get("/:id/statistics", PartylistController.getPartylistStatistics)
router.post("/", PartylistController.createPartylist)
router.post("/bulk", PartylistController.bulkCreatePartylists)
router.put("/:id", PartylistController.updatePartylist)
router.delete("/:id", PartylistController.deletePartylist)

module.exports = router