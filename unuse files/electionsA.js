import api from '../api'

export const electionsAPI = {
  // Get all elections
  getAll: async (params = {}) => {
    const response = await api.get('/elections', { params })
    return response.data
  },
  
  // Get election by ID
  getById: async (id) => {
    const response = await api.get(`/elections/${id}`)
    return response.data
  },
  
  // Create election
  create: async (electionData) => {
    const response = await api.post('/elections', electionData)
    return response.data
  },
  
  // Update election
  update: async (id, electionData) => {
    const response = await api.put(`/elections/${id}`, electionData)
    return response.data
  },
  
  // Delete election
  delete: async (id) => {
    const response = await api.delete(`/elections/${id}`)
    return response.data
  },
  
  // Get election statistics
  getStatistics: async (id) => {
    const response = await api.get(`/elections/${id}/statistics`)
    return response.data
  },
  
  // Get election results
  getResults: async (id) => {
    const response = await api.get(`/elections/${id}/results`)
    return response.data
  },
  
  // Toggle election status
  toggleStatus: async (id, statusData) => {
    const response = await api.patch(`/elections/${id}/toggle-status`, statusData)
    return response.data
  },
  
  // Get dashboard summary
  getDashboardSummary: async () => {
    const response = await api.get('/elections/dashboard/summary')
    return response.data
  }
}