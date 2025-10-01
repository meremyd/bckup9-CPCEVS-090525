import api from '../api'

export const positionsAPI = {
  // ==================== STAFF/ADMIN SSG POSITION METHODS ====================
  ssg: {
    // Get all SSG positions with optional filters
    getAll: async (params = {}) => {
      try {
        const response = await api.get('/positions/user/ssg', { params })
        return response.data
      } catch (error) {
        console.error('Error fetching SSG positions:', error)
        throw error
      }
    },
    
    // Get SSG position by ID
    getById: async (id) => {
      try {
        const response = await api.get(`/positions/user/ssg/${id}`)
        return response.data
      } catch (error) {
        console.error(`Error fetching SSG position ${id}:`, error)
        throw error
      }
    },
    
    // Create new SSG position 
    create: async (positionData) => {
      try {
        const response = await api.post('/positions/user/ssg', positionData)
        return response.data
      } catch (error) {
        console.error('Error creating SSG position:', error)
        throw error
      }
    },
    
    // Update SSG position 
    update: async (id, positionData) => {
      try {
        const response = await api.put(`/positions/user/ssg/${id}`, positionData)
        return response.data
      } catch (error) {
        console.error(`Error updating SSG position ${id}:`, error)
        throw error
      }
    },
    
    // Delete SSG position
    delete: async (id) => {
      try {
        const response = await api.delete(`/positions/user/ssg/${id}`)
        return response.data
      } catch (error) {
        console.error(`Error deleting SSG position ${id}:`, error)
        throw error
      }
    },
    
    // Get positions by SSG election ID
    getByElection: async (ssgElectionId, params = {}) => {
      try {
        const response = await api.get(`/positions/user/ssg/elections/${ssgElectionId}`, { params })
        return response.data
      } catch (error) {
        console.error(`Error fetching positions for SSG election ${ssgElectionId}:`, error)
        throw error
      }
    },

    // Reorder positions within an SSG election
    reorder: async (ssgElectionId, positions) => {
      try {
        const response = await api.put(`/positions/user/ssg/elections/${ssgElectionId}/reorder`, { positions })
        return response.data
      } catch (error) {
        console.error(`Error reordering positions for SSG election ${ssgElectionId}:`, error)
        throw error
      }
    },

    // Get SSG position statistics
    getStats: async (positionId) => {
      try {
        const response = await api.get(`/positions/user/ssg/${positionId}/stats`)
        return response.data
      } catch (error) {
        console.error(`Error fetching SSG position stats for ${positionId}:`, error)
        throw error
      }
    },

    // Check if SSG position can be deleted (no candidates/votes)
    canDelete: async (positionId) => {
      try {
        const response = await api.get(`/positions/user/ssg/${positionId}/can-delete`)
        return response.data
      } catch (error) {
        console.error(`Error checking if SSG position ${positionId} can be deleted:`, error)
        throw error
      }
    },

    // Get candidate limits for positions in SSG election
    getCandidateLimits: async (ssgElectionId) => {
      try {
        const response = await api.get(`/positions/user/ssg/elections/${ssgElectionId}/candidate-limits`)
        return response.data
      } catch (error) {
        console.error(`Error fetching candidate limits for SSG election ${ssgElectionId}:`, error)
        throw error
      }
    },

    // Validate if SSG position can be deleted with detailed breakdown
    validateDeletion: async (positionId) => {
      try {
        const response = await api.get(`/positions/user/ssg/${positionId}/validate-deletion`)
        return response.data
      } catch (error) {
        console.error(`Error validating deletion for SSG position ${positionId}:`, error)
        throw error
      }
    }
  },

  // ==================== STAFF/ADMIN DEPARTMENTAL POSITION METHODS ====================
  departmental: {
    // Get all departmental positions with optional filters
    getAll: async (params = {}) => {
      try {
        const response = await api.get('/positions/user/departmental', { params })
        return response.data
      } catch (error) {
        console.error('Error fetching departmental positions:', error)
        throw error
      }
    },
    
    // Get departmental position by ID
    getById: async (id) => {
      try {
        const response = await api.get(`/positions/user/departmental/${id}`)
        return response.data
      } catch (error) {
        console.error(`Error fetching departmental position ${id}:`, error)
        throw error
      }
    },
    
    // Create new departmental position
    create: async (positionData) => {
      try {
        const response = await api.post('/positions/user/departmental', positionData)
        return response.data
      } catch (error) {
        console.error('Error creating departmental position:', error)
        throw error
      }
    },
    
    // Update departmental position
    update: async (id, positionData) => {
      try {
        const response = await api.put(`/positions/user/departmental/${id}`, positionData)
        return response.data
      } catch (error) {
        console.error(`Error updating departmental position ${id}:`, error)
        throw error
      }
    },
    
    // Delete departmental position
    delete: async (id) => {
      try {
        const response = await api.delete(`/positions/user/departmental/${id}`)
        return response.data
      } catch (error) {
        console.error(`Error deleting departmental position ${id}:`, error)
        throw error
      }
    },
    
    // Get positions by departmental election ID
    getByElection: async (deptElectionId, params = {}) => {
      try {
        const response = await api.get(`/positions/user/departmental/elections/${deptElectionId}`, { params })
        return response.data
      } catch (error) {
        console.error(`Error fetching positions for departmental election ${deptElectionId}:`, error)
        throw error
      }
    },

    // Reorder positions within a departmental election
    reorder: async (deptElectionId, positions) => {
      try {
        const response = await api.put(`/positions/user/departmental/elections/${deptElectionId}/reorder`, { positions })
        return response.data
      } catch (error) {
        console.error(`Error reordering positions for departmental election ${deptElectionId}:`, error)
        throw error
      }
    },

    // Get departmental position statistics
    getStats: async (positionId) => {
      try {
        const response = await api.get(`/positions/user/departmental/${positionId}/stats`)
        return response.data
      } catch (error) {
        console.error(`Error fetching departmental position stats for ${positionId}:`, error)
        throw error
      }
    },

    // Check if departmental position can be deleted (no candidates/votes)
    canDelete: async (positionId) => {
      try {
        const response = await api.get(`/positions/user/departmental/${positionId}/can-delete`)
        return response.data
      } catch (error) {
        console.error(`Error checking if departmental position ${positionId} can be deleted:`, error)
        throw error
      }
    }
  },

  // ==================== VOTER SSG POSITION METHODS (READ-ONLY) ====================
  voter: {
    ssg: {
      // Get all SSG positions (Voter view)
      getAll: async (params = {}) => {
        try {
          const response = await api.get('/positions/voter/ssg', { params })
          return response.data
        } catch (error) {
          console.error('Error fetching SSG positions (voter):', error)
          throw error
        }
      },

      // Get SSG position by ID (Voter view)
      getById: async (id) => {
        try {
          const response = await api.get(`/positions/voter/ssg/${id}`)
          return response.data
        } catch (error) {
          console.error(`Error fetching SSG position ${id} (voter):`, error)
          throw error
        }
      },

      // Get positions by SSG election ID (Voter view)
      getByElection: async (ssgElectionId, params = {}) => {
        try {
          const response = await api.get(`/positions/voter/ssg/elections/${ssgElectionId}`, { params })
          return response.data
        } catch (error) {
          console.error(`Error fetching positions for SSG election ${ssgElectionId} (voter):`, error)
          throw error
        }
      },

      // Get SSG position statistics (Voter view)
      getStats: async (positionId) => {
        try {
          const response = await api.get(`/positions/voter/ssg/${positionId}/stats`)
          return response.data
        } catch (error) {
          console.error(`Error fetching SSG position stats for ${positionId} (voter):`, error)
          throw error
        }
      }
    },

    // ==================== VOTER DEPARTMENTAL POSITION METHODS (READ-ONLY) ====================
    departmental: {
      // Get all departmental positions (Voter view)
      getAll: async (params = {}) => {
        try {
          const response = await api.get('/positions/voter/departmental', { params })
          return response.data
        } catch (error) {
          console.error('Error fetching departmental positions (voter):', error)
          throw error
        }
      },

      // Get departmental position by ID (Voter view)
      getById: async (id) => {
        try {
          const response = await api.get(`/positions/voter/departmental/${id}`)
          return response.data
        } catch (error) {
          console.error(`Error fetching departmental position ${id} (voter):`, error)
          throw error
        }
      },

      // Get positions by departmental election ID (Voter view)
      getByElection: async (deptElectionId, params = {}) => {
        try {
          const response = await api.get(`/positions/voter/departmental/elections/${deptElectionId}`, { params })
          return response.data
        } catch (error) {
          console.error(`Error fetching positions for departmental election ${deptElectionId} (voter):`, error)
          throw error
        }
      },

      // Get departmental position statistics (Voter view)
      getStats: async (positionId) => {
        try {
          const response = await api.get(`/positions/voter/departmental/${positionId}/stats`)
          return response.data
        } catch (error) {
          console.error(`Error fetching departmental position stats for ${positionId} (voter):`, error)
          throw error
        }
      }
    }
  },

  // ==================== UTILITY METHODS (UNCHANGED) ====================
  utils: {
    // Get position by ID (works for both types - tries staff first)
    getPositionById: async (id) => {
      try {
        // Try SSG first
        try {
          return await positionsAPI.ssg.getById(id)
        } catch (ssgError) {
          // If SSG fails, try departmental
          return await positionsAPI.departmental.getById(id)
        }
      } catch (error) {
        console.error(`Error fetching position ${id}:`, error)
        throw error
      }
    },

    // Get all positions (both SSG and departmental)
    getAllPositions: async (params = {}) => {
      try {
        const [ssgResponse, deptResponse] = await Promise.allSettled([
          positionsAPI.ssg.getAll(params),
          positionsAPI.departmental.getAll(params)
        ])

        const ssgPositions = ssgResponse.status === 'fulfilled' ? ssgResponse.value.data : []
        const deptPositions = deptResponse.status === 'fulfilled' ? deptResponse.value.data : []

        return {
          success: true,
          message: "All positions retrieved successfully",
          data: {
            ssg: ssgPositions,
            departmental: deptPositions,
            total: ssgPositions.length + deptPositions.length
          }
        }
      } catch (error) {
        console.error('Error fetching all positions:', error)
        throw error
      }
    },

    // Search positions across both types
    searchPositions: async (searchTerm, params = {}) => {
      try {
        const searchParams = {
          ...params,
          search: searchTerm
        }

        const [ssgResponse, deptResponse] = await Promise.allSettled([
          positionsAPI.ssg.getAll(searchParams),
          positionsAPI.departmental.getAll(searchParams)
        ])

        const ssgPositions = ssgResponse.status === 'fulfilled' ? ssgResponse.value.data : []
        const deptPositions = deptResponse.status === 'fulfilled' ? deptResponse.value.data : []

        // Filter positions by search term (client-side fallback)
        const filteredSSG = ssgPositions.filter(pos => 
          pos.positionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (pos.description && pos.description.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        
        const filteredDept = deptPositions.filter(pos => 
          pos.positionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (pos.description && pos.description.toLowerCase().includes(searchTerm.toLowerCase()))
        )

        return {
          success: true,
          message: `Search results for "${searchTerm}"`,
          data: {
            ssg: filteredSSG,
            departmental: filteredDept,
            total: filteredSSG.length + filteredDept.length
          }
        }
      } catch (error) {
        console.error(`Error searching positions for "${searchTerm}":`, error)
        throw error
      }
    }
  }
}