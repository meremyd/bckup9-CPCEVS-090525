const express = require("express")
const CandidateController = require("../controllers/candidateController")
const { authMiddleware, authorizeRoles, voterAuthMiddleware } = require("../middleware/authMiddleware")
const router = express.Router()

// Admin/Committee routes
router.get("/",
  authMiddleware,
  authorizeRoles("election_committee", "sao", "admin"),
  CandidateController.getAllCandidates
)

router.get("/:id",
  authMiddleware,
  authorizeRoles("election_committee", "sao", "admin"),
  CandidateController.getCandidateById
)

router.post("/",
  authMiddleware,
  authorizeRoles("election_committee"),
  CandidateController.createCandidate
)

router.put("/:id",
  authMiddleware,
  authorizeRoles("election_committee"),
  CandidateController.updateCandidate
)

router.delete("/:id",
  authMiddleware,
  authorizeRoles("election_committee"),
  CandidateController.deleteCandidate
)

router.put("/:id/campaign-picture",
  authMiddleware,
  authorizeRoles("election_committee"),
  CandidateController.uploadCampaignPicture
)

router.get("/election/:electionId",
  authMiddleware,
  authorizeRoles("election_committee", "sao", "admin"),
  CandidateController.getCandidatesByElection
)

// Voter routes
router.get("/voter/election/:electionId",
  voterAuthMiddleware,
  CandidateController.getCandidatesForVoter
)

module.exports = router     