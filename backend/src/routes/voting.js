const express = require("express")
const votingController = require("../controllers/votingController")
const { authMiddleware, voterAuthMiddleware, authorizeStaffAndVoters } = require("../middleware/authMiddleware")
const router = express.Router()

// VOTER-ONLY ROUTES (use voterAuthMiddleware for consistency)
// SSG Election routes
router.get("/ssg-elections/active", voterAuthMiddleware, votingController.getActiveSSGElections)
router.post("/ssg-election/cast-vote", voterAuthMiddleware, votingController.castSSGVote)
router.get("/ssg-votes/my-votes", voterAuthMiddleware, votingController.getMySSGVotes)
router.get("/ssg-voting-status", voterAuthMiddleware, votingController.getSSGVotingStatus)

// Departmental Election routes
router.get("/departmental-elections/active", voterAuthMiddleware, votingController.getActiveDepartmentalElections)
router.post("/departmental-election/cast-vote", voterAuthMiddleware, votingController.castDepartmentalVote)
router.get("/departmental-votes/my-votes", voterAuthMiddleware, votingController.getMyDepartmentalVotes)
router.get("/departmental-voting-status", voterAuthMiddleware, votingController.getDepartmentalVotingStatus)

// STAFF AND VOTER ROUTES (viewing election details)
router.get("/ssg-election/:id/details", authMiddleware, authorizeStaffAndVoters("election_committee", "sao"), votingController.getSSGElectionDetails)
router.get("/ssg-election/:id/candidates", authMiddleware, authorizeStaffAndVoters("election_committee", "sao"), votingController.getSSGElectionCandidates)
router.get("/departmental-election/:id/details", authMiddleware, authorizeStaffAndVoters("election_committee", "sao"), votingController.getDepartmentalElectionDetails)
router.get("/departmental-election/:id/candidates", authMiddleware, authorizeStaffAndVoters("election_committee", "sao"), votingController.getDepartmentalElectionCandidates)

module.exports = router