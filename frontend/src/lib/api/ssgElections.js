import api from '../api'

export const ssgElectionsAPI = {
  // Get all SSG elections with filtering and pagination
  getAll: async (params = {}) => {
    try {
      const response = await api.get('/ssg-elections', { params })
      return response.data
    } catch (error) {
      console.error('Error fetching SSG elections:', error)
      throw error
    }
  },

  // Get SSG election by ID
  getById: async (id) => {
    try {
      const response = await api.get(`/ssg-elections/${id}`)
      return response.data
    } catch (error) {
      console.error(`Error fetching SSG election ${id}:`, error)
      throw error
    }
  },

  // Get SSG dashboard summary
  getDashboardSummary: async () => {
    try {
      const response = await api.get('/ssg-elections/dashboard')
      return response.data
    } catch (error) {
      console.error('Error fetching SSG dashboard summary:', error)
      throw error
    }
  },

  // Get upcoming SSG elections
  getUpcoming: async (params = {}) => {
    try {
      const response = await api.get('/ssg-elections/upcoming', { params })
      return response.data
    } catch (error) {
      console.error('Error fetching upcoming SSG elections:', error)
      throw error
    }
  },

  // Get SSG elections available for voting (for registered voters)
  getForVoting: async (voterId = null) => {
    try {
      const url = voterId ? `/ssg-elections/for-voting/${voterId}` : '/ssg-elections/for-voting'
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
      const response = await api.get(`/ssg-elections/${id}/statistics`)
      return response.data
    } catch (error) {
      console.error(`Error fetching SSG election statistics for ${id}:`, error)
      throw error
    }
  },

  // Get SSG election results (accessible by registered voters)
  getResults: async (id) => {
    try {
      const response = await api.get(`/ssg-elections/${id}/results`)
      return response.data
    } catch (error) {
      console.error(`Error fetching SSG election results for ${id}:`, error)
      throw error
    }
  },

  // Create new SSG election
  create: async (electionData) => {
    try {
      const response = await api.post('/ssg-elections', electionData)
      return response.data
    } catch (error) {
      console.error('Error creating SSG election:', error)
      throw error
    }
  },

  // Update SSG election
  update: async (id, electionData) => {
    try {
      const response = await api.put(`/ssg-elections/${id}`, electionData)
      return response.data
    } catch (error) {
      console.error(`Error updating SSG election ${id}:`, error)
      throw error
    }
  },

  // Toggle SSG election status
  toggleStatus: async (id, status) => {
    try {
      const response = await api.patch(`/ssg-elections/${id}/status`, { status })
      return response.data
    } catch (error) {
      console.error(`Error toggling SSG election status for ${id}:`, error)
      throw error
    }
  },

  // Delete SSG election
  delete: async (id) => {
    try {
      const response = await api.delete(`/ssg-elections/${id}`)
      return response.data
    } catch (error) {
      console.error(`Error deleting SSG election ${id}:`, error)
      throw error
    }
  }
}