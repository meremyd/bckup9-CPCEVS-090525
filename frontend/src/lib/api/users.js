import api from '../api'

export const usersAPI = {
  // Get all users
  getAll: async (params = {}) => {
    const response = await api.get('/users', { params })
    return response.data
  },
  
  // Get user by ID
  getById: async (id) => {
    const response = await api.get(`/users/${id}`)
    return response.data
  },
  
  // Create user
  create: async (userData) => {
    const response = await api.post('/users', userData)
    return response.data
  },
  
  // Update user
  update: async (id, userData) => {
    const response = await api.put(`/users/${id}`, userData)
    return response.data
  },
  
  // Delete user
  delete: async (id) => {
    const response = await api.delete(`/users/${id}`)
    return response.data
  },
  
  // Get user statistics
  getStatistics: async () => {
    const response = await api.get('/users/stats/summary')
    return response.data
  }
}