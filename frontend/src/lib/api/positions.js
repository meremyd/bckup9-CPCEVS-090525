import api from '../api'

export const positionsAPI = {
  // Get all positions
  getAll: async (params = {}) => {
    const response = await api.get('/positions', { params })
    return response.data
  },
  
  // Get position by ID
  getById: async (id) => {
    const response = await api.get(`/positions/${id}`)
    return response.data
  },
  
  // Create position
  create: async (positionData) => {
    const response = await api.post('/positions', positionData)
    return response.data
  },
  
  // Update position
  update: async (id, positionData) => {
    const response = await api.put(`/positions/${id}`, positionData)
    return response.data
  },
  
  // Delete position
  delete: async (id) => {
    const response = await api.delete(`/positions/${id}`)
    return response.data
  },
  
  // Get positions by election
  getByElection: async (electionId, params = {}) => {
    const response = await api.get(`/elections/${electionId}/positions`, { params })
    return response.data
  }
}