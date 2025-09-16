
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
  
  // Bulk create voters
  bulkCreate: async (votersData) => {
    try {
      const response = await api.post('/voters/bulk', votersData)
      return response.data
    } catch (error) {
      console.error('Error bulk creating voters:', error)
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
  
  // Update voter year level (election committee only)
  updateYearLevel: async (id, yearLevel) => {
    try {
      const response = await api.put(`/voters/${id}/year-level`, { yearLevel })
      return response.data
    } catch (error) {
      // Handle specific authorization errors
      if (error.response?.status === 403) {
        throw new Error('Only election committee members can update year levels')
      }
      console.error(`Error updating year level for voter ${id}:`, error)
      throw error
    }
  },

  // Toggle officer status
  toggleOfficerStatus: async (id) => {
    try {
      const response = await api.put(`/voters/${id}/toggle-officer`)
      return response.data
    } catch (error) {
      // Handle specific authorization errors
      if (error.response?.status === 403) {
        throw new Error('Only admin or election committee members can update officer status')
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

  // Get voter statistics by department
  getStatisticsByDepartment: async () => {
    try {
      const response = await api.get('/voters/stats/by-department')
      return response.data
    } catch (error) {
      console.error('Error fetching voter statistics by department:', error)
      throw error
    }
  },

  // Get voters by department code
  getByDepartmentCode: async (departmentCode, params = {}) => {
    try {
      const response = await api.get(`/voters/department-code/${departmentCode}`, { params })
      return response.data
    } catch (error) {
      console.error(`Error fetching voters for department ${departmentCode}:`, error)
      throw error
    }
  },

  // Get registered voters by department code
  getRegisteredByDepartmentCode: async (departmentCode, params = {}) => {
    try {
      const response = await api.get(`/voters/department-code/${departmentCode}/registered`, { params })
      return response.data
    } catch (error) {
      console.error(`Error fetching registered voters for department ${departmentCode}:`, error)
      throw error
    }
  },

  // Get officers by department code
  getOfficersByDepartmentCode: async (departmentCode, params = {}) => {
    try {
      const response = await api.get(`/voters/department-code/${departmentCode}/officers`, { params })
      return response.data
    } catch (error) {
      console.error(`Error fetching officers for department ${departmentCode}:`, error)
      throw error
    }
  },

  // Get voters by college
  getByCollege: async (college, params = {}) => {
    try {
      const response = await api.get(`/voters/college/${college}`, { params })
      return response.data
    } catch (error) {
      console.error(`Error fetching voters for college ${college}:`, error)
      throw error
    }
  },

  // Export voters
  exportVoters: async (params = {}) => {
    try {
      const response = await api.get('/voters/export/all', { 
        params,
        responseType: params.format === 'json' ? 'json' : 'blob'
      })
      return response
    } catch (error) {
      console.error('Error exporting voters:', error)
      throw error
    }
  },

  // Export registered voters
  exportRegisteredVoters: async (params = {}) => {
    try {
      const response = await api.get('/voters/export/registered', { 
        params,
        responseType: params.format === 'json' ? 'json' : 'blob'
      })
      return response
    } catch (error) {
      console.error('Error exporting registered voters:', error)
      throw error
    }
  },

  // Get voter profile (for authenticated voters)
  getProfile: async () => {
    try {
      const response = await api.get('/voters/profile')
      return response.data
    } catch (error) {
      console.error('Error fetching voter profile:', error)
      throw error
    }
  },

  // Update voter profile (for authenticated voters)
  updateProfile: async (profileData) => {
    try {
      const response = await api.put('/voters/profile', profileData)
      return response.data
    } catch (error) {
      console.error('Error updating voter profile:', error)
      throw error
    }
  },

  // Validate voter data before submission
  validateVoterData: (voterData) => {
    const errors = []
    
    if (!voterData.schoolId) {
      errors.push('School ID is required')
    } else if (isNaN(Number(voterData.schoolId))) {
      errors.push('School ID must be a valid number')
    }
    
    if (!voterData.firstName?.trim()) {
      errors.push('First name is required')
    }
    
    if (!voterData.lastName?.trim()) {
      errors.push('Last name is required')
    }
    
    if (!voterData.departmentId) {
      errors.push('Department is required')
    }
    
    if (!voterData.yearLevel) {
      errors.push('Year level is required')
    } else if (![1, 2, 3, 4].includes(Number(voterData.yearLevel))) {
      errors.push('Year level must be between 1 and 4')
    }
    
    if (voterData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(voterData.email)) {
      errors.push('Invalid email format')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  },

  // Validate bulk voter data
  validateBulkVoterData: (votersData) => {
    if (!Array.isArray(votersData)) {
      return {
        isValid: false,
        errors: ['Data must be an array of voter objects'],
        validationResults: []
      }
    }

    const validationResults = votersData.map((voter, index) => {
      const validation = votersAPI.validateVoterData(voter)
      return {
        index,
        schoolId: voter.schoolId,
        ...validation
      }
    })

    const hasErrors = validationResults.some(result => !result.isValid)
    const globalErrors = []

    // Check for duplicate school IDs within the batch
    const schoolIds = votersData.map(v => v.schoolId).filter(Boolean)
    const duplicateIds = schoolIds.filter((id, index) => schoolIds.indexOf(id) !== index)
    if (duplicateIds.length > 0) {
      globalErrors.push(`Duplicate school IDs found: ${[...new Set(duplicateIds)].join(', ')}`)
    }

    return {
      isValid: !hasErrors && globalErrors.length === 0,
      errors: globalErrors,
      validationResults
    }
  }
}