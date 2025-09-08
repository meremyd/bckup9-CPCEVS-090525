import api from '../api'

export const chatSupportAPI = {
  // Submit support request (public)
  submit: async (data) => {
    const response = await api.post('/chat-support', data)
    return response.data
  },
  
  // Get all support requests (admin only)
  getAll: async (params = {}) => {
    const response = await api.get('/chat-support', { params })
    return response.data
  },
  
  // Get support request by ID (admin only)
  getById: async (id) => {
    const response = await api.get(`/chat-support/${id}`)
    return response.data
  },
  
  // Update support request status (admin only)
  updateStatus: async (id, updateData) => {
    const response = await api.put(`/chat-support/${id}`, updateData)
    return response.data
  },
  
  // Get support statistics (admin only)
  getStatistics: async () => {
    const response = await api.get('/chat-support/stats/summary')
    return response.data
  }
}