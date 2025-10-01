const express = require("express")
const CandidateController = require("../controllers/candidateController")
const { authMiddleware, authorizeRoles, voterAuthMiddleware } = require("../middleware/authMiddleware")
const router = express.Router()
const asyncHandler = (fn) => (req, res, next) => {Promise.resolve(fn(req, res, next)).catch(next)} 

// ==================== STAFF/ADMIN ROUTES ====================
router.use('/user', authMiddleware)

router.get("/user/export", authorizeRoles("election_committee", "sao"), asyncHandler(CandidateController.exportCandidates))

router.get("/user/ssg", authorizeRoles("election_committee", "sao"), asyncHandler(CandidateController.getAllSSGCandidates))
router.post("/user/ssg", authorizeRoles("election_committee"), asyncHandler(CandidateController.createSSGCandidate))
router.get("/user/ssg/eligibility/:ssgElectionId/:positionId", authorizeRoles("election_committee"), asyncHandler(CandidateController.checkCandidateEligibility))
router.get("/user/ssg/eligibility/:ssgElectionId/:positionId/:partylistId", authorizeRoles("election_committee"), asyncHandler(CandidateController.checkCandidateEligibility))
router.get("/user/ssg/partylist-slots/:ssgElectionId", authorizeRoles("election_committee", "sao"), asyncHandler(CandidateController.getPartylistCandidateSlots))
router.get("/user/ssg/partylist-slots/:ssgElectionId/:partylistId", authorizeRoles("election_committee", "sao"), asyncHandler(CandidateController.getPartylistCandidateSlots))
router.get("/user/ssg/election/:electionId", authorizeRoles("election_committee", "sao"), asyncHandler(CandidateController.getCandidatesBySSGElection))
router.get("/user/ssg/:id", authorizeRoles("election_committee", "sao"), asyncHandler(CandidateController.getSSGCandidateById))
router.put("/user/ssg/:id", authorizeRoles("election_committee"), asyncHandler(CandidateController.updateSSGCandidate))
router.delete("/user/ssg/:id", authorizeRoles("election_committee"), asyncHandler(CandidateController.deleteSSGCandidate))

router.get("/user/departmental", authorizeRoles("election_committee", "sao"), asyncHandler(CandidateController.getAllDepartmentalCandidates))
router.post("/user/departmental", authorizeRoles("election_committee"), asyncHandler(CandidateController.createDepartmentalCandidate))
router.get("/user/departmental/election/:electionId", authorizeRoles("election_committee", "sao"), asyncHandler(CandidateController.getCandidatesByDepartmentalElection))
router.get("/user/departmental/:id", authorizeRoles("election_committee", "sao"), asyncHandler(CandidateController.getDepartmentalCandidateById))
router.put("/user/departmental/:id", authorizeRoles("election_committee"), asyncHandler(CandidateController.updateDepartmentalCandidate))
router.delete("/user/departmental/:id", authorizeRoles("election_committee"), asyncHandler(CandidateController.deleteDepartmentalCandidate))

router.put("/user/:id/credentials", authorizeRoles("election_committee"), asyncHandler(CandidateController.uploadCredentials))
router.get("/user/:id/credentials", authorizeRoles("election_committee", "sao"), asyncHandler(CandidateController.getCandidateCredentials))
router.put("/user/:id/campaign-picture", authorizeRoles("election_committee"), asyncHandler(CandidateController.uploadCampaignPicture))
router.get("/user/:id/campaign-picture", authorizeRoles("election_committee", "sao"), asyncHandler(CandidateController.getCandidateCampaignPicture))

router.get("/user/", authorizeRoles("election_committee", "sao"), asyncHandler(CandidateController.getAllCandidates))
router.post("/user/", authorizeRoles("election_committee"), asyncHandler(CandidateController.createCandidate))
router.get("/user/:id", authorizeRoles("election_committee", "sao"), asyncHandler(CandidateController.getCandidateById))
router.put("/user/:id", authorizeRoles("election_committee"), asyncHandler(CandidateController.updateCandidate))
router.delete("/user/:id", authorizeRoles("election_committee"), asyncHandler(CandidateController.deleteCandidate))

// ==================== VOTER ROUTES ====================
router.use('/voter', voterAuthMiddleware)
router.get("/voter/ssg", asyncHandler(CandidateController.getAllSSGCandidates))
router.get("/voter/ssg/election/:electionId", asyncHandler(CandidateController.getCandidatesForVoter))
router.get("/voter/ssg/:id", asyncHandler(CandidateController.getSSGCandidateById))
router.get("/voter/departmental", asyncHandler(CandidateController.getAllDepartmentalCandidates))
router.get("/voter/departmental/election/:electionId", asyncHandler(CandidateController.getCandidatesForVoter))
router.get("/voter/departmental/:id", asyncHandler(CandidateController.getDepartmentalCandidateById))
router.get("/voter/:id/campaign-picture", asyncHandler(CandidateController.getCandidateCampaignPicture))
router.get("/voter/:id/credentials", asyncHandler(CandidateController.getCandidateCredentials))
router.get("/voter/", asyncHandler(CandidateController.getAllCandidates))
router.get("/voter/:id", asyncHandler(CandidateController.getCandidateById))

module.exports = router