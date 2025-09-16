import api from '../api'

export const ssgElectionsAPI = {
  // Get all SSG elections with filtering and pagination
  getAll: async (params = {}) => {
    const response = await api.get('/ssgElections', { params })
    return response.data
  },

  // Get SSG election by ID
  getById: async (id) => {
    const response = await api.get(`/ssgElections/${id}`)
    return response.data
  },

  // Get SSG election overview with comprehensive stats
  getOverview: async (id) => {
    const response = await api.get(`/ssgElections/${id}/overview`)
    return response.data
  },

  // Create new SSG election (Admin/Election Committee only)
  create: async (electionData) => {
    const response = await api.post('/ssgElections', electionData)
    return response.data
  },

  // Update SSG election (Admin/Election Committee only)
  update: async (id, electionData) => {
    const response = await api.put(`/ssgElections/${id}`, electionData)
    return response.data
  },

  // Delete SSG election (Admin only)
  delete: async (id) => {
    const response = await api.delete(`/ssgElections/${id}`)
    return response.data
  },

  // Get SSG election results
  getResults: async (id) => {
    const response = await api.get(`/ssgElections/${id}/results`)
    return response.data
  },

  // Get SSG election statistics
  getStatistics: async (id) => {
    const response = await api.get(`/ssgElections/${id}/statistics`)
    return response.data
  },

  // Get SSG election candidates
  getCandidates: async (id, params = {}) => {
    const response = await api.get(`/ssgElections/${id}/candidates`, { params })
    return response.data
  },

  // Get SSG election positions
  getPositions: async (id, params = {}) => {
    const response = await api.get(`/ssgElections/${id}/positions`, { params })
    return response.data
  },

  // Get SSG election partylists
  getPartylists: async (id, params = {}) => {
    const response = await api.get(`/ssgElections/${id}/partylists`, { params })
    return response.data
  },

  // Get SSG election voter participants
  getVoterParticipants: async (id, params = {}) => {
    const response = await api.get(`/ssgElections/${id}/participants`, { params })
    return response.data
  },

  // Get SSG election voter turnout
  getVoterTurnout: async (id) => {
    const response = await api.get(`/ssgElections/${id}/turnout`)
    return response.data
  },

  // Get SSG election ballots
  getBallots: async (id, params = {}) => {
    const response = await api.get(`/ssgElections/${id}/ballots`, { params })
    return response.data
  },

  // Toggle SSG election status
  toggleStatus: async (id, status) => {
    const response = await api.patch(`/ssgElections/${id}/status`, { status })
    return response.data
  },

  // Dashboard and summary functions
  getDashboardSummary: async () => {
    const response = await api.get('/ssgElections/dashboard')
    return response.data
  },

  getUpcoming: async (params = {}) => {
    const response = await api.get('/ssgElections/upcoming', { params })
    return response.data
  },

  getForVoting: async (voterId = null) => {
    const endpoint = voterId ? `/ssgElections/for-voting/${voterId}` : '/ssgElections/for-voting'
    const response = await api.get(endpoint)
    return response.data
  },

  // Get candidates for voter view
  getCandidatesForVoter: async (electionId) => {
    const response = await api.get(`/ssgElections/${electionId}/candidates/voter`)
    return response.data
  },

  // Utility functions for frontend state management
  isElectionActive: (election) => {
    if (!election || election.status !== 'active') return false
    
    const now = new Date()
    const electionDate = new Date(election.electionDate)
    
    return electionDate.toDateString() === now.toDateString() || electionDate <= now
  },

  formatElectionForVoter: (election, eligibility = null) => {
    return {
      id: election._id,
      title: election.title,
      ssgElectionId: election.ssgElectionId,
      status: election.status,
      electionDate: election.electionDate,
      type: 'SSG',
      eligibility,
      description: election.description
    }
  },

  // Helper function to extract count from API responses
  getCountFromResponse: (response, countKeys = ['length', 'total', 'count']) => {
    if (Array.isArray(response)) {
      return response.length
    }
    
    if (response && typeof response === 'object') {
      // Check data property first
      if (response.data) {
        if (Array.isArray(response.data)) {
          return response.data.length
        }
        // Check for count properties in data object
        for (const key of countKeys) {
          if (response.data[key] !== undefined) {
            const value = Array.isArray(response.data[key]) ? response.data[key].length : Number(response.data[key]) || 0
            return value
          }
        }
      }
      
      // Check for count properties in root response
      for (const key of countKeys) {
        if (response[key] !== undefined) {
          const value = Array.isArray(response[key]) ? response[key].length : Number(response[key]) || 0
          return value
        }
      }
      
      // Check for common data array properties
      const dataKeys = ['candidates', 'positions', 'partylists', 'participants', 'ballots', 'results']
      for (const key of dataKeys) {
        if (response[key] && Array.isArray(response[key])) {
          return response[key].length
        }
      }
      
      // Check for summary properties
      if (response.summary) {
        for (const key of countKeys) {
          if (response.summary[key] !== undefined) {
            return Number(response.summary[key]) || 0
          }
        }
      }
    }
    
    return 0
  }
}