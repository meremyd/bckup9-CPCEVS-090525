const express = require("express")
const votingController = require("../controllers/votingController") // You'll need this controller
const { authMiddleware, voterOnly, authorizeStaffAndVoters } = require("../middleware/authMiddleware")
const router = express.Router()

// Routes accessible to voters only
router.get("/active-elections", authMiddleware, voterOnly, votingController.getActiveElections)
router.post("/cast-vote", authMiddleware, voterOnly, votingController.castVote)
router.get("/my-votes", authMiddleware, voterOnly, votingController.getMyVotes)
router.get("/voting-status", authMiddleware, voterOnly, votingController.getVotingStatus)

// Routes accessible to both staff and voters
router.get("/election/:id/candidates", authMiddleware, authorizeStaffAndVoters("admin", "election_committee"), votingController.getElectionCandidates)
router.get("/election/:id/details", authMiddleware, authorizeStaffAndVoters("admin", "election_committee"), votingController.getElectionDetails)

module.exports = router