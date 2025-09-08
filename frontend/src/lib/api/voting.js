import api from '../api'

export const votingAPI = {
  // Get active ballot for election
  getActiveBallot: async (electionId) => {
    const response = await api.get(`/voting/ballot/${electionId}`)
    return response.data
  },
  
  // Submit ballot
  submitBallot: async (ballotData) => {
    const response = await api.post('/voting/submit-ballot', ballotData)
    return response.data
  },
  
  // Get voting history
  getVotingHistory: async (params = {}) => {
    const response = await api.get('/voting/history', { params })
    return response.data
  },
  
  // Verify vote
  verifyVote: async (verificationData) => {
    const response = await api.post('/voting/verify', verificationData)
    return response.data
  }
}