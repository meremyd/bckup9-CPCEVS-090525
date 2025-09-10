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

  // Get SSG dashboard summary
  getDashboardSummary: async () => {
    const response = await api.get('/ssgElections/dashboard')
    return response.data
  },

  // Get upcoming SSG elections
  getUpcoming: async () => {
    const response = await api.get('/ssgElections/upcoming')
    return response.data
  },

  // Get SSG election statistics
  getStatistics: async (id) => {
    const response = await api.get(`/ssgElections/${id}/statistics`)
    return response.data
  },

  // Get SSG election results
  getResults: async (id) => {
    const response = await api.get(`/ssgElections/${id}/results`)
    return response.data
  },

  // Create new SSG election
  create: async (electionData) => {
    const response = await api.post('/ssgElections', electionData)
    return response.data
  },

  // Update SSG election
  update: async (id, electionData) => {
    const response = await api.put(`/ssgElections/${id}`, electionData)
    return response.data
  },

  // Toggle SSG election status
  toggleStatus: async (id, status) => {
    const response = await api.patch(`/ssgElections/${id}/status`, { status })
    return response.data
  },

  // Delete SSG election
  delete: async (id) => {
    const response = await api.delete(`/ssgElections/${id}`)
    return response.data
  }
}