const express = require("express")
const PartylistController = require("../controllers/partylistController")
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware")

const router = express.Router()

// Apply authentication middleware to all routes
router.use(authMiddleware)

// Get all partylists - accessible by election committee and sao
router.get("/", authorizeRoles("admin", "election_committee", "sao"), PartylistController.getAllPartylists)

// Get partylists by SSG election - accessible by election committee and sao
router.get("/ssg-election/:ssgElectionId", authorizeRoles("admin", "election_committee", "sao"), PartylistController.getPartylistsBySSGElection)

// Get single partylist - accessible by election committee and sao
router.get("/:id", authorizeRoles("admin", "election_committee", "sao"), PartylistController.getPartylist)

// Get partylist statistics - accessible by election committee and sao
router.get("/:id/statistics", authorizeRoles("admin", "election_committee", "sao"), PartylistController.getPartylistStatistics)

// Create partylist - only election committee can create
router.post("/", authorizeRoles("admin", "election_committee"), PartylistController.createPartylist)

// Update partylist - only election committee can update
router.put("/:id", authorizeRoles("admin", "election_committee"), PartylistController.updatePartylist)

// Delete partylist - only election committee can delete
router.delete("/:id", authorizeRoles("admin", "election_committee"), PartylistController.deletePartylist)

module.exports = router