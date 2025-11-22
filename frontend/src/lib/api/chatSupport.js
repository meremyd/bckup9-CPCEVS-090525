import api from '../api'

export const chatSupportAPI = {
  // Submit support request (public) - Enhanced with validation
  submit: async (data) => {
    try {
      // Normalize alternate frontend keys to the expected backend field names
      const payload = { ...data }
      if (!payload.schoolId && payload.idNumber) payload.schoolId = payload.idNumber
      if (!payload.departmentId && payload.course) payload.departmentId = payload.course
      // Map frontend course labels to backend-recognized department identifiers
      if (payload.departmentId === 'BSED') {
        payload.departmentId = 'Bachelor of Secondary Education'
      } else if (payload.departmentId === 'BSED') {
        payload.departmentId = 'Bachelor of Secondary Education'
      }
      // keep photoFile on payload if present
      if (data.photoFile) payload.photoFile = data.photoFile
      
      // Client-side validation before sending
      const errors = []
      if (!payload.schoolId) errors.push("School ID is required")
      if (!payload.firstName) errors.push("First name is required")
      if (!payload.lastName) errors.push("Last name is required")
      if (!payload.departmentId) errors.push("Department is required")
      if (!payload.email) errors.push("Email is required")
      if (!payload.message) errors.push("Message is required")

      if (errors.length > 0) {
        throw new Error(errors.join(', '))
      }

      // Email format validation
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
      if (!emailRegex.test(payload.email)) {
        throw new Error("Please enter a valid email address")
      }

      // If a file is present (from the form component), submit as multipart/form-data
      let response
      if (payload instanceof FormData || payload.photoFile) {
        const formData = payload instanceof FormData ? payload : new FormData()

        if (!(payload instanceof FormData)) {
          // Append normalized payload fields
          if (payload.schoolId) formData.append('schoolId', payload.schoolId)
          if (payload.firstName) formData.append('firstName', payload.firstName)
          if (payload.middleName) formData.append('middleName', payload.middleName)
          if (payload.lastName) formData.append('lastName', payload.lastName)
          if (payload.departmentId) formData.append('departmentId', payload.departmentId)
          if (payload.email) formData.append('email', payload.email)
          if (payload.message) formData.append('message', payload.message)
          if (payload.photoFile) formData.append('photo', payload.photoFile)
        }

        response = await api.post('/chat-support', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      } else {
        response = await api.post('/chat-support', payload)
      }
      // Map frontend course labels to department lookup keys the backend accepts
      // (some departments are identified by their full degreeProgram string)
      // NOTE: We map common BSED variants to the backend degreeProgram strings
      // so the existing department lookup in the backend will match.
      // This mapping is applied before sending when payload.departmentId comes from `course`.
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
  
  // Update support request status, response, or link a voter (admin only)
  updateStatus: async (id, updateData) => {
    try {
      if (!id) {
        throw new Error('Request ID is required')
      }

      if (!updateData || (typeof updateData !== 'object')) {
        throw new Error('Update data is required')
      }

      // If status is provided, validate it
      const validStatuses = ["pending", "in-progress", "resolved", "archived", "closed"]
      if (updateData.status && !validStatuses.includes(updateData.status)) {
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

  // Send response email to requester (admin only)
  sendResponse: async (id, data) => {
    try {
      if (!id) throw new Error('Request ID is required')
      if (!data || !data.response) throw new Error('Response text is required')
      const response = await api.post(`/chat-support/${id}/send`, { response: data.response })
      return response.data
    } catch (error) {
      console.error(`Error sending response for support request ${id}:`, error)
      if (error.response?.status === 404) throw new Error('Support request not found')
      if (error.response?.status === 400) throw new Error(error.response.data.message || 'Invalid data')
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

      const validStatuses = ["pending", "in-progress", "resolved", "archived", "closed"]
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
    
    if (!data.firstName || data.firstName.trim().length < 2) {
      errors.firstName = 'First name must be at least 2 characters'
    }
    if (!data.lastName || data.lastName.trim().length < 2) {
      errors.lastName = 'Last name must be at least 2 characters'
    }
    
    if (!data.departmentId) {
      errors.departmentId = 'Department selection is required'
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
  },

   getFAQs: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams()
      
      if (params.limit) queryParams.append('limit', params.limit)
      if (params.category) queryParams.append('category', params.category)
      
      const response = await api.get(`/chat-support/faqs?${queryParams.toString()}`)
      return response.data
    } catch (error) {
      console.error('Error fetching FAQs:', error)
      throw error
    }
  },

  // Get FAQ categories (public)
  getFAQCategories: async () => {
    try {
      const response = await api.get('/chat-support/faqs/categories')
      return response.data
    } catch (error) {
      console.error('Error fetching FAQ categories:', error)
      throw error
    }
  }
}
