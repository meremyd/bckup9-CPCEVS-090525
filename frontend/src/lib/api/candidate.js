import api from '../api'

export const candidatesAPI = {
  // Get all candidates
  getAll: async (params = {}) => {
    const response = await api.get('/candidates', { params })
    return response.data
  },
  
  // Get candidate by ID
  getById: async (id) => {
    const response = await api.get(`/candidates/${id}`)
    return response.data
  },
  
  // Create candidate
  create: async (candidateData) => {
    const response = await api.post('/candidates', candidateData)
    return response.data
  },
  
  // Update candidate
  update: async (id, candidateData) => {
    const response = await api.put(`/candidates/${id}`, candidateData)
    return response.data
  },
  
  // Delete candidate
  delete: async (id) => {
    const response = await api.delete(`/candidates/${id}`)
    return response.data
  },
  
  // Get candidates by election
  getByElection: async (electionId, params = {}) => {
    const response = await api.get(`/elections/${electionId}/candidates`, { params })
    return response.data
  }
}