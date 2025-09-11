const express = require("express")
const CandidateController = require("../controllers/candidateController")
const { authMiddleware, authorizeRoles, voterAuthMiddleware } = require("../middleware/authMiddleware")
const router = express.Router()

// Admin/Committee routes - General candidate management
router.get("/",
  authMiddleware,
  authorizeRoles("election_committee", "sao", "admin"),
  CandidateController.getAllCandidates
)

router.get("/export",
  authMiddleware,
  authorizeRoles("election_committee", "sao", "admin"),
  CandidateController.exportCandidates
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

// Campaign picture upload (SSG only)
router.put("/:id/campaign-picture",
  authMiddleware,
  authorizeRoles("election_committee"),
  CandidateController.uploadCampaignPicture
)

// Election-specific candidate routes
router.get("/election/:electionId",
  authMiddleware,
  authorizeRoles("election_committee", "sao", "admin"),
  CandidateController.getCandidatesByElection
)

// Voter routes - For voting interface
router.get("/voter/election/:electionId",
  voterAuthMiddleware,
  CandidateController.getCandidatesForVoter
)

module.exports = router