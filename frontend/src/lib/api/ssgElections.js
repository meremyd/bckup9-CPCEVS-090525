import api from '../api'

export const ssgElectionsAPI = {
  // Get all SSG elections with filtering and pagination
  getAll: async (params = {}) => {
    try {
      const response = await api.get('/ssgElections', { params })
      return response.data
    } catch (error) {
      console.error('Error fetching SSG elections:', error)
      throw error
    }
  },

  // Get SSG election by ID
  getById: async (id) => {
    try {
      const response = await api.get(`/ssgElections/${id}`)
      return response.data
    } catch (error) {
      console.error(`Error fetching SSG election ${id}:`, error)
      throw error
    }
  },

  // Get SSG dashboard summary
  getDashboardSummary: async () => {
    try {
      const response = await api.get('/ssgElections/dashboard')
      return response.data
    } catch (error) {
      console.error('Error fetching SSG dashboard summary:', error)
      throw error
    }
  },

  // Get upcoming SSG elections
  getUpcoming: async (params = {}) => {
    try {
      const response = await api.get('/ssgElections/upcoming', { params })
      return response.data
    } catch (error) {
      console.error('Error fetching upcoming SSG elections:', error)
      throw error
    }
  },

  // Get SSG elections available for voting (for registered voters)
  getForVoting: async (voterId = null) => {
    try {
      const url = voterId ? `/ssgElections/for-voting/${voterId}` : '/ssgElections/for-voting'
      const response = await api.get(url)
      return response.data
    } catch (error) {
      console.error('Error fetching SSG elections for voting:', error)
      throw error
    }
  },

  // Get SSG election statistics (accessible by registered voters)
  getStatistics: async (id) => {
    try {
      const response = await api.get(`/ssgElections/${id}/statistics`)
      return response.data
    } catch (error) {
      console.error(`Error fetching SSG election statistics for ${id}:`, error)
      throw error
    }
  },

  // Get SSG election results (accessible by registered voters)
  getResults: async (id) => {
    try {
      const response = await api.get(`/ssgElections/${id}/results`)
      return response.data
    } catch (error) {
      console.error(`Error fetching SSG election results for ${id}:`, error)
      throw error
    }
  },

  // Create new SSG election
  create: async (electionData) => {
    try {
      const response = await api.post('/ssgElections', electionData)
      return response.data
    } catch (error) {
      console.error('Error creating SSG election:', error)
      throw error
    }
  },

  // Update SSG election
  update: async (id, electionData) => {
    try {
      const response = await api.put(`/ssgElections/${id}`, electionData)
      return response.data
    } catch (error) {
      console.error(`Error updating SSG election ${id}:`, error)
      throw error
    }
  },

  // Toggle SSG election status
  toggleStatus: async (id, status) => {
    try {
      const response = await api.patch(`/ssgElections/${id}/status`, { status })
      return response.data
    } catch (error) {
      console.error(`Error toggling SSG election status for ${id}:`, error)
      throw error
    }
  },

  // Delete SSG election
  delete: async (id) => {
    try {
      const response = await api.delete(`/ssgElections/${id}`)
      return response.data
    } catch (error) {
      console.error(`Error deleting SSG election ${id}:`, error)
      throw error
    }
  },

  // Add these methods to your ssgElectionsAPI object

// Get SSG election candidates
getCandidates: async (id, params = {}) => {
  try {
    const response = await api.get(`/ssgElections/${id}/candidates`, { params })
    return response.data
  } catch (error) {
    console.error(`Error fetching SSG election candidates for ${id}:`, error)
    throw error
  }
},

// Get SSG election partylists
getPartylists: async (id, params = {}) => {
  try {
    const response = await api.get(`/ssgElections/${id}/partylists`, { params })
    return response.data
  } catch (error) {
    console.error(`Error fetching SSG election partylists for ${id}:`, error)
    throw error
  }
},

// Get SSG election voter participants
getParticipants: async (id, params = {}) => {
  try {
    const response = await api.get(`/ssgElections/${id}/participants`, { params })
    return response.data
  } catch (error) {
    console.error(`Error fetching SSG election participants for ${id}:`, error)
    throw error
  }
},

// Get SSG election voter turnout
getTurnout: async (id) => {
  try {
    const response = await api.get(`/ssgElections/${id}/turnout`)
    return response.data
  } catch (error) {
    console.error(`Error fetching SSG election turnout for ${id}:`, error)
    throw error
  }
},

// Get SSG election ballots
getBallots: async (id, params = {}) => {
  try {
    const response = await api.get(`/ssgElections/${id}/ballots`, { params })
    return response.data
  } catch (error) {
    console.error(`Error fetching SSG election ballots for ${id}:`, error)
    throw error
  }
},

// Get SSG election positions
getPositions: async (id, params = {}) => {
  try {
    const response = await api.get(`/ssgElections/${id}/positions`, { params })
    return response.data
  } catch (error) {
    console.error(`Error fetching SSG election positions for ${id}:`, error)
    throw error
  }
}

}