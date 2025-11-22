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
  }, 
  // Get total visits
  getTotalVisits: async () => {
    const response = await api.get('/audit-logs/stats/total-visits')
    return response.data
  },
  
  // Get active users
  getActiveUsers: async () => {
    const response = await api.get('/audit-logs/stats/active-users')
    return response.data
  },
  
  getUserAuditLogs: async (params = {}) => {
    const response = await api.get('/audit-logs/user', { params })
    return response.data
  },
  
  exportAuditLogs: async (params = {}) => {
    const response = await api.get('/audit-logs/export', { params })
    return response.data
  }

}