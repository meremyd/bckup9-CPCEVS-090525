import api from '../api'

export const candidatesAPI = {
  // ===== MAIN API METHODS (Aligned with actual routes) =====
  
  // Admin/Committee - Get all candidates with enhanced filtering
  getAll: async (params = {}) => {
    try {
      const { page = 1, limit = 10, type, electionId, positionId, status, search } = params
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(type && { type }),
        ...(electionId && { electionId }),
        ...(positionId && { positionId }),
        ...(status !== undefined && { status }),
        ...(search && { search })
      })
      
      const response = await api.get(`/candidates?${queryParams}`)
      return response.data
    } catch (error) {
      console.error('Error fetching all candidates:', error)
      throw error
    }
  },
  
  // Get candidate by ID (works for both SSG and Departmental)
  getById: async (id) => {
    try {
      const response = await api.get(`/candidates/${id}`)
      return response.data
    } catch (error) {
      console.error(`Error fetching candidate ${id}:`, error)
      throw error
    }
  },
  
  // Create candidate (generic - works for both types)
  create: async (candidateData) => {
    try {
      const response = await api.post('/candidates', candidateData)
      return response.data
    } catch (error) {
  console.error('Error creating SSG candidate:', error)
  console.error('Full error response:', error.response)
  console.error('Error response data:', error.response?.data)
  console.error('Error response status:', error.response?.status)
  
  if (error.response?.data?.message) {
    const errorMessage = error.response.data.message
    console.error('Server error message:', errorMessage)
  }
      throw error
    }
  },
  
  // Update candidate (generic - works for both types)
  update: async (id, candidateData) => {
    try {
      const response = await api.put(`/candidates/${id}`, candidateData)
      return response.data
    } catch (error) {
      console.error(`Error updating candidate ${id}:`, error)
      throw error
    }
  },
  
  // Delete candidate (generic - works for both types)
  delete: async (id) => {
    try {
      const response = await api.delete(`/candidates/${id}`)
      return response.data
    } catch (error) {
      console.error(`Error deleting candidate ${id}:`, error)
      throw error
    }
  },

  // Get candidates by election - UPDATED to match controller behavior
  getByElection: async (electionId, params = {}) => {
    try {
      const { type, positionId, partylistId, status } = params
      
      if (!type || !['ssg', 'departmental'].includes(type)) {
        throw new Error('Election type (ssg or departmental) is required')
      }

      const queryParams = new URLSearchParams({
        type,
        ...(positionId && { positionId }),
        ...(partylistId && { partylistId }),
        ...(status !== undefined && { status })
      })
      
      const response = await api.get(`/candidates/election/${electionId}?${queryParams}`)
      return response.data
    } catch (error) {
      console.error(`Error fetching candidates for election ${electionId}:`, error)
      throw error
    }
  },

  // Voter - Get candidates for voting - UPDATED to match controller behavior
  getForVoter: async (electionId, type) => {
    try {
      if (!type || !['ssg', 'departmental'].includes(type)) {
        throw new Error('Election type (ssg or departmental) is required')
      }

      const response = await api.get(`/candidates/voter/election/${electionId}?type=${type}`)
      return response.data
    } catch (error) {
      console.error(`Error fetching candidates for voter - election ${electionId}:`, error)
      throw error
    }
  },

  // Export candidates data
  export: async (params = {}) => {
    try {
      const { type, electionId, format = 'csv' } = params
      const queryParams = new URLSearchParams({
        format,
        ...(type && { type }),
        ...(electionId && { electionId })
      })
      
      if (format === 'csv') {
        const response = await api.get(`/candidates/export?${queryParams}`, {
          responseType: 'blob'
        })
        return response.data
      } else {
        const response = await api.get(`/candidates/export?${queryParams}`)
        return response.data
      }
    } catch (error) {
      console.error('Error exporting candidates:', error)
      throw error
    }
  },

  // Campaign picture methods (SSG only)
  uploadCampaignPicture: async (id, imageData) => {
    try {
      const response = await api.put(`/candidates/${id}/campaign-picture`, { 
        campaignPicture: imageData 
      })
      return response.data
    } catch (error) {
      console.error(`Error uploading campaign picture for candidate ${id}:`, error)
      throw error
    }
  },

  getCampaignPicture: async (id) => {
    try {
      const response = await api.get(`/candidates/${id}/campaign-picture`, {
        responseType: 'blob'
      })
      return response.data
    } catch (error) {
      console.error(`Error fetching campaign picture for candidate ${id}:`, error)
      throw error
    }
  },

  getCampaignPictureUrl: (candidateId) => {
    return `/api/candidates/${candidateId}/campaign-picture`
  },

  // Credentials methods (SSG only) - UPDATED for image handling
  uploadCredentials: async (id, credentialsData) => {
    try {
      // Validate image data
      if (typeof credentialsData === 'string' && !credentialsData.startsWith('data:image/')) {
        throw new Error('Credentials must be a valid image file')
      }

      const response = await api.put(`/candidates/${id}/credentials`, { 
        credentials: credentialsData 
      })
      return response.data
    } catch (error) {
      console.error(`Error uploading credentials image for candidate ${id}:`, error)
      
      // Enhanced error handling for image-specific issues
      if (error.response?.data?.message?.includes('image format')) {
        throw new Error('Please upload a valid image file (JPEG, PNG)')
      } else if (error.response?.data?.message?.includes('too large')) {
        throw new Error('Image file is too large (maximum 5MB)')
      }
      
      throw error
    }
  },

  getCredentials: async (id) => {
    try {
      const response = await api.get(`/candidates/${id}/credentials`, {
        responseType: 'blob'
      })
      return response.data
    } catch (error) {
      console.error(`Error fetching credentials image for candidate ${id}:`, error)
      throw error
    }
  },

  getCredentialsUrl: (candidateId) => {
    return `/api/candidates/${candidateId}/credentials`
  },

  // ===== SSG SPECIFIC METHODS (Aligned with /candidates/ssg routes) =====
  
  ssg: {
    // Get all SSG candidates
    getAll: async (params = {}) => {
      try {
        const { page = 1, limit = 10, electionId, positionId, status, search } = params
        const queryParams = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          ...(electionId && { electionId }),
          ...(positionId && { positionId }),
          ...(status !== undefined && { status }),
          ...(search && { search })
        })
        
        const response = await api.get(`/candidates/ssg?${queryParams}`)
        return response.data
      } catch (error) {
        console.error('Error fetching SSG candidates:', error)
        throw error
      }
    },

    // Get SSG candidate by ID
    getById: async (id) => {
      try {
        const response = await api.get(`/candidates/ssg/${id}`)
        return response.data
      } catch (error) {
        console.error(`Error fetching SSG candidate ${id}:`, error)
        throw error
      }
    },

    // Create SSG candidate
    create: async (candidateData) => {
  try {
    // Clean the candidate data - only include fields with actual values
    const cleanedData = {
      voterId: candidateData.voterId,
      positionId: candidateData.positionId,
      ssgElectionId: candidateData.ssgElectionId || candidateData.electionId,
      isActive: candidateData.isActive !== false // Default to true
    }

    // Only include optional fields if they have values
    if (candidateData.partylistId) {
      cleanedData.partylistId = candidateData.partylistId
    }

    if (candidateData.candidateNumber) {
      cleanedData.candidateNumber = candidateData.candidateNumber
    }

    // Only include files if they have actual base64 data
    if (candidateData.campaignPicture && 
    candidateData.campaignPicture.trim() !== '' && 
    candidateData.campaignPicture.includes('base64')) {
  cleanedData.campaignPicture = candidateData.campaignPicture
}

if (candidateData.credentials && 
    candidateData.credentials.trim() !== '' &&
    candidateData.credentials.includes('base64')) {
  cleanedData.credentials = candidateData.credentials
}

    console.log('Creating SSG candidate with cleaned data:', {
      ...cleanedData,
      campaignPicture: cleanedData.campaignPicture ? '[IMAGE_DATA]' : undefined,
      credentials: cleanedData.credentials ? '[CREDENTIALS_DATA]' : undefined
    })
    
    const response = await api.post('/candidates/ssg', cleanedData)
    
    console.log('SSG candidate created successfully:', response.data)
    return response.data
  } catch (error) {
    console.error('Error creating SSG candidate:', error)
    
    // Enhanced error handling for validation messages
    if (error.response?.data?.message) {
      const errorMessage = error.response.data.message
      
      // Check for specific validation errors
      if (errorMessage.includes('registered voter')) {
        throw new Error('Only registered voters can be SSG candidates')
      } else if (errorMessage.includes('already a candidate')) {
        throw new Error('This voter is already a candidate in this SSG election')
      } else if (errorMessage.includes('already a member')) {
        throw new Error('This voter is already a member of another partylist in this election')
      } else if (errorMessage.includes('Candidate number already exists')) {
        throw new Error('This candidate number is already taken for this position')
      }
    }
    
    // Log detailed error information for debugging
    if (error.response) {
      console.error('API Error Response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers
      })
    }
    
    throw error
  }
},

    // Update SSG candidate
    update: async (id, candidateData) => {
      try {
        console.log(`Updating SSG candidate ${id} with data:`, {
          ...candidateData,
          credentials: candidateData.credentials ? '[CREDENTIALS_DATA]' : candidateData.credentials
        })
        
        const response = await api.put(`/candidates/ssg/${id}`, candidateData)
        
        console.log('SSG candidate updated successfully:', response.data)
        return response.data
      } catch (error) {
        console.error(`Error updating SSG candidate ${id}:`, error)
        
        // Enhanced error handling for validation messages
        if (error.response?.data?.message) {
          const errorMessage = error.response.data.message
          
          if (errorMessage.includes('registered voter')) {
            throw new Error('Only registered voters can be SSG candidates')
          } else if (errorMessage.includes('already a candidate')) {
            throw new Error('This voter is already a candidate in this SSG election')
          } else if (errorMessage.includes('already a member')) {
            throw new Error('This voter is already a member of another partylist in this election')
          }
        }
        
        throw error
      }
    },

    // Delete SSG candidate
    delete: async (id) => {
      try {
        const response = await api.delete(`/candidates/ssg/${id}`)
        return response.data
      } catch (error) {
        console.error(`Error deleting SSG candidate ${id}:`, error)
        throw error
      }
    },

    // Get SSG candidates by election - UPDATED to match actual route
    getByElection: async (electionId, params = {}) => {
      try {
        const { positionId, partylistId, status } = params
        const queryParams = new URLSearchParams()
        
        // Add parameters if they exist
        if (positionId) queryParams.append('positionId', positionId)
        if (partylistId) queryParams.append('partylistId', partylistId) 
        if (status !== undefined) queryParams.append('status', status)

        // Build URL with query parameters
        const queryString = queryParams.toString()
        const url = queryString 
          ? `/candidates/ssg/election/${electionId}?${queryString}`
          : `/candidates/ssg/election/${electionId}`
        
        console.log('Making API call to SSG candidates endpoint:', url)
        
        const response = await api.get(url)
        
        console.log('SSG Candidates API Response Status:', response.status)
        console.log('SSG Candidates API Response Data keys:', Object.keys(response.data || {}))
        console.log('Candidates in response:', response.data?.data?.candidates?.length || 0)
        console.log('Positions in response:', response.data?.data?.positions?.length || 0)
        console.log('Partylists in response:', response.data?.data?.partylists?.length || 0)
        
        // Validate response structure
        if (!response.data?.data) {
          console.error('Invalid response structure - missing data object')
          throw new Error('Invalid response format from server')
        }

        return response.data
      } catch (error) {
        console.error(`Error fetching SSG candidates for election ${electionId}:`, error)
        console.error('Error response status:', error.response?.status)
        console.error('Error response data:', error.response?.data)
        throw error
      }
    },

    // Get SSG candidates for voter - UPDATED to use specific SSG voter route
    getForVoter: async (electionId) => {
      try {
        const response = await api.get(`/candidates/ssg/voter/election/${electionId}`)
        return response.data
      } catch (error) {
        console.error(`Error fetching SSG candidates for voter - election ${electionId}:`, error)
        throw error
      }
    },

    // Check candidate eligibility - UPDATED to match controller implementation
    checkEligibility: async (ssgElectionId, positionId, partylistId = null, voterId = null) => {
      try {
        let url = `/candidates/ssg/eligibility/${ssgElectionId}/${positionId}`
        if (partylistId) {
          url = `/candidates/ssg/eligibility/${ssgElectionId}/${positionId}/${partylistId}`
        }
        
        const params = new URLSearchParams()
        if (voterId) params.append('voterId', voterId)
        
        const queryString = params.toString()
        if (queryString) url += `?${queryString}`
        
        const response = await api.get(url)
        return response.data
      } catch (error) {
        console.error('Error checking SSG candidate eligibility:', error)
        throw error
      }
    },

    // Get partylist candidate slots
    getPartylistSlots: async (ssgElectionId, partylistId = null) => {
      try {
        const url = partylistId
          ? `/candidates/ssg/partylist-slots/${ssgElectionId}/${partylistId}`
          : `/candidates/ssg/partylist-slots/${ssgElectionId}`
        
        const response = await api.get(url)
        return response.data
      } catch (error) {
        console.error('Error fetching partylist candidate slots:', error)
        throw error
      }
    }
  },

  // ===== DEPARTMENTAL SPECIFIC METHODS (Aligned with /candidates/departmental routes) =====
  
  departmental: {
    // Get all Departmental candidates
    getAll: async (params = {}) => {
      try {
        const { page = 1, limit = 10, electionId, positionId, status, search } = params
        const queryParams = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          ...(electionId && { electionId }),
          ...(positionId && { positionId }),
          ...(status !== undefined && { status }),
          ...(search && { search })
        })
        
        const response = await api.get(`/candidates/departmental?${queryParams}`)
        return response.data
      } catch (error) {
        console.error('Error fetching departmental candidates:', error)
        throw error
      }
    },

    // Get Departmental candidate by ID
    getById: async (id) => {
      try {
        const response = await api.get(`/candidates/departmental/${id}`)
        return response.data
      } catch (error) {
        console.error(`Error fetching departmental candidate ${id}:`, error)
        throw error
      }
    },

    // Create Departmental candidate
    create: async (candidateData) => {
      try {
        const response = await api.post('/candidates/departmental', { 
          ...candidateData, 
          ssgElectionId: null,
          partylistId: null
        })
        return response.data
      } catch (error) {
        console.error('Error creating departmental candidate:', error)
        throw error
      }
    },

    // Update Departmental candidate
    update: async (id, candidateData) => {
      try {
        const response = await api.put(`/candidates/departmental/${id}`, candidateData)
        return response.data
      } catch (error) {
        console.error(`Error updating departmental candidate ${id}:`, error)
        throw error
      }
    },

    // Delete Departmental candidate
    delete: async (id) => {
      try {
        const response = await api.delete(`/candidates/departmental/${id}`)
        return response.data
      } catch (error) {
        console.error(`Error deleting departmental candidate ${id}:`, error)
        throw error
      }
    },

    // Get Departmental candidates by election
    getByElection: async (electionId, params = {}) => {
      try {
        const { positionId, status } = params
        const queryParams = new URLSearchParams({
          ...(positionId && { positionId }),
          ...(status !== undefined && { status })
        })
        
        const queryString = queryParams.toString()
        const url = queryString 
          ? `/candidates/departmental/election/${electionId}?${queryString}` 
          : `/candidates/departmental/election/${electionId}`
        
        const response = await api.get(url)
        return response.data
      } catch (error) {
        console.error(`Error fetching departmental candidates for election ${electionId}:`, error)
        throw error
      }
    },

    // Get Departmental candidates for voter
    getForVoter: async (electionId) => {
      try {
        const response = await api.get(`/candidates/departmental/voter/election/${electionId}`)
        return response.data
      } catch (error) {
        console.error(`Error fetching departmental candidates for voter - election ${electionId}:`, error)
        throw error
      }
    }
  },

  // ===== VALIDATION FUNCTIONS =====

  validateSSGCandidateForm: (formData) => {
    const errors = {}
    
    // Required fields validation
    if (!formData.voterId) {
      errors.voterId = 'Voter selection is required'
    }
    
    if (!formData.positionId) {
      errors.positionId = 'Position selection is required'
    }
    
    if (!formData.ssgElectionId && !formData.electionId) {
      errors.election = 'SSG Election selection is required'
    }
    
    // Candidate number validation
    if (formData.candidateNumber) {
      const num = parseInt(formData.candidateNumber)
      if (isNaN(num) || num < 1) {
        errors.candidateNumber = 'Candidate number must be a positive number'
      }
    }
    
    // Credentials validation for images (optional for SSG candidates)
    if (formData.credentials) {
      if (typeof formData.credentials === 'string') {
        // Check if it's a valid image data URL
        if (!formData.credentials.startsWith('data:image/')) {
          errors.credentials = 'Credentials must be a valid image file'
        } else {
          // Check file size (approximate - base64 is ~33% larger than binary)
          const base64Length = formData.credentials.split(',')[1]?.length || 0
          const approximateSize = (base64Length * 3) / 4
          if (approximateSize > 5 * 1024 * 1024) { // 5MB limit
            errors.credentials = 'Credentials image is too large (max 5MB)'
          }
        }
      }
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  },

  validateCandidateForm: (formData) => {
    const errors = {}
    
    // Required fields validation
    if (!formData.voterId) {
      errors.voterId = 'Voter selection is required'
    }
    
    if (!formData.positionId) {
      errors.positionId = 'Position selection is required'
    }
    
    // Election validation
    if (!formData.ssgElectionId && !formData.deptElectionId) {
      errors.election = 'Election selection is required'
    }
    
    if (formData.ssgElectionId && formData.deptElectionId) {
      errors.election = 'Cannot select both SSG and Departmental elections'
    }
    
    // Candidate number validation
    if (formData.candidateNumber) {
      const num = parseInt(formData.candidateNumber)
      if (isNaN(num) || num < 1) {
        errors.candidateNumber = 'Candidate number must be a positive number'
      }
    }
    
    // Partylist validation
    if (formData.partylistId && formData.deptElectionId) {
      errors.partylist = 'Partylists are only available for SSG elections'
    }
    
    // Credentials validation (only for SSG candidates)
    if (formData.credentials) {
      if (formData.deptElectionId) {
        errors.credentials = 'Credentials are only available for SSG candidates'
      } else if (typeof formData.credentials === 'string' && formData.credentials.length > 5 * 1024 * 1024) {
        errors.credentials = 'Credentials file is too large (max 5MB)'
      }
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  },

  // ===== UTILITY FUNCTIONS =====

  // Enhanced processing for SSG candidates with position and partylist data
  processSSGCandidatesResponse: (response) => {
    if (!response?.data) {
      console.error('Invalid response structure:', response)
      return {
        election: null,
        candidates: [],
        positions: [],
        partylists: [],
        candidatesByPosition: [],
        statistics: {
          total: 0,
          active: 0,
          inactive: 0,
          totalPositions: 0,
          totalPartylists: 0,
          byPosition: {},
          byPartylist: {}
        }
      }
    }

    const { data } = response
    
    return {
      election: data.election || null,
      candidates: Array.isArray(data.candidates) ? data.candidates : [],
      positions: Array.isArray(data.positions) ? data.positions : [],
      partylists: Array.isArray(data.partylists) ? data.partylists : [],
      candidatesByPosition: Array.isArray(data.candidatesByPosition) ? data.candidatesByPosition : [],
      statistics: data.statistics || {
        total: 0,
        active: 0,
        inactive: 0,
        totalPositions: 0,
        totalPartylists: 0,
        byPosition: {},
        byPartylist: {}
      }
    }
  },

  // Process candidates for table display
  processForTable: (candidates) => {
    return candidates.map(candidate => ({
      id: candidate._id || candidate.id,
      candidateNumber: candidate.candidateNumber,
      name: candidate.name || candidate.fullName || 'Unknown',
      schoolId: candidate.schoolId || 'N/A',
      position: candidate.position || 'Unknown Position',
      positionOrder: candidate.positionOrder || 0,
      department: candidate.department || 'Unknown',
      yearLevel: candidate.yearLevel || 'N/A',
      partylist: candidate.partylist || 'Independent',
      electionType: candidate.electionType?.toUpperCase() || 'N/A',
      isActive: candidate.isActive ?? true,
      hasCredentials: candidate.hasCredentials || false,
      hasCampaignPicture: candidate.hasCampaignPicture || false
    }))
  },

  // Filter candidates by partylist (enhanced for SSG)
  filterByPartylist: (candidates, partylistId) => {
    if (!partylistId) return candidates
    
    if (partylistId === 'independent') {
      return candidates.filter(candidate => 
        !candidate.partylistId && !candidate.partylist
      )
    }
    
    return candidates.filter(candidate => {
      const candidatePartylistId = candidate.partylistId?._id || candidate.partylistId
      return candidatePartylistId && candidatePartylistId.toString() === partylistId
    })
  },

  // Filter candidates by position
  filterByPosition: (candidates, positionId) => {
    if (!positionId) return candidates
    
    return candidates.filter(candidate => {
      const candidatePositionId = candidate.positionId?._id || candidate.positionId
      return candidatePositionId && candidatePositionId.toString() === positionId
    })
  },

  // Search candidates
  searchCandidates: (candidates, searchTerm) => {
    if (!searchTerm || !searchTerm.trim()) return candidates
    
    const term = searchTerm.toLowerCase().trim()
    return candidates.filter(candidate => {
      const searchFields = [
        candidate.name,
        candidate.fullName,
        candidate.schoolId?.toString(),
        candidate.position,
        candidate.department,
        candidate.partylist
      ]
      
      return searchFields.some(field => 
        field && field.toString().toLowerCase().includes(term)
      )
    })
  },

  // Sort candidates
  sortCandidates: (candidates, sortBy = 'positionOrder', sortOrder = 'asc') => {
    return [...candidates].sort((a, b) => {
      let aValue = a[sortBy]
      let bValue = b[sortBy]
      
      // Handle special sorting cases
      if (sortBy === 'name') {
        aValue = a.name || a.fullName || ''
        bValue = b.name || b.fullName || ''
      }
      
      // Convert to comparable values
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue ? bValue.toLowerCase() : ''
      }
      
      if (aValue === bValue) {
        return a.candidateNumber - b.candidateNumber
      }
      
      if (sortOrder === 'desc') {
        return aValue < bValue ? 1 : -1
      } else {
        return aValue > bValue ? 1 : -1
      }
    })
  },

  // Group candidates by position
  groupByPosition: (candidates) => {
    return candidates.reduce((acc, candidate) => {
      const positionId = candidate.positionId || 'unknown'
      const positionName = candidate.position || 'Unknown Position'
      const positionOrder = candidate.positionOrder || 999
      
      if (!acc[positionId]) {
        acc[positionId] = {
          positionId,
          positionName,
          positionOrder,
          candidates: []
        }
      }
      
      acc[positionId].candidates.push(candidate)
      return acc
    }, {})
  },

  // Handle API errors with specific messages
  handleSSGError: (error) => {
    if (error.response?.data?.message) {
      const message = error.response.data.message
      
      if (message.includes('registered voter')) {
        return 'Only registered voters can be SSG candidates'
      } else if (message.includes('already a candidate')) {
        return 'This voter is already a candidate in this SSG election'
      } else if (message.includes('already a member')) {
        return 'This voter is already a member of another partylist in this election'
      } else if (message.includes('Candidate number already exists')) {
        return 'This candidate number is already taken for this position'
      }
    }
    
    return error.message || 'An error occurred while processing the SSG candidate'
  },

  // Batch operations
  batchUpdate: async (candidateIds, updateData) => {
    const promises = candidateIds.map(id => 
      candidatesAPI.update(id, updateData)
    )
    
    const results = await Promise.allSettled(promises)
    return {
      successful: results.filter(r => r.status === 'fulfilled').map(r => r.value),
      failed: results.filter(r => r.status === 'rejected').map(r => r.reason)
    }
  },

  batchDelete: async (candidateIds) => {
    const promises = candidateIds.map(id => candidatesAPI.delete(id))
    
    const results = await Promise.allSettled(promises)
    return {
      successful: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').map(r => r.reason)
    }
  }
}