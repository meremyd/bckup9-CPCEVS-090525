const express = require('express')
const ElectionParticipationController = require('../controllers/electionParticipationController')
const { authMiddleware, authorizeRoles } = require('../middleware/authMiddleware') 
const router = express.Router()

// Voter routes (require authentication)
router.post('/confirm', authMiddleware, ElectionParticipationController.confirmParticipation)
router.post('/withdraw', authMiddleware, ElectionParticipationController.withdrawParticipation)
router.get('/status/:electionId', authMiddleware, ElectionParticipationController.checkVoterStatus)
router.get('/voter/:voterId/history', authMiddleware, ElectionParticipationController.getVoterHistory)

// Admin/Committee/SAO routes (require elevated privileges)
router.get('/election/:electionId/participants', 
  authMiddleware, 
  authorizeRoles("admin", "election_committee", "sao"), 
  ElectionParticipationController.getElectionParticipants
)

router.get('/election/:electionId/stats', 
  authMiddleware, 
  authorizeRoles("admin", "election_committee", "sao"), 
  ElectionParticipationController.getElectionStats
)

router.post('/mark-voted', 
  authMiddleware, 
  authorizeRoles("admin", "election_committee", "sao"), 
  ElectionParticipationController.markAsVoted
)

module.exports = router