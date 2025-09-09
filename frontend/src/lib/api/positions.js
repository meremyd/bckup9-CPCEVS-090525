import api from '../api'

export const positionsAPI = {
  // Get all positions with optional filters
  getAll: async (params = {}) => {
    try {
      const response = await api.get('/positions', { params })
      return response.data
    } catch (error) {
      console.error('Error fetching positions:', error)
      throw error
    }
  },
  
  // Get position by ID
  getById: async (id) => {
    try {
      const response = await api.get(`/positions/${id}`)
      return response.data
    } catch (error) {
      console.error(`Error fetching position ${id}:`, error)
      throw error
    }
  },
  
  // Create new position
  create: async (positionData) => {
    try {
      const response = await api.post('/positions', positionData)
      return response.data
    } catch (error) {
      console.error('Error creating position:', error)
      throw error
    }
  },
  
  // Update position
  update: async (id, positionData) => {
    try {
      const response = await api.put(`/positions/${id}`, positionData)
      return response.data
    } catch (error) {
      console.error(`Error updating position ${id}:`, error)
      throw error
    }
  },
  
  // Delete position
  delete: async (id) => {
    try {
      const response = await api.delete(`/positions/${id}`)
      return response.data
    } catch (error) {
      console.error(`Error deleting position ${id}:`, error)
      throw error
    }
  },
  
  // Get positions by election ID
  getByElection: async (electionId, params = {}) => {
    try {
      const response = await api.get(`/positions/elections/${electionId}/positions`, { params })
      return response.data
    } catch (error) {
      console.error(`Error fetching positions for election ${electionId}:`, error)
      throw error
    }
  },

  // Reorder positions within an election
  reorder: async (electionId, positionOrders) => {
    try {
      const response = await api.put(`/positions/elections/${electionId}/positions/reorder`, { positionOrders })
      return response.data
    } catch (error) {
      console.error(`Error reordering positions for election ${electionId}:`, error)
      throw error
    }
  },

  // Get position statistics
  getStats: async (positionId) => {
    try {
      const response = await api.get(`/positions/${positionId}/stats`)
      return response.data
    } catch (error) {
      console.error(`Error fetching position stats for ${positionId}:`, error)
      throw error
    }
  },

  // Check if position can be deleted (no candidates/votes)
  canDelete: async (positionId) => {
    try {
      const response = await api.get(`/positions/${positionId}/can-delete`)
      return response.data
    } catch (error) {
      console.error(`Error checking if position ${positionId} can be deleted:`, error)
      throw error
    }
  }
}