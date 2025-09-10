const express = require("express")
const votingController = require("../controllers/votingController")
const { authMiddleware, voterOnly, authorizeStaffAndVoters } = require("../middleware/authMiddleware")
const router = express.Router()

// SSG Election routes - for registered voters
router.get("/ssg-elections/active", authMiddleware, voterOnly, votingController.getActiveSSGElections)
router.get("/ssg-election/:id/details", authMiddleware, authorizeStaffAndVoters("election_committee", "sao"), votingController.getSSGElectionDetails)
router.get("/ssg-election/:id/candidates", authMiddleware, authorizeStaffAndVoters("election_committee", "sao"), votingController.getSSGElectionCandidates)
router.post("/ssg-election/cast-vote", authMiddleware, voterOnly, votingController.castSSGVote)
router.get("/ssg-votes/my-votes", authMiddleware, voterOnly, votingController.getMySSGVotes)
router.get("/ssg-voting-status", authMiddleware, voterOnly, votingController.getSSGVotingStatus)

// Departmental Election routes - for registered voters (class officers can vote, others can view)
router.get("/departmental-elections/active", authMiddleware, voterOnly, votingController.getActiveDepartmentalElections)
router.get("/departmental-election/:id/details", authMiddleware, authorizeStaffAndVoters("election_committee", "sao"), votingController.getDepartmentalElectionDetails)
router.get("/departmental-election/:id/candidates", authMiddleware, authorizeStaffAndVoters("election_committee", "sao"), votingController.getDepartmentalElectionCandidates)
router.post("/departmental-election/cast-vote", authMiddleware, voterOnly, votingController.castDepartmentalVote)
router.get("/departmental-votes/my-votes", authMiddleware, voterOnly, votingController.getMyDepartmentalVotes)
router.get("/departmental-voting-status", authMiddleware, voterOnly, votingController.getDepartmentalVotingStatus)

module.exports = router