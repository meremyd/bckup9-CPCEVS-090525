import api from '../api'

export const dashboardAPI = {
  // Get admin dashboard data - FIXED PATH
  getAdminDashboard: async () => {
    const response = await api.get('/dashboard/admin/dashboard')
    return response.data
  },
  
  // Get election committee dashboard data - FIXED PATH
  getCommitteeDashboard: async () => {
    const response = await api.get('/dashboard/committee/dashboard')
    return response.data
  },
  
  // Get SAO dashboard data - FIXED PATH
  getSAODashboard: async () => {
    const response = await api.get('/dashboard/sao/dashboard')
    return response.data
  },

  // NEW: Get voter dashboard data
  getVoterDashboard: async () => {
    const response = await api.get('/dashboard/voter/dashboard')
    return response.data
  }
}