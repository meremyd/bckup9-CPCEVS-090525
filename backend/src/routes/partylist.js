const express = require("express")
const PartylistController = require("../controllers/partylistController")
const { authMiddleware, authorizeRoles, voterAuthMiddleware } = require("../middleware/authMiddleware")
const router = express.Router()

// ==================== STAFF/ADMIN ROUTES ====================
router.use('/user', authMiddleware)

router.get("/user/", authorizeRoles("election_committee", "sao"), PartylistController.getAllPartylists)
router.get("/user/ssg-election/:ssgElectionId", authorizeRoles("election_committee", "sao"), PartylistController.getPartylistsBySSGElection)
router.get("/user/:id", authorizeRoles("election_committee", "sao"), PartylistController.getPartylist)
router.get("/user/:id/logo", authorizeRoles("election_committee", "sao"), PartylistController.getPartylistLogo)
router.get("/user/:id/platform", authorizeRoles("election_committee", "sao"), PartylistController.getPartylistPlatform)
router.get("/user/:id/statistics", authorizeRoles("election_committee", "sao"), PartylistController.getPartylistStatistics)
router.post("/user/", authorizeRoles("election_committee"), PartylistController.createPartylist)
router.put("/user/:id", authorizeRoles("election_committee"), PartylistController.updatePartylist)
router.delete("/user/:id", authorizeRoles("election_committee"), PartylistController.deletePartylist)

// ==================== VOTER ROUTES ====================
router.use('/voter', voterAuthMiddleware)

router.get("/voter/", PartylistController.getAllPartylists)
router.get("/voter/ssg-election/:ssgElectionId", PartylistController.getPartylistsBySSGElection)
router.get("/voter/:id", PartylistController.getPartylist)
router.get("/voter/:id/logo", PartylistController.getPartylistLogo)
router.get("/voter/:id/platform", PartylistController.getPartylistPlatform)
router.get("/voter/:id/statistics", PartylistController.getPartylistStatistics)

module.exports = router