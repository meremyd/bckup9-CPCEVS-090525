import api from '../api'

export const chatSupportAPI = {
  // Submit support request (public)
  submit: async (data) => {
    const response = await api.post('/chat-support', data)
    return response.data
  },
  
  // Get all support requests with filtering (admin only)
  getAll: async (params = {}) => {
    const response = await api.get('/chat-support', { params })
    return response.data
  },
  
  // Get support request by ID (admin only)
  getById: async (id) => {
    const response = await api.get(`/chat-support/${id}`)
    return response.data
  },
  
  // Update support request status and response (admin only)
  updateStatus: async (id, updateData) => {
    const response = await api.put(`/chat-support/${id}`, updateData)
    return response.data
  },
  
  // Delete support request (admin only)
  delete: async (id) => {
    const response = await api.delete(`/chat-support/${id}`)
    return response.data
  },
  
  // Get comprehensive support statistics (admin only)
  getStatistics: async () => {
    const response = await api.get('/chat-support/stats/summary')
    return response.data
  },
  
  // Bulk update support requests status (admin only)
  bulkUpdateStatus: async (data) => {
    const response = await api.post('/chat-support/bulk-update', data)
    return response.data
  },
  
  // Export support requests with filtering (admin only)
  export: async (params = {}) => {
    const response = await api.get('/chat-support/export', { 
      params,
      responseType: params.format === 'csv' ? 'blob' : 'json'
    })
    return response.data
  },

  // Get departments for form dropdown
  getDepartments: async () => {
    const response = await api.get('/departments')
    return response.data
  },

  // Validate school ID (optional helper)
  validateSchoolId: async (schoolId) => {
    const response = await api.get(`/voters/${schoolId}/validate`)
    return response.data
  }
}