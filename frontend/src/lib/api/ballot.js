import api from '../api'

export const ballotAPI = {
  // SSG Ballot APIs
  
  // Admin/Committee/SAO - Get all SSG ballots with pagination and filtering
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
  
  // Admin/Committee/SAO - Get all Departmental ballots with pagination and filtering
  getAllDepartmentalBallots: async (params = {}) => {
    const { page = 1, limit = 10, electionId, status, positionId } = params
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(electionId && { electionId }),
      ...(status && { status }),
      ...(positionId && { positionId })
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

  // Get available positions for departmental voting (Class officers only)
  getAvailablePositionsForVoting: async (electionId) => {
    const response = await api.get(`/ballots/departmental/${electionId}/available-positions`)
    return response.data
  },

  // Get next position for departmental voting (Class officers only)
  getNextPositionForVoting: async (electionId) => {
    const response = await api.get(`/ballots/departmental/${electionId}/next-position`)
    return response.data
  },

  // Delete Departmental ballot (Admin only)
  deleteDepartmentalBallot: async (id) => {
    const response = await api.delete(`/ballots/departmental/${id}`)
    return response.data
  },

  // Voter - Start new Departmental ballot for election and position (Class officers only)
  startDepartmentalBallot: async (electionId, positionId) => {
    const response = await api.post('/ballots/departmental/start', { electionId, positionId })
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

  // Voter - Get Departmental voting status for specific election and position
  getVoterDepartmentalBallotStatus: async (electionId, positionId = null) => {
    const path = positionId ? `/ballots/departmental/status/${electionId}/${positionId}` : `/ballots/departmental/status/${electionId}`
    const response = await api.get(path)
    return response.data
  },

  // Voter - Get Departmental ballot with votes for review
  getDepartmentalBallotWithVotes: async (ballotId) => {
    const response = await api.get(`/ballots/departmental/${ballotId}/review`)
    return response.data
  },

  // General Ballot APIs
  
  // Get ballot by ID (Admin/Committee/SAO/Owner)
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
  canVoteInDepartmentalElection: async (electionId, positionId = null) => {
    try {
      const status = await ballotAPI.getVoterDepartmentalBallotStatus(electionId, positionId)
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
  getActiveDepartmentalBallot: async (electionId, positionId = null) => {
    try {
      const status = await ballotAPI.getVoterDepartmentalBallotStatus(electionId, positionId)
      if (status.ballot && !status.ballot.isSubmitted) {
        return status.ballot
      }
      return null
    } catch (error) {
      console.error('Error getting active Departmental ballot:', error)
      return null
    }
  },

  // Get voting progress for departmental elections
  getDepartmentalVotingProgress: async (electionId) => {
    try {
      const availablePositions = await ballotAPI.getAvailablePositionsForVoting(electionId)
      return {
        totalPositions: availablePositions.totalPositions,
        votedPositions: availablePositions.votedPositions,
        remainingPositions: availablePositions.availablePositions.length,
        isComplete: availablePositions.isComplete,
        nextPosition: availablePositions.availablePositions[0] || null
      }
    } catch (error) {
      console.error('Error getting departmental voting progress:', error)
      return {
        totalPositions: 0,
        votedPositions: 0,
        remainingPositions: 0,
        isComplete: false,
        nextPosition: null
      }
    }
  },

  // Check if all positions have been voted for in departmental election
  hasCompletedDepartmentalVoting: async (electionId) => {
    try {
      const progress = await ballotAPI.getDepartmentalVotingProgress(electionId)
      return progress.isComplete
    } catch (error) {
      console.error('Error checking departmental voting completion:', error)
      return false
    }
  },

  // Get all ballots for admin dashboard (combined)
  getAllBallots: async (params = {}) => {
    const { page = 1, limit = 10, type = 'all', status, electionId } = params
    
    try {
      let ssgBallots = []
      let departmentalBallots = []
      
      if (type === 'all' || type === 'ssg') {
        const ssgResult = await ballotAPI.getAllSSGBallots({ page, limit, electionId, status })
        ssgBallots = ssgResult.ballots.map(ballot => ({ ...ballot, type: 'SSG' }))
      }
      
      if (type === 'all' || type === 'departmental') {
        const deptResult = await ballotAPI.getAllDepartmentalBallots({ page, limit, electionId, status })
        departmentalBallots = deptResult.ballots.map(ballot => ({ ...ballot, type: 'Departmental' }))
      }
      
      const allBallots = [...ssgBallots, ...departmentalBallots]
      
      return {
        ballots: allBallots,
        total: allBallots.length,
        totalPages: Math.ceil(allBallots.length / limit),
        currentPage: page
      }
    } catch (error) {
      console.error('Error getting all ballots:', error)
      return {
        ballots: [],
        total: 0,
        totalPages: 0,
        currentPage: page
      }
    }
  },

  // Get combined ballot statistics for dashboard
  getBallotStatistics: async (type = 'all', electionId = null) => {
    try {
      let stats = {
        totalBallots: 0,
        submittedBallots: 0,
        pendingBallots: 0,
        turnoutRate: 0,
        ssgStats: null,
        departmentalStats: null
      }
      
      if (type === 'all' || type === 'ssg') {
        const ssgStats = await ballotAPI.getSSGBallotStatistics(electionId)
        stats.ssgStats = ssgStats
        if (type === 'ssg') {
          stats.totalBallots = ssgStats.totalBallots
          stats.submittedBallots = ssgStats.submittedBallots
          stats.pendingBallots = ssgStats.pendingBallots
          stats.turnoutRate = ssgStats.turnoutRate
        }
      }
      
      if (type === 'all' || type === 'departmental') {
        const deptStats = await ballotAPI.getDepartmentalBallotStatistics(electionId)
        stats.departmentalStats = deptStats
        if (type === 'departmental') {
          stats.totalBallots = deptStats.totalBallots
          stats.submittedBallots = deptStats.submittedBallots
          stats.pendingBallots = deptStats.pendingBallots
          stats.turnoutRate = deptStats.turnoutRate
        }
      }
      
      if (type === 'all' && stats.ssgStats && stats.departmentalStats) {
        stats.totalBallots = stats.ssgStats.totalBallots + stats.departmentalStats.totalBallots
        stats.submittedBallots = stats.ssgStats.submittedBallots + stats.departmentalStats.submittedBallots
        stats.pendingBallots = stats.ssgStats.pendingBallots + stats.departmentalStats.pendingBallots
        stats.turnoutRate = stats.totalBallots > 0 ? Math.round((stats.submittedBallots / stats.totalBallots) * 100) : 0
      }
      
      return stats
    } catch (error) {
      console.error('Error getting ballot statistics:', error)
      return {
        totalBallots: 0,
        submittedBallots: 0,
        pendingBallots: 0,
        turnoutRate: 0,
        ssgStats: null,
        departmentalStats: null
      }
    }
  },

  // Export ballot data (Admin/Committee)
  exportBallotData: async (params = {}) => {
    const { type = 'all', electionId, format = 'csv' } = params
    const queryParams = new URLSearchParams({
      format,
      ...(type !== 'all' && { type }),
      ...(electionId && { electionId })
    })
    
    const response = await api.get(`/ballots/export?${queryParams}`, {
      responseType: 'blob'
    })
    return response.data
  }
}