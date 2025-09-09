const express = require("express")
const votingController = require("../controllers/votingController")
const { authMiddleware, voterOnly, authorizeStaffAndVoters } = require("../middleware/authMiddleware")
const router = express.Router()

router.get("/active-elections", authMiddleware, voterOnly, votingController.getActiveElections)
router.post("/cast-vote", authMiddleware, voterOnly, votingController.castVote)
router.get("/my-votes", authMiddleware, voterOnly, votingController.getMyVotes)
router.get("/voting-status", authMiddleware, voterOnly, votingController.getVotingStatus)

router.get("/election/:id/candidates", authMiddleware, authorizeStaffAndVoters("election_committee", "sao"), votingController.getElectionCandidates)
router.get("/election/:id/details", authMiddleware, authorizeStaffAndVoters("election_committee", "sao"), votingController.getElectionDetails)

module.exports = router