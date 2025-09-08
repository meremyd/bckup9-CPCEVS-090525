import api from '../api'

export const auditLogsAPI = {
  // Get all audit logs
  getAll: async (params = {}) => {
    const response = await api.get('/audit-logs', { params })
    return response.data
  },
  
  // Get audit log by ID
  getById: async (id) => {
    const response = await api.get(`/audit-logs/${id}`)
    return response.data
  },
  
  // Get audit log statistics
  getStatistics: async () => {
    const response = await api.get('/audit-logs/stats/summary')
    return response.data
  }
}