import api from '../api'

export const positionsAPI = {
  // SSG Position Methods
  ssg: {
    // Get all SSG positions with optional filters
    getAll: async (params = {}) => {
      try {
        const response = await api.get('/positions/ssg', { params })
        return response.data
      } catch (error) {
        console.error('Error fetching SSG positions:', error)
        throw error
      }
    },
    
    // Get SSG position by ID
    getById: async (id) => {
      try {
        const response = await api.get(`/positions/ssg/${id}`)
        return response.data
      } catch (error) {
        console.error(`Error fetching SSG position ${id}:`, error)
        throw error
      }
    },
    
    // Create new SSG position
    create: async (positionData) => {
      try {
        const response = await api.post('/positions/ssg', positionData)
        return response.data
      } catch (error) {
        console.error('Error creating SSG position:', error)
        throw error
      }
    },
    
    // Update SSG position
    update: async (id, positionData) => {
      try {
        const response = await api.put(`/positions/ssg/${id}`, positionData)
        return response.data
      } catch (error) {
        console.error(`Error updating SSG position ${id}:`, error)
        throw error
      }
    },
    
    // Delete SSG position
    delete: async (id) => {
      try {
        const response = await api.delete(`/positions/ssg/${id}`)
        return response.data
      } catch (error) {
        console.error(`Error deleting SSG position ${id}:`, error)
        throw error
      }
    },
    
    // Get positions by SSG election ID
    getByElection: async (ssgElectionId, params = {}) => {
      try {
        const response = await api.get(`/positions/ssg/elections/${ssgElectionId}`, { params })
        return response.data
      } catch (error) {
        console.error(`Error fetching positions for SSG election ${ssgElectionId}:`, error)
        throw error
      }
    },

    // Reorder positions within an SSG election
    reorder: async (ssgElectionId, positionOrders) => {
      try {
        const response = await api.put(`/positions/ssg/elections/${ssgElectionId}/reorder`, { positionOrders })
        return response.data
      } catch (error) {
        console.error(`Error reordering positions for SSG election ${ssgElectionId}:`, error)
        throw error
      }
    },

    // Get SSG position statistics
    getStats: async (positionId) => {
      try {
        const response = await api.get(`/positions/ssg/${positionId}/stats`)
        return response.data
      } catch (error) {
        console.error(`Error fetching SSG position stats for ${positionId}:`, error)
        throw error
      }
    },

    // Check if SSG position can be deleted (no candidates/votes)
    canDelete: async (positionId) => {
      try {
        const response = await api.get(`/positions/ssg/${positionId}/can-delete`)
        return response.data
      } catch (error) {
        console.error(`Error checking if SSG position ${positionId} can be deleted:`, error)
        throw error
      }
    }
  },

  // Departmental Position Methods
  departmental: {
    // Get all departmental positions with optional filters
    getAll: async (params = {}) => {
      try {
        const response = await api.get('/positions/departmental', { params })
        return response.data
      } catch (error) {
        console.error('Error fetching departmental positions:', error)
        throw error
      }
    },
    
    // Get departmental position by ID
    getById: async (id) => {
      try {
        const response = await api.get(`/positions/departmental/${id}`)
        return response.data
      } catch (error) {
        console.error(`Error fetching departmental position ${id}:`, error)
        throw error
      }
    },
    
    // Create new departmental position
    create: async (positionData) => {
      try {
        const response = await api.post('/positions/departmental', positionData)
        return response.data
      } catch (error) {
        console.error('Error creating departmental position:', error)
        throw error
      }
    },
    
    // Update departmental position
    update: async (id, positionData) => {
      try {
        const response = await api.put(`/positions/departmental/${id}`, positionData)
        return response.data
      } catch (error) {
        console.error(`Error updating departmental position ${id}:`, error)
        throw error
      }
    },
    
    // Delete departmental position
    delete: async (id) => {
      try {
        const response = await api.delete(`/positions/departmental/${id}`)
        return response.data
      } catch (error) {
        console.error(`Error deleting departmental position ${id}:`, error)
        throw error
      }
    },
    
    // Get positions by departmental election ID
    getByElection: async (deptElectionId, params = {}) => {
      try {
        const response = await api.get(`/positions/departmental/elections/${deptElectionId}`, { params })
        return response.data
      } catch (error) {
        console.error(`Error fetching positions for departmental election ${deptElectionId}:`, error)
        throw error
      }
    },

    // Reorder positions within a departmental election
    reorder: async (deptElectionId, positionOrders) => {
      try {
        const response = await api.put(`/positions/departmental/elections/${deptElectionId}/reorder`, { positionOrders })
        return response.data
      } catch (error) {
        console.error(`Error reordering positions for departmental election ${deptElectionId}:`, error)
        throw error
      }
    },

    // Get departmental position statistics
    getStats: async (positionId) => {
      try {
        const response = await api.get(`/positions/departmental/${positionId}/stats`)
        return response.data
      } catch (error) {
        console.error(`Error fetching departmental position stats for ${positionId}:`, error)
        throw error
      }
    },

    // Check if departmental position can be deleted (no candidates/votes)
    canDelete: async (positionId) => {
      try {
        const response = await api.get(`/positions/departmental/${positionId}/can-delete`)
        return response.data
      } catch (error) {
        console.error(`Error checking if departmental position ${positionId} can be deleted:`, error)
        throw error
      }
    }
  }
}