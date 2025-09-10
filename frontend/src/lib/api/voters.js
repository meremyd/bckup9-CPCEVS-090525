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

  // Get voter statistics by department (updated from degree)
  getStatisticsByDepartment: async () => {
    try {
      const response = await api.get('/voters/stats/by-department')
      return response.data
    } catch (error) {
      console.error('Error fetching voter statistics by department:', error)
      throw error
    }
  },

  // Additional methods to support the new voter model structure

  // Get voters by department
  getByDepartment: async (departmentId, params = {}) => {
    try {
      const response = await api.get(`/voters/department/${departmentId}`, { params })
      return response.data
    } catch (error) {
      console.error(`Error fetching voters for department ${departmentId}:`, error)
      throw error
    }
  },

  // Get voters by year level
  getByYearLevel: async (yearLevel, params = {}) => {
    try {
      const response = await api.get(`/voters/year-level/${yearLevel}`, { params })
      return response.data
    } catch (error) {
      console.error(`Error fetching voters for year level ${yearLevel}:`, error)
      throw error
    }
  },

  // Get voters by department and year level
  getByDepartmentAndYear: async (departmentId, yearLevel, params = {}) => {
    try {
      const response = await api.get(`/voters/department/${departmentId}/year/${yearLevel}`, { params })
      return response.data
    } catch (error) {
      console.error(`Error fetching voters for department ${departmentId} and year ${yearLevel}:`, error)
      throw error
    }
  },

  // Activate voter (opposite of deactivate)
  activate: async (id) => {
    try {
      const response = await api.put(`/voters/${id}/activate`)
      return response.data
    } catch (error) {
      console.error(`Error activating voter ${id}:`, error)
      throw error
    }
  },

  // Bulk operations for better efficiency
  bulkToggleOfficerStatus: async (voterIds, makeOfficer = true) => {
    try {
      const response = await api.put('/voters/bulk/toggle-officer', { 
        voterIds, 
        makeOfficer 
      })
      return response.data
    } catch (error) {
      console.error('Error bulk toggling officer status:', error)
      throw error
    }
  },

  bulkActivateDeactivate: async (voterIds, activate = true) => {
    try {
      const response = await api.put('/voters/bulk/activate-deactivate', { 
        voterIds, 
        activate 
      })
      return response.data
    } catch (error) {
      console.error('Error bulk activating/deactivating voters:', error)
      throw error
    }
  },

  // Export voters data
  exportVoters: async (format = 'csv', filters = {}) => {
    try {
      const response = await api.get('/voters/export', { 
        params: { format, ...filters },
        responseType: 'blob' // For file download
      })
      return response.data
    } catch (error) {
      console.error('Error exporting voters:', error)
      throw error
    }
  },

  // Import voters from file
  importVoters: async (file, options = {}) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('options', JSON.stringify(options))
      
      const response = await api.post('/voters/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      return response.data
    } catch (error) {
      console.error('Error importing voters:', error)
      throw error
    }
  },

  // Validate voter data before creating/updating
  validateVoterData: async (voterData) => {
    try {
      const response = await api.post('/voters/validate', voterData)
      return response.data
    } catch (error) {
      console.error('Error validating voter data:', error)
      throw error
    }
  },

  // Check if school ID is available
  checkSchoolIdAvailability: async (schoolId, excludeVoterId = null) => {
    try {
      const params = { schoolId }
      if (excludeVoterId) {
        params.excludeVoterId = excludeVoterId
      }
      const response = await api.get('/voters/check-school-id', { params })
      return response.data
    } catch (error) {
      console.error('Error checking school ID availability:', error)
      throw error
    }
  },

  // Check if email is available
  checkEmailAvailability: async (email, excludeVoterId = null) => {
    try {
      const params = { email }
      if (excludeVoterId) {
        params.excludeVoterId = excludeVoterId
      }
      const response = await api.get('/voters/check-email', { params })
      return response.data
    } catch (error) {
      console.error('Error checking email availability:', error)
      throw error
    }
  },

  // Reset voter password (admin only)
  resetPassword: async (id) => {
    try {
      const response = await api.put(`/voters/${id}/reset-password`)
      return response.data
    } catch (error) {
      console.error(`Error resetting password for voter ${id}:`, error)
      throw error
    }
  },

  // Extend password expiration
  extendPasswordExpiration: async (id, months = 10) => {
    try {
      const response = await api.put(`/voters/${id}/extend-password`, { months })
      return response.data
    } catch (error) {
      console.error(`Error extending password expiration for voter ${id}:`, error)
      throw error
    }
  },

  // Get voter audit logs
  getVoterAuditLogs: async (id, params = {}) => {
    try {
      const response = await api.get(`/voters/${id}/audit-logs`, { params })
      return response.data
    } catch (error) {
      console.error(`Error fetching audit logs for voter ${id}:`, error)
      throw error
    }
  }
}