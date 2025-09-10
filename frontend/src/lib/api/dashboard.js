import api from '../api'

export const dashboardAPI = {
  // Get admin dashboard data
  getAdminDashboard: async () => {
    const response = await api.get('/dashboard/admin/dashboard')
    return response.data
  },
  
  // Get election committee dashboard data
  getCommitteeDashboard: async () => {
    const response = await api.get('/dashboard/committee/dashboard')
    return response.data
  },
  
  // Get SAO dashboard data
  getSAODashboard: async () => {
    const response = await api.get('/dashboard/sao/dashboard')
    return response.data
  },

  // Get voter dashboard data
  getVoterDashboard: async () => {
    const response = await api.get('/dashboard/voter/dashboard')
    return response.data
  }
}