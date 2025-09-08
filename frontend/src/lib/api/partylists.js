import api from '../api'

export const partylistsAPI = {
  // Get all partylists
  getAll: async (params = {}) => {
    const response = await api.get('/partylists', { params })
    return response.data
  },
  
  // Get partylist by ID
  getById: async (id) => {
    const response = await api.get(`/partylists/${id}`)
    return response.data
  },
  
  // Create partylist
  create: async (partylistData) => {
    const response = await api.post('/partylists', partylistData)
    return response.data
  },
  
  // Update partylist
  update: async (id, partylistData) => {
    const response = await api.put(`/partylists/${id}`, partylistData)
    return response.data
  },
  
  // Delete partylist
  delete: async (id) => {
    const response = await api.delete(`/partylists/${id}`)
    return response.data
  },
  
  // Get partylists by election
  getByElection: async (electionId, params = {}) => {
    const response = await api.get(`/elections/${electionId}/partylists`, { params })
    return response.data
  }
}