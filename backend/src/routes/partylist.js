const express = require("express")
const PartylistController = require("../controllers/partylistController")
const { authMiddleware, authorizeRoles, authorizeStaffAndVoters } = require("../middleware/authMiddleware")
const router = express.Router()

// Apply authentication middleware to all routes
router.use(authMiddleware)

// GET routes - accessible by all authenticated users (election_committee, sao, voter)
router.get("/", authorizeStaffAndVoters("election_committee", "sao", "voter"), PartylistController.getAllPartylists)
router.get("/ssg-election/:ssgElectionId", authorizeStaffAndVoters("election_committee", "sao", "voter"), PartylistController.getPartylistsBySSGElection)
router.get("/:id", authorizeStaffAndVoters("election_committee", "sao", "voter"), PartylistController.getPartylist)
router.get("/:id/logo", authorizeStaffAndVoters("election_committee", "sao", "voter"), PartylistController.getPartylistLogo)
router.get("/:id/platform", authorizeStaffAndVoters("election_committee", "sao", "voter"), PartylistController.getPartylistPlatform)
router.get("/:id/statistics", authorizeStaffAndVoters("election_committee", "sao", "voter"), PartylistController.getPartylistStatistics)
router.post("/", authorizeRoles("election_committee"), PartylistController.createPartylist)
router.put("/:id", authorizeRoles("election_committee"), PartylistController.updatePartylist)
router.delete("/:id", authorizeRoles("election_committee"), PartylistController.deletePartylist)

module.exports = router