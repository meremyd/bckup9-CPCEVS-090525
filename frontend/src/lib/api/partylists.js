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
  
  // Get partylist logo
  getLogo: async (id) => {
    try {
      const response = await api.get(`/partylists/${id}/logo`, {
        responseType: 'blob' // For binary data
      })
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },
  
  // Get partylist platform document
  getPlatform: async (id) => {
    try {
      const response = await api.get(`/partylists/${id}/platform`, {
        responseType: 'blob' // For binary data
      })
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
  
  // Get partylists by SSG election ID
  getBySSGElection: async (ssgElectionId) => {
    try {
      const response = await api.get(`/partylists/ssg-election/${ssgElectionId}`)
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