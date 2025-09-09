const express = require("express")
const ballotController = require("../controllers/ballotController")
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware")
const router = express.Router()

router.get("/",authMiddleware,authorizeRoles("election_committee"),ballotController.getAllBallots)
router.get("/statistics",authMiddleware,authorizeRoles("election_committee", "sao"),ballotController.getBallotStatistics)
router.get("/:id",authMiddleware,authorizeRoles("election_committee", "voter"),ballotController.getBallotById)
router.delete("/:id",authMiddleware,authorizeRoles("election_committee"),ballotController.deleteBallot)
router.post("/start",authMiddleware,authorizeRoles("voter"),ballotController.startBallot)
router.put("/:id/submit",authMiddleware,authorizeRoles("voter"),ballotController.submitBallot)
router.delete("/:id/abandon",authMiddleware,authorizeRoles("voter"),ballotController.abandonBallot)
router.get("/status/:electionId",authMiddleware,authorizeRoles("voter"),ballotController.getVoterBallotStatus)
router.get("/:id/review",authMiddleware,authorizeRoles("voter"),ballotController.getBallotWithVotes)

module.exports = router