import api from '../api'

export const partylistsAPI = {
  // Get all partylists with optional filtering
  getAll: async (params = {}) => {
    try {
      const response = await api.get('/partylists', { params })
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },
  
  // Get partylist by ID with candidates and statistics
  getById: async (id) => {
    try {
      const response = await api.get(`/partylists/${id}`)
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },
  
  // Create new partylist
  create: async (partylistData) => {
    try {
      const response = await api.post('/partylists', partylistData)
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },
  
  // Update partylist
  update: async (id, partylistData) => {
    try {
      const response = await api.put(`/partylists/${id}`, partylistData)
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },
  
  // Delete partylist
  delete: async (id, force = false) => {
    try {
      const params = force ? { force: true } : {}
      const response = await api.delete(`/partylists/${id}`, { params })
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },
  
  // Get partylists by election ID
  getByElection: async (electionId) => {
    try {
      const response = await api.get(`/partylists/election/${electionId}`)
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },
  
  // Get detailed partylist statistics
  getStatistics: async (id) => {
    try {
      const response = await api.get(`/partylists/${id}/statistics`)
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  }
}