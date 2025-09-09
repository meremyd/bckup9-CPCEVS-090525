const express = require('express')
const ElectionParticipationController = require('../controllers/electionParticipationController')
const { authMiddleware, authorizeRoles } = require('../middleware/authMiddleware') 
const router = express.Router()

router.post('/confirm', authMiddleware, ElectionParticipationController.confirmParticipation)
router.post('/withdraw', authMiddleware, ElectionParticipationController.withdrawParticipation)
router.get('/voter/:voterId/status/:electionId', authMiddleware, ElectionParticipationController.checkVoterStatus)
router.get('/voter/:voterId/history', authMiddleware, ElectionParticipationController.getVoterHistory)

router.get('/election/:electionId/participants', authMiddleware, authorizeRoles("election_committee", "sao"), ElectionParticipationController.getElectionParticipants)
router.get('/election/:electionId/stats', authMiddleware, authorizeRoles("election_committee", "sao"), ElectionParticipationController.getElectionStats)
router.post('/mark-voted', authMiddleware, authorizeRoles("election_committee","sao"), ElectionParticipationController.markAsVoted)

module.exports = router