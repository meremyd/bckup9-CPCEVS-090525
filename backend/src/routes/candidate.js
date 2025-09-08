const express = require("express")
const CandidateController = require("../controllers/candidateController")
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware")
const router = express.Router()

// Protected routes for managing candidates (admin and election_committee only)
router.get("/",authMiddleware,authorizeRoles("admin", "election_committee"),CandidateController.getAllCandidates)
router.get("/:id",authMiddleware,authorizeRoles("admin", "election_committee"),CandidateController.getCandidateById)
router.post("/",authMiddleware,authorizeRoles("admin", "election_committee"),CandidateController.createCandidate)
router.put("/:id",authMiddleware,authorizeRoles("admin", "election_committee"),CandidateController.updateCandidate)
router.delete("/:id",authMiddleware,authorizeRoles("admin"),CandidateController.deleteCandidate)
router.put("/:id/campaign-picture",authMiddleware,authorizeRoles("admin", "election_committee"),CandidateController.uploadCampaignPicture)
router.get("/election/:electionId",authMiddleware,authorizeRoles("admin", "election_committee"),CandidateController.getCandidatesByElection)

module.exports = router