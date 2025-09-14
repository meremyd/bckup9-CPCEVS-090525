const express = require("express")
const CandidateController = require("../controllers/candidateController")
const { authMiddleware, authorizeRoles, voterAuthMiddleware } = require("../middleware/authMiddleware")
const router = express.Router()
const asyncHandler = (fn) => (req, res, next) => {Promise.resolve(fn(req, res, next)).catch(next)} 

router.get("/export", authMiddleware, authorizeRoles("election_committee", "sao"), asyncHandler(CandidateController.exportCandidates))

// ===== SSG SPECIFIC ROUTES =====
router.get("/ssg", authMiddleware, authorizeRoles("election_committee", "sao", "voter"), asyncHandler(CandidateController.getAllSSGCandidates))
router.post("/ssg", authMiddleware, authorizeRoles("election_committee"), asyncHandler(CandidateController.createSSGCandidate))
router.get("/ssg/eligibility/:ssgElectionId/:positionId", authMiddleware, authorizeRoles("election_committee"), asyncHandler(CandidateController.checkCandidateEligibility))
router.get("/ssg/eligibility/:ssgElectionId/:positionId/:partylistId", authMiddleware, authorizeRoles("election_committee"), asyncHandler(CandidateController.checkCandidateEligibility))
router.get("/ssg/partylist-slots/:ssgElectionId", authMiddleware, authorizeRoles("election_committee", "sao"), asyncHandler(CandidateController.getPartylistCandidateSlots))
router.get("/ssg/partylist-slots/:ssgElectionId/:partylistId", authMiddleware, authorizeRoles("election_committee", "sao"), asyncHandler(CandidateController.getPartylistCandidateSlots))
router.get("/ssg/election/:electionId", authMiddleware, authorizeRoles("election_committee", "sao", "voter"), asyncHandler(CandidateController.getCandidatesBySSGElection))
router.get("/ssg/voter/election/:electionId", voterAuthMiddleware, asyncHandler(CandidateController.getCandidatesForVoter))
router.get("/ssg/:id", authMiddleware, authorizeRoles("election_committee", "sao", "voter"), asyncHandler(CandidateController.getSSGCandidateById))
router.put("/ssg/:id", authMiddleware, authorizeRoles("election_committee"), asyncHandler(CandidateController.updateSSGCandidate))
router.delete("/ssg/:id", authMiddleware, authorizeRoles("election_committee"), asyncHandler(CandidateController.deleteSSGCandidate))

// ===== DEPARTMENTAL SPECIFIC ROUTES =====
router.get("/departmental", authMiddleware, authorizeRoles("election_committee", "sao", "voter"), asyncHandler(CandidateController.getAllDepartmentalCandidates))
router.post("/departmental", authMiddleware, authorizeRoles("election_committee"), asyncHandler(CandidateController.createDepartmentalCandidate))
router.get("/departmental/election/:electionId", authMiddleware, authorizeRoles("election_committee", "sao", "voter"), asyncHandler(CandidateController.getCandidatesByDepartmentalElection))
router.get("/departmental/voter/election/:electionId", voterAuthMiddleware, asyncHandler(CandidateController.getCandidatesForVoter))
router.get("/departmental/:id", authMiddleware, authorizeRoles("election_committee", "sao", "voter"), asyncHandler(CandidateController.getDepartmentalCandidateById))
router.put("/departmental/:id", authMiddleware, authorizeRoles("election_committee"), asyncHandler(CandidateController.updateDepartmentalCandidate))
router.delete("/departmental/:id", authMiddleware, authorizeRoles("election_committee"), asyncHandler(CandidateController.deleteDepartmentalCandidate))

router.get("/election/:electionId", authMiddleware, authorizeRoles("election_committee", "sao", "voter"), asyncHandler(CandidateController.getCandidatesByElection))
router.get("/voter/election/:electionId", voterAuthMiddleware, asyncHandler(CandidateController.getCandidatesForVoter))

router.put("/:id/credentials", authMiddleware, authorizeRoles("election_committee"), asyncHandler(CandidateController.uploadCredentials))
router.get("/:id/credentials", authMiddleware, authorizeRoles("election_committee", "sao", "voter"), asyncHandler(CandidateController.getCandidateCredentials))

router.put("/:id/campaign-picture", authMiddleware, authorizeRoles("election_committee"), asyncHandler(CandidateController.uploadCampaignPicture))
router.get("/:id/campaign-picture", authMiddleware, authorizeRoles("election_committee", "sao", "voter"), asyncHandler(CandidateController.getCandidateCampaignPicture))
router.get("/", authMiddleware, authorizeRoles("election_committee", "sao", "voter"), asyncHandler(CandidateController.getAllCandidates))
router.post("/", authMiddleware, authorizeRoles("election_committee"), asyncHandler(CandidateController.createCandidate))
router.get("/:id", authMiddleware, authorizeRoles("election_committee", "sao", "voter"), asyncHandler(CandidateController.getCandidateById))
router.put("/:id", authMiddleware, authorizeRoles("election_committee"), asyncHandler(CandidateController.updateCandidate))
router.delete("/:id", authMiddleware, authorizeRoles("election_committee"), asyncHandler(CandidateController.deleteCandidate))

module.exports = router