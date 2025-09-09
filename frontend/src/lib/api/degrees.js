import api from '../api'

export const degreesAPI = {
  // Get all degrees (public)
  getAll: async (params = {}) => {
    try {
      const response = await api.get('/degrees', { params })
      return response.data
    } catch (error) {
      console.error('Error fetching degrees:', error)
      throw error
    }
  },
  
  // Get degree by ID (public)
  getById: async (id) => {
    try {
      const response = await api.get(`/degrees/${id}`)
      return response.data
    } catch (error) {
      console.error('Error fetching degree:', error)
      throw error
    }
  },
  
  // Create degree (admin only)
  create: async (degreeData) => {
    try {
      const response = await api.post('/degrees', degreeData)
      return response.data
    } catch (error) {
      console.error('Error creating degree:', error)
      throw error
    }
  },
  
  // Update degree (admin only)
  update: async (id, degreeData) => {
    try {
      const response = await api.put(`/degrees/${id}`, degreeData)
      return response.data
    } catch (error) {
      console.error('Error updating degree:', error)
      throw error
    }
  },
  
  // Delete degree (admin only)
  delete: async (id, force = false) => {
    try {
      const response = await api.delete(`/degrees/${id}`, { 
        params: { force: force.toString() } 
      })
      return response.data
    } catch (error) {
      console.error('Error deleting degree:', error)
      throw error
    } 

  },
  
  // Bulk create degrees (admin only) 
  bulkCreate: async (degrees) => {
    try {
      const response = await api.post('/degrees/bulk', { degrees })   
      return response.data
    } catch (error) {
      console.error('Error bulk creating degrees:', error)
      throw error
    } 
  },

  // Get degree statistics (admin and election committee)   
  getStatistics: async () => {
    try {
      const response = await api.get('/degrees/statistics/overview')  
      return response.data
    } catch (error) {
      console.error('Error fetching degree statistics:', error)
      throw error
    }   
  }
}