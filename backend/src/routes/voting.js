const express = require("express")
const VotingController = require("../controllers/votingController")
const { authMiddleware, voterAuthMiddleware, authorizeRoles } = require("../middleware/authMiddleware")
const router = express.Router()

router.use('/voter', voterAuthMiddleware)
router.get("/voter/ssg-elections/active", VotingController.getActiveSSGElections)
router.post("/voter/ssg-elections/vote", VotingController.castSSGVote)
router.get("/voter/ssg-elections/status", VotingController.getSSGVotingStatus)
router.get("/voter/ssg-elections/my-votes", VotingController.getMySSGVotes)
router.get("/voter/departmental-elections/active", VotingController.getActiveDepartmentalElections)
router.post("/voter/departmental-elections/vote", VotingController.castDepartmentalVote)
router.get("/voter/departmental-elections/status", VotingController.getDepartmentalVotingStatus)
router.get("/voter/departmental-elections/my-votes", VotingController.getMyDepartmentalVotes)
router.get("/voter/ssg-elections/:id/live-results", VotingController.getSSGElectionLiveResultsForVoter)
router.get("/voter/departmental-elections/:id/live-results", VotingController.getDepartmentalElectionLiveResultsForVoter)


router.use('/user', authMiddleware)
router.get("/user/ssg-elections/:id/details", authorizeRoles("election_committee", "sao"), VotingController.getSSGElectionDetails)
router.get("/user/ssg-elections/:id/candidates", authorizeRoles("election_committee", "sao"), VotingController.getSSGElectionCandidates)
router.get("/user/departmental-elections/:id/details", authorizeRoles("election_committee", "sao"), VotingController.getDepartmentalElectionDetails)
router.get("/user/departmental-elections/:id/candidates", authorizeRoles("election_committee", "sao"), VotingController.getDepartmentalElectionCandidates)
router.get("/user/ssg-elections/:id/live-results", authorizeRoles("election_committee", "sao"), VotingController.getSSGElectionLiveResults)
router.get("/user/departmental-elections/:id/live-results", authorizeRoles("election_committee", "sao"), VotingController.getDepartmentalElectionLiveResults)

router.get("/", authMiddleware, (req, res) => {
  if (req.user.userType === 'voter') {
    res.redirect('/voting/voter/')
  } else {
    res.redirect('/voting/user/')
  }
})

module.exports = router