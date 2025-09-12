const express = require("express")
const CandidateController = require("../controllers/candidateController")
const { authMiddleware, authorizeRoles, voterAuthMiddleware } = require("../middleware/authMiddleware")
const router = express.Router()

// FIXED: Specific routes MUST come BEFORE generic /:id routes

// Export route (most specific)
router.get("/export", authMiddleware, authorizeRoles("election_committee", "sao"), CandidateController.exportCandidates)

// SSG specific routes - MOVED BEFORE generic routes
router.get("/ssg", authMiddleware, authorizeRoles("election_committee", "sao", "voter"), CandidateController.getAllSSGCandidates)
router.post("/ssg", authMiddleware, authorizeRoles("election_committee"), CandidateController.createSSGCandidate)
router.get("/ssg/election/:electionId", authMiddleware, authorizeRoles("election_committee", "sao", "voter"), CandidateController.getCandidatesBySSGElection)
router.get("/ssg/voter/election/:electionId", voterAuthMiddleware, CandidateController.getCandidatesForVoter)
router.get("/ssg/:id", authMiddleware, authorizeRoles("election_committee", "sao", "voter"), CandidateController.getSSGCandidateById)
router.put("/ssg/:id", authMiddleware, authorizeRoles("election_committee"), CandidateController.updateSSGCandidate)
router.delete("/ssg/:id", authMiddleware, authorizeRoles("election_committee"), CandidateController.deleteSSGCandidate)

// Departmental specific routes - MOVED BEFORE generic routes
router.get("/departmental", authMiddleware, authorizeRoles("election_committee", "sao", "voter"), CandidateController.getAllDepartmentalCandidates)
router.post("/departmental", authMiddleware, authorizeRoles("election_committee"), CandidateController.createDepartmentalCandidate)
router.get("/departmental/election/:electionId", authMiddleware, authorizeRoles("election_committee", "sao", "voter"), CandidateController.getCandidatesByDepartmentalElection)
router.get("/departmental/voter/election/:electionId", voterAuthMiddleware, CandidateController.getCandidatesForVoter)
router.get("/departmental/:id", authMiddleware, authorizeRoles("election_committee", "sao", "voter"), CandidateController.getDepartmentalCandidateById)
router.put("/departmental/:id", authMiddleware, authorizeRoles("election_committee"), CandidateController.updateDepartmentalCandidate)
router.delete("/departmental/:id", authMiddleware, authorizeRoles("election_committee"), CandidateController.deleteDepartmentalCandidate)

// Election-specific routes
router.get("/election/:electionId", authMiddleware, authorizeRoles("election_committee", "sao", "voter"), CandidateController.getCandidatesByElection)
router.get("/voter/election/:electionId", voterAuthMiddleware, CandidateController.getCandidatesForVoter)

// Generic routes (MUST be at the bottom)
router.get("/", authMiddleware, authorizeRoles("election_committee", "sao", "voter"), CandidateController.getAllCandidates)
router.get("/:id", authMiddleware, authorizeRoles("election_committee", "sao"), CandidateController.getCandidateById)
router.post("/", authMiddleware, authorizeRoles("election_committee"), CandidateController.createCandidate)
router.put("/:id", authMiddleware, authorizeRoles("election_committee"), CandidateController.updateCandidate)
router.delete("/:id", authMiddleware, authorizeRoles("election_committee"), CandidateController.deleteCandidate)
router.put("/:id/campaign-picture", authMiddleware, authorizeRoles("election_committee"), CandidateController.uploadCampaignPicture)

module.exports = router