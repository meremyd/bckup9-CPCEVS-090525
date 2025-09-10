import api from '../api'

export const ballotAPI = {
  // SSG Ballot APIs
  
  // Admin/Committee - Get all SSG ballots with pagination and filtering
  getAllSSGBallots: async (params = {}) => {
    const { page = 1, limit = 10, electionId, status } = params
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(electionId && { electionId }),
      ...(status && { status })
    })
    
    const response = await api.get(`/ballots/ssg?${queryParams}`)
    return response.data
  },

  // Get SSG ballot statistics (Admin/Committee/SAO)
  getSSGBallotStatistics: async (electionId = null) => {
    const params = electionId ? `?electionId=${electionId}` : ''
    const response = await api.get(`/ballots/ssg/statistics${params}`)
    return response.data
  },

  // Delete SSG ballot (Admin only)
  deleteSSGBallot: async (id) => {
    const response = await api.delete(`/ballots/ssg/${id}`)
    return response.data
  },

  // Voter - Start new SSG ballot for election
  startSSGBallot: async (electionId) => {
    const response = await api.post('/ballots/ssg/start', { electionId })
    return response.data
  },

  // Voter - Submit completed SSG ballot
  submitSSGBallot: async (ballotId) => {
    const response = await api.put(`/ballots/ssg/${ballotId}/submit`)
    return response.data
  },

  // Voter - Abandon current SSG ballot
  abandonSSGBallot: async (ballotId) => {
    const response = await api.delete(`/ballots/ssg/${ballotId}/abandon`)
    return response.data
  },

  // Voter - Get SSG voting status for specific election
  getVoterSSGBallotStatus: async (electionId) => {
    const response = await api.get(`/ballots/ssg/status/${electionId}`)
    return response.data
  },

  // Voter - Get SSG ballot with votes for review
  getSSGBallotWithVotes: async (ballotId) => {
    const response = await api.get(`/ballots/ssg/${ballotId}/review`)
    return response.data
  },

  // Departmental Ballot APIs
  
  // Admin/Committee - Get all Departmental ballots with pagination and filtering
  getAllDepartmentalBallots: async (params = {}) => {
    const { page = 1, limit = 10, electionId, status } = params
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(electionId && { electionId }),
      ...(status && { status })
    })
    
    const response = await api.get(`/ballots/departmental?${queryParams}`)
    return response.data
  },

  // Get Departmental ballot statistics (Admin/Committee/SAO)
  getDepartmentalBallotStatistics: async (electionId = null) => {
    const params = electionId ? `?electionId=${electionId}` : ''
    const response = await api.get(`/ballots/departmental/statistics${params}`)
    return response.data
  },

  // Delete Departmental ballot (Admin only)
  deleteDepartmentalBallot: async (id) => {
    const response = await api.delete(`/ballots/departmental/${id}`)
    return response.data
  },

  // Voter - Start new Departmental ballot for election (Class officers only)
  startDepartmentalBallot: async (electionId) => {
    const response = await api.post('/ballots/departmental/start', { electionId })
    return response.data
  },

  // Voter - Submit completed Departmental ballot
  submitDepartmentalBallot: async (ballotId) => {
    const response = await api.put(`/ballots/departmental/${ballotId}/submit`)
    return response.data
  },

  // Voter - Abandon current Departmental ballot
  abandonDepartmentalBallot: async (ballotId) => {
    const response = await api.delete(`/ballots/departmental/${ballotId}/abandon`)
    return response.data
  },

  // Voter - Get Departmental voting status for specific election
  getVoterDepartmentalBallotStatus: async (electionId) => {
    const response = await api.get(`/ballots/departmental/status/${electionId}`)
    return response.data
  },

  // Voter - Get Departmental ballot with votes for review
  getDepartmentalBallotWithVotes: async (ballotId) => {
    const response = await api.get(`/ballots/departmental/${ballotId}/review`)
    return response.data
  },

  // General Ballot APIs
  
  // Get ballot by ID (Admin/Committee/Owner)
  getBallotById: async (id) => {
    const response = await api.get(`/ballots/${id}`)
    return response.data
  },

  // Utility functions for frontend state management
  
  // Check if voter can vote in SSG election
  canVoteInSSGElection: async (electionId) => {
    try {
      const status = await ballotAPI.getVoterSSGBallotStatus(electionId)
      return status.canVote && !status.hasVoted
    } catch (error) {
      console.error('Error checking SSG voting eligibility:', error)
      return false
    }
  },

  // Check if voter can vote in Departmental election
  canVoteInDepartmentalElection: async (electionId) => {
    try {
      const status = await ballotAPI.getVoterDepartmentalBallotStatus(electionId)
      return status.canVote && !status.hasVoted
    } catch (error) {
      console.error('Error checking Departmental voting eligibility:', error)
      return false
    }
  },

  // Get active SSG ballot for voter (if any)
  getActiveSSGBallot: async (electionId) => {
    try {
      const status = await ballotAPI.getVoterSSGBallotStatus(electionId)
      if (status.ballot && !status.ballot.isSubmitted) {
        return status.ballot
      }
      return null
    } catch (error) {
      console.error('Error getting active SSG ballot:', error)
      return null
    }
  },

  // Get active Departmental ballot for voter (if any)
  getActiveDepartmentalBallot: async (electionId) => {
    try {
      const status = await ballotAPI.getVoterDepartmentalBallotStatus(electionId)
      if (status.ballot && !status.ballot.isSubmitted) {
        return status.ballot
      }
      return null
    } catch (error) {
      console.error('Error getting active Departmental ballot:', error)
      return null
    }
  }
}