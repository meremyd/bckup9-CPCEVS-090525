import api from '../api'

export const votersAPI = {
  // Get all voters
  getAll: async (params = {}) => {
    const response = await api.get('/voters', { params })
    return response.data
  },
  
  // Get registered voters only
  getRegistered: async (params = {}) => {
    const response = await api.get('/voters/registered', { params })
    return response.data
  },
  
  // Get voter by ID
  getById: async (id) => {
    const response = await api.get(`/voters/${id}`)
    return response.data
  },
  
  // Lookup voter by school ID
  lookupBySchoolId: async (schoolId) => {
    const response = await api.get(`/voters/lookup/${schoolId}`)
    return response.data
  },
  
  // Create voter
  create: async (voterData) => {
    const response = await api.post('/voters', voterData)
    return response.data
  },
  
  // Update voter
  update: async (id, voterData) => {
    const response = await api.put(`/voters/${id}`, voterData)
    return response.data
  },
  
  // Deactivate voter
  deactivate: async (id) => {
    const response = await api.put(`/voters/${id}/deactivate`)
    return response.data
  },
  
  // Delete voter
  delete: async (id) => {
    const response = await api.delete(`/voters/${id}`)
    return response.data
  },
  
  // Get voter statistics
  getStatistics: async () => {
    const response = await api.get('/voters/stats/summary')
    return response.data
  }
}