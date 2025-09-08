import api from '../api'

export const ballotAPI = {
  // Admin/Committee - Get all ballots with pagination and filtering
  getAllBallots: async (params = {}) => {
    const { page = 1, limit = 10, electionId, status } = params
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(electionId && { electionId }),
      ...(status && { status })
    })
    
    const response = await api.get(`/ballots?${queryParams}`)
    return response.data
  },

  // Get ballot by ID (Admin/Committee/Owner)
  getBallotById: async (id) => {
    const response = await api.get(`/ballots/${id}`)
    return response.data
  },

  // Get ballot statistics (Admin/Committee/SAO)
  getBallotStatistics: async (electionId = null) => {
    const params = electionId ? `?electionId=${electionId}` : ''
    const response = await api.get(`/ballots/statistics${params}`)
    return response.data
  },

  // Delete ballot (Admin only)
  deleteBallot: async (id) => {
    const response = await api.delete(`/ballots/${id}`)
    return response.data
  },

  // Voter - Start new ballot for election
  startBallot: async (electionId) => {
    const response = await api.post('/ballots/start', { electionId })
    return response.data
  },

  // Voter - Submit completed ballot
  submitBallot: async (ballotId) => {
    const response = await api.put(`/ballots/${ballotId}/submit`)
    return response.data
  },

  // Voter - Abandon current ballot
  abandonBallot: async (ballotId) => {
    const response = await api.delete(`/ballots/${ballotId}/abandon`)
    return response.data
  },

  // Voter - Get voting status for specific election
  getVoterBallotStatus: async (electionId) => {
    const response = await api.get(`/ballots/status/${electionId}`)
    return response.data
  },

  // Voter - Get ballot with votes for review
  getBallotWithVotes: async (ballotId) => {
    const response = await api.get(`/ballots/${ballotId}/review`)
    return response.data
  },

  // Utility functions for frontend state management
  
  // Check if voter can vote in election
  canVoteInElection: async (electionId) => {
    try {
      const status = await ballotAPI.getVoterBallotStatus(electionId)
      return status.canVote && !status.hasVoted
    } catch (error) {
      console.error('Error checking voting eligibility:', error)
      return false
    }
  },

  // Get active ballot for voter (if any)
  getActiveBallot: async (electionId) => {
    try {
      const status = await ballotAPI.getVoterBallotStatus(electionId)
      if (status.ballot && !status.ballot.isSubmitted) {
        return status.ballot
      }
      return null
    } catch (error) {
      console.error('Error getting active ballot:', error)
      return null
    }
  }
}