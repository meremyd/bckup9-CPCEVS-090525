import api from '../api'

export const chatSupportAPI = {
  // Submit support request (public) - Enhanced with validation
  submit: async (data) => {
    try {
      // Client-side validation before sending
      const errors = []
      if (!data.schoolId) errors.push("School ID is required")
      if (!data.fullName) errors.push("Full name is required")
      if (!data.departmentId) errors.push("Department is required")
      if (!data.birthday) errors.push("Birthday is required")
      if (!data.email) errors.push("Email is required")
      if (!data.message) errors.push("Message is required")

      if (errors.length > 0) {
        throw new Error(errors.join(', '))
      }

      // Email format validation
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
      if (!emailRegex.test(data.email)) {
        throw new Error("Please enter a valid email address")
      }

      const response = await api.post('/chat-support', data)
      return response.data
    } catch (error) {
      console.error('Error submitting support request:', error)
      
      // Enhanced error handling for specific server responses
      if (error.response?.status === 429) {
        throw new Error('Please wait before submitting another support request')
      } else if (error.response?.status === 400) {
        throw new Error(error.response.data.message || 'Please check your information and try again')
      }
      
      throw error
    }
  },
  
  // Get all support requests with enhanced filtering (admin only)
  getAll: async (params = {}) => {
    try {
      const response = await api.get('/chat-support', { params })
      return response.data
    } catch (error) {
      console.error('Error fetching support requests:', error)
      throw error
    }
  },
  
  // Get support request by ID (admin only)
  getById: async (id) => {
    try {
      if (!id) {
        throw new Error('Request ID is required')
      }
      
      const response = await api.get(`/chat-support/${id}`)
      return response.data
    } catch (error) {
      console.error(`Error fetching support request ${id}:`, error)
      
      if (error.response?.status === 404) {
        throw new Error('Support request not found')
      }
      
      throw error
    }
  },
  
  // Update support request status and response (admin only)
  updateStatus: async (id, updateData) => {
    try {
      if (!id) {
        throw new Error('Request ID is required')
      }

      if (!updateData.status) {
        throw new Error('Status is required')
      }

      const validStatuses = ["pending", "in-progress", "resolved", "closed"]
      if (!validStatuses.includes(updateData.status)) {
        throw new Error('Invalid status. Must be one of: ' + validStatuses.join(', '))
      }
      
      const response = await api.put(`/chat-support/${id}`, updateData)
      return response.data
    } catch (error) {
      console.error(`Error updating support request ${id}:`, error)
      
      if (error.response?.status === 404) {
        throw new Error('Support request not found')
      } else if (error.response?.status === 400) {
        throw new Error(error.response.data.message || 'Invalid update data')
      }
      
      throw error
    }
  },
  
  // Delete support request (admin only)
  delete: async (id) => {
    try {
      if (!id) {
        throw new Error('Request ID is required')
      }
      
      const response = await api.delete(`/chat-support/${id}`)
      return response.data
    } catch (error) {
      console.error(`Error deleting support request ${id}:`, error)
      
      if (error.response?.status === 404) {
        throw new Error('Support request not found')
      }
      
      throw error
    }
  },
  
  // Get comprehensive support statistics (admin only)
  getStatistics: async () => {
    try {
      const response = await api.get('/chat-support/stats/summary')
      return response.data
    } catch (error) {
      console.error('Error fetching support statistics:', error)
      throw error
    }
  },
  
  // Bulk update support requests status (admin only)
  bulkUpdateStatus: async (data) => {
    try {
      if (!data.requestIds || !Array.isArray(data.requestIds) || data.requestIds.length === 0) {
        throw new Error('Request IDs are required')
      }

      if (!data.status) {
        throw new Error('Status is required')
      }

      const validStatuses = ["pending", "in-progress", "resolved", "closed"]
      if (!validStatuses.includes(data.status)) {
        throw new Error('Invalid status. Must be one of: ' + validStatuses.join(', '))
      }
      
      const response = await api.post('/chat-support/bulk-update', data)
      return response.data
    } catch (error) {
      console.error('Error performing bulk update:', error)
      
      if (error.response?.status === 400) {
        throw new Error(error.response.data.message || 'Invalid bulk update data')
      }
      
      throw error
    }
  },
  
  // Export support requests with filtering (admin only)
  export: async (params = {}) => {
    try {
      const response = await api.get('/chat-support/export', { 
        params,
        responseType: params.format === 'csv' ? 'blob' : 'json'
      })
      return response.data
    } catch (error) {
      console.error('Error exporting support requests:', error)
      throw error
    }
  },

  // Get departments for form dropdown
  getDepartments: async () => {
    try {
      const response = await api.get('/departments')
      return response.data
    } catch (error) {
      console.error('Error fetching departments:', error)
      throw error
    }
  },

  // Validate school ID (optional helper)
  validateSchoolId: async (schoolId) => {
    try {
      if (!schoolId) {
        throw new Error('School ID is required')
      }
      
      const response = await api.get(`/voters/${schoolId}/validate`)
      return response.data
    } catch (error) {
      console.error(`Error validating school ID ${schoolId}:`, error)
      
      if (error.response?.status === 404) {
        return { exists: false, message: 'School ID not found' }
      }
      
      throw error
    }
  },

  // NEW: Client-side form validation helper
  validateFormData: (data) => {
    const errors = {}
    
    if (!data.schoolId) {
      errors.schoolId = 'School ID is required'
    } else if (isNaN(data.schoolId) || Number(data.schoolId) <= 0) {
      errors.schoolId = 'School ID must be a valid positive number'
    }
    
    if (!data.fullName || data.fullName.trim().length < 2) {
      errors.fullName = 'Full name must be at least 2 characters'
    }
    
    if (!data.departmentId) {
      errors.departmentId = 'Department selection is required'
    }
    
    if (!data.birthday) {
      errors.birthday = 'Birthday is required'
    } else {
      const birthDate = new Date(data.birthday)
      if (isNaN(birthDate.getTime())) {
        errors.birthday = 'Please enter a valid birthday'
      } else {
        const age = (new Date() - birthDate) / (365.25 * 24 * 60 * 60 * 1000)
        if (age < 16 || age > 100) {
          errors.birthday = 'Please enter a realistic birthday'
        }
      }
    }
    
    if (!data.email) {
      errors.email = 'Email is required'
    } else {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
      if (!emailRegex.test(data.email)) {
        errors.email = 'Please enter a valid email address'
      }
    }
    
    if (!data.message || data.message.trim().length < 10) {
      errors.message = 'Message must be at least 10 characters'
    } else if (data.message.length > 2000) {
      errors.message = 'Message must be less than 2000 characters'
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  },

  // NEW: Format support request data for display
  formatRequestForDisplay: (request) => {
    return {
      ...request,
      formattedSubmittedAt: request.submittedAt ? 
        new Date(request.submittedAt).toLocaleString() : 'N/A',
      formattedRespondedAt: request.respondedAt ? 
        new Date(request.respondedAt).toLocaleString() : 'N/A',
      departmentName: request.departmentId?.degreeProgram || 'Unknown Department',
      departmentCode: request.departmentId?.departmentCode || 'N/A',
      college: request.departmentId?.college || 'N/A',
      voterName: request.voterId ? 
        `${request.voterId.firstName || ''} ${request.voterId.lastName || ''}`.trim() : 'Non-voter',
      statusLabel: request.status.charAt(0).toUpperCase() + request.status.slice(1).replace('-', ' ')
    }
  }
}