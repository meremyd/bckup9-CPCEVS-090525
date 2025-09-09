import api from '../api'

export const votersAPI = {
  // Get all voters
  getAll: async (params = {}) => {
    try {
      const response = await api.get('/voters', { params })
      return response.data
    } catch (error) {
      console.error('Error fetching all voters:', error)
      throw error
    }
  },
  
  // Get registered voters only
  getRegistered: async (params = {}) => {
    try {
      const response = await api.get('/voters/registered', { params })
      return response.data
    } catch (error) {
      console.error('Error fetching registered voters:', error)
      throw error
    }
  },
  
  // Get officers only
  getOfficers: async (params = {}) => {
    try {
      const response = await api.get('/voters/officers', { params })
      return response.data
    } catch (error) {
      console.error('Error fetching officers:', error)
      throw error
    }
  },
  
  // Get voter by ID
  getById: async (id) => {
    try {
      const response = await api.get(`/voters/${id}`)
      return response.data
    } catch (error) {
      console.error(`Error fetching voter ${id}:`, error)
      throw error
    }
  },
  
  // Lookup voter by school ID
  lookupBySchoolId: async (schoolId) => {
    try {
      const response = await api.get(`/voters/lookup/${schoolId}`)
      return response.data
    } catch (error) {
      console.error(`Error looking up voter with school ID ${schoolId}:`, error)
      throw error
    }
  },
  
  // Create voter
  create: async (voterData) => {
    try {
      const response = await api.post('/voters', voterData)
      return response.data
    } catch (error) {
      console.error('Error creating voter:', error)
      throw error
    }
  },
  
  // Update voter
  update: async (id, voterData) => {
    try {
      const response = await api.put(`/voters/${id}`, voterData)
      return response.data
    } catch (error) {
      console.error(`Error updating voter ${id}:`, error)
      throw error
    }
  },
  
  // Toggle officer status - Only for election committee members
  toggleOfficerStatus: async (id) => {
    try {
      const response = await api.put(`/voters/${id}/toggle-officer`)
      return response.data
    } catch (error) {
      // Handle specific authorization errors
      if (error.response?.status === 403) {
        throw new Error('Only election committee members can update officer status')
      }
      console.error(`Error toggling officer status for voter ${id}:`, error)
      throw error
    }
  },
  
  // Deactivate voter
  deactivate: async (id) => {
    try {
      const response = await api.put(`/voters/${id}/deactivate`)
      return response.data
    } catch (error) {
      console.error(`Error deactivating voter ${id}:`, error)
      throw error
    }
  },
  
  // Delete voter
  delete: async (id) => {
    try {
      const response = await api.delete(`/voters/${id}`)
      return response.data
    } catch (error) {
      console.error(`Error deleting voter ${id}:`, error)
      throw error
    }
  },
  
  // Get voter statistics
  getStatistics: async () => {
    try {
      const response = await api.get('/voters/stats/summary')
      return response.data
    } catch (error) {
      console.error('Error fetching voter statistics:', error)
      throw error
    }
  },

  // Get voter statistics by degree
  getStatisticsByDegree: async () => {
    try {
      const response = await api.get('/voters/stats/by-degree')
      return response.data
    } catch (error) {
      console.error('Error fetching voter statistics by degree:', error)
      throw error
    }
  }
}