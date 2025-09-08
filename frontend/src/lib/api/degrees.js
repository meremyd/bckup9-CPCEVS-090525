import api from '../api'

export const degreesAPI = {
  // Get all degrees
  getAll: async (params = {}) => {
    const response = await api.get('/degrees', { params })
    return response.data
  },
  
  // Get degree by ID
  getById: async (id) => {
    const response = await api.get(`/degrees/${id}`)
    return response.data
  },
  
  // Create degree
  create: async (degreeData) => {
    const response = await api.post('/degrees', degreeData)
    return response.data
  },
  
  // Update degree
  update: async (id, degreeData) => {
    const response = await api.put(`/degrees/${id}`, degreeData)
    return response.data
  },
  
  // Delete degree
  delete: async (id, force = false) => {
    const response = await api.delete(`/degrees/${id}`, { params: { force } })
    return response.data
  },
  
  // Get degree statistics
  getStatistics: async () => {
    const response = await api.get('/degrees/statistics/overview')
    return response.data
  },
  
  // Get departments
  getDepartments: async () => {
    const response = await api.get('/degrees/departments/all')
    return response.data
  },
  
  // Bulk create degrees
  bulkCreate: async (degreesData) => {
    const response = await api.post('/degrees/bulk', degreesData)
    return response.data
  },
  
  // Search degrees
  search: async (params = {}) => {
    const response = await api.get('/degrees/search', { params })
    return response.data
  }
}