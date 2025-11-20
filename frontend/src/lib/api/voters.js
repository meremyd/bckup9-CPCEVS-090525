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
  
  // Create voter - UPDATED: Remove required fields validation
  create: async (voterData) => {
    try {
      // Clean the data - only send fields that have values
      const cleanedData = {
        schoolId: voterData.schoolId,
        firstName: voterData.firstName,
        lastName: voterData.lastName,
        departmentId: voterData.departmentId
      }
      
      // Add optional fields only if they have values
      if (voterData.middleName && voterData.middleName.trim()) {
        cleanedData.middleName = voterData.middleName.trim()
      }

      if (voterData.sex) {
        cleanedData.sex = voterData.sex
      }
      
      if (voterData.yearLevel) {
        cleanedData.yearLevel = voterData.yearLevel
      }
      
      if (voterData.email && voterData.email.trim()) {
        cleanedData.email = voterData.email.trim()
      }
      
      if (voterData.birthdate) {
        cleanedData.birthdate = voterData.birthdate
      }
      
      const response = await api.post('/voters', cleanedData)
      return response.data
    } catch (error) {
      console.error('Error creating voter:', error)
      throw error
    }
  },
  
  // Bulk create voters - FIXED: Proper data structure
  bulkCreate: async (votersData) => {
    try {
      // Ensure we're sending the correct structure
      const requestData = {
        voters: Array.isArray(votersData) ? votersData : votersData.voters
      }
      
      // Clean each voter's data
      requestData.voters = requestData.voters.map(voter => {
        const cleanedVoter = {
          schoolId: voter.schoolId,
          firstName: voter.firstName,
          lastName: voter.lastName,
          departmentId: voter.departmentId
        }
        
        // Add optional fields only if they have values
        if (voter.middleName && voter.middleName.trim()) {
          cleanedVoter.middleName = voter.middleName.trim()
        }

        if (voter.sex) {
          cleanedVoter.sex = voter.sex
        }
        
        if (voter.yearLevel) {
          cleanedVoter.yearLevel = voter.yearLevel
        }
        
        if (voter.email && voter.email.trim()) {
          cleanedVoter.email = voter.email.trim()
        }
        
        if (voter.birthdate) {
          cleanedVoter.birthdate = voter.birthdate
        }
        
        return cleanedVoter
      })
      
      console.log('Sending bulk create request:', requestData)
      
      const response = await api.post('/voters/bulk', requestData)
      return response.data
    } catch (error) {
      console.error('Error bulk creating voters:', error)
      throw error
    }
  },
  
  // Update voter - UPDATED: Remove required fields validation
  update: async (id, voterData) => {
    try {
      // Clean the data - only send fields that have values
      const cleanedData = {}
      
      if (voterData.schoolId) cleanedData.schoolId = voterData.schoolId
      if (voterData.firstName) cleanedData.firstName = voterData.firstName
      if (voterData.lastName) cleanedData.lastName = voterData.lastName
      if (voterData.departmentId) cleanedData.departmentId = voterData.departmentId
      
      // Handle optional fields
      if (voterData.middleName !== undefined) {
        cleanedData.middleName = voterData.middleName?.trim() || null
      }

      if (voterData.sex) {
        cleanedData.sex = voterData.sex
      }
      
      if (voterData.yearLevel) {
        cleanedData.yearLevel = voterData.yearLevel
      }
      
      if (voterData.email !== undefined) {
        cleanedData.email = voterData.email?.trim() || null
      }
      
      if (voterData.birthdate) {
        cleanedData.birthdate = voterData.birthdate
      }
      
      const response = await api.put(`/voters/${id}`, cleanedData)
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

  // Export voters - FIXED: Proper blob handling for PDF/DOCX
  exportVoters: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams()
      
      if (params.format) queryParams.append('format', params.format)
      if (params.department) queryParams.append('department', params.department)
      if (params.yearLevel) queryParams.append('yearLevel', params.yearLevel)
      if (params.search) queryParams.append('search', params.search)
      
      const response = await api.get(`/voters/export/all?${queryParams.toString()}`, {
        responseType: params.format === 'json' ? 'json' : 'blob'
      })
      
      // If it's a blob (PDF/DOCX), return the blob
      if (params.format === 'pdf' || params.format === 'docx') {
        return {
          data: response.data,
          headers: response.headers,
          status: response.status
        }
      }
      
      // If it's JSON, return the data
      return response.data
    } catch (error) {
      console.error('Error exporting voters:', error)
      throw error
    }
  },

  // Export registered voters - FIXED: Proper blob handling for PDF/DOCX
  exportRegisteredVoters: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams()
      
      if (params.format) queryParams.append('format', params.format)
      if (params.department) queryParams.append('department', params.department)
      if (params.yearLevel) queryParams.append('yearLevel', params.yearLevel)
      if (params.search) queryParams.append('search', params.search)
      
      const response = await api.get(`/voters/export/registered?${queryParams.toString()}`, {
        responseType: params.format === 'json' ? 'json' : 'blob'
      })
      
      // If it's a blob (PDF/DOCX), return the blob
      if (params.format === 'pdf' || params.format === 'docx') {
        return {
          data: response.data,
          headers: response.headers,
          status: response.status
        }
      }
      
      // If it's JSON, return the data
      return response.data
    } catch (error) {
      console.error('Error exporting registered voters:', error)
      throw error
    }
  },

  // Get voter profile (for authenticated voters)
  getProfile: async () => {
    try {
      // Force use of voter token by ensuring the URL matches voter patterns
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
      // Validate year level if provided
      if (profileData.yearLevel !== undefined) {
        const yearLevel = Number(profileData.yearLevel)
        if (isNaN(yearLevel) || yearLevel < 1 || yearLevel > 4) {
          throw new Error('Year level must be between 1 and 4')
        }
      }

      // Validate password fields if password update is requested
      if (profileData.newPassword) {
        if (!profileData.currentPassword) {
          throw new Error('Current password is required to set a new password')
        }
        if (profileData.newPassword !== profileData.confirmNewPassword) {
          throw new Error('New passwords do not match')
        }
        if (profileData.newPassword.length < 6) {
          throw new Error('New password must be at least 6 characters long')
        }
      }

      const response = await api.put('/voters/profile', profileData)
      return response.data
    } catch (error) {
      console.error('Error updating voter profile:', error)
      throw error
    }
  },

validateProfileUpdate: (profileData) => {
    const errors = []
    
    // Validate email if provided
    if (profileData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
      errors.push('Invalid email format')
    }
    
    // Validate year level if provided
    if (profileData.yearLevel !== undefined) {
      const yearLevel = Number(profileData.yearLevel)
      if (isNaN(yearLevel) || yearLevel < 1 || yearLevel > 4) {
        errors.push('Year level must be between 1 and 4')
      }
    }
    
    // Validate password update if requested
    if (profileData.newPassword) {
      if (!profileData.currentPassword) {
        errors.push('Current password is required')
      }
      if (profileData.newPassword !== profileData.confirmNewPassword) {
        errors.push('New passwords do not match')
      }
      if (profileData.newPassword.length < 6) {
        errors.push('New password must be at least 6 characters long')
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  },

  // Validate voter data before submission - UPDATED: Remove required validation for optional fields
  validateVoterData: (voterData) => {
    const errors = []
    
    // Only validate truly required fields
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
    
    // Optional field validations - only validate if provided
    if (voterData.yearLevel && ![1, 2, 3, 4].includes(Number(voterData.yearLevel))) {
      errors.push('Year level must be between 1 and 4')
    }
    
    if (voterData.email && voterData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(voterData.email)) {
      errors.push('Invalid email format')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  },

  // Validate bulk voter data - UPDATED: Use new validation rules
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
  },

  // Helper function to download exported file
  downloadExportedFile: (response, filename, format = 'pdf') => {
    try {
      let mimeType = 'application/pdf'
      let extension = 'pdf'
      
      if (format === 'docx') {
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        extension = 'docx'
      }
      
      const blob = new Blob([response.data], { type: mimeType })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${filename}.${extension}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      return true
    } catch (error) {
      console.error('Error downloading file:', error)
      return false
    }
  },

  getActive: async (params = {}) => {
    try {
      const response = await api.get('/voters/active', { params })
      return response.data
    } catch (error) {
      console.error('Error fetching active voters:', error)
      throw error
    }
  },

  // NEW: Get active registered voters only
  getActiveRegistered: async (params = {}) => {
    try {
      const response = await api.get('/voters/active/registered', { params })
      return response.data
    } catch (error) {
      console.error('Error fetching active registered voters:', error)
      throw error
    }
  },

  // NEW: Get active officers only
  getActiveOfficers: async (params = {}) => {
    try {
      const response = await api.get('/voters/active/officers', { params })
      return response.data
    } catch (error) {
      console.error('Error fetching active officers:', error)
      throw error
    }
  },

  // NEW: Get departmental officers (active only)
  getDepartmentalOfficers: async (departmentId, params = {}) => {
    try {
      const response = await api.get(`/voters/department/${departmentId}/officers`, { params })
      return response.data
    } catch (error) {
      console.error(`Error fetching departmental officers for department ${departmentId}:`, error)
      throw error
    }
  },

  // NEW: Get active voters by department code
  getActiveByDepartmentCode: async (departmentCode, params = {}) => {
    try {
      const response = await api.get(`/voters/department-code/${departmentCode}/active`, { params })
      return response.data
    } catch (error) {
      console.error(`Error fetching active voters for department ${departmentCode}:`, error)
      throw error
    }
  },

  // NEW: Get active officers by department code
  getActiveOfficersByDepartmentCode: async (departmentCode, params = {}) => {
    try {
      const response = await api.get(`/voters/department-code/${departmentCode}/officers/active`, { params })
      return response.data
    } catch (error) {
      console.error(`Error fetching active officers for department ${departmentCode}:`, error)
      throw error
    }
  }
}