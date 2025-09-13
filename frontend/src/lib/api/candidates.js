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
      console.error('Error creating candidate:', error)
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

  // Get candidates by election (generic)
  getByElection: async (electionId, type, params = {}) => {
    try {
      const { positionId, partylistId, status } = params
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

  // Voter - Get candidates for voting (generic route)
  getForVoter: async (electionId, type) => {
    try {
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
        const response = await api.post('/candidates/ssg', candidateData)
        return response.data
      } catch (error) {
        console.error('Error creating SSG candidate:', error)
        throw error
      }
    },

    // Update SSG candidate
    update: async (id, candidateData) => {
      try {
        const response = await api.put(`/candidates/ssg/${id}`, candidateData)
        return response.data
      } catch (error) {
        console.error(`Error updating SSG candidate ${id}:`, error)
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

    // Get SSG candidates by election
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
    console.log('SSG Candidates API Response Data:', response.data)
    console.log('Candidates in response:', response.data?.data?.candidates?.length || 0)
    
    // Check if we have candidates with proper structure
    if (response.data?.data?.candidates?.length > 0) {
      console.log('First candidate structure:', response.data.data.candidates[0])
      console.log('Position data available:', !!response.data.data.candidates[0]?.positionId)
      console.log('Partylist data available:', !!response.data.data.candidates[0]?.partylistId)
    }
    
    return response.data
  } catch (error) {
    console.error(`Error fetching SSG candidates for election ${electionId}:`, error)
    console.error('Error response status:', error.response?.status)
    console.error('Error response data:', error.response?.data)
    throw error
  }
},

    // Get SSG candidates for voter (uses generic voter route)
    getForVoter: async (electionId) => {
      try {
        return await candidatesAPI.getForVoter(electionId, 'ssg')
      } catch (error) {
        console.error(`Error fetching SSG candidates for voter - election ${electionId}:`, error)
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

    // Get Departmental candidates for voter (uses generic voter route)
    getForVoter: async (electionId) => {
      try {
        return await candidatesAPI.getForVoter(electionId, 'departmental')
      } catch (error) {
        console.error(`Error fetching departmental candidates for voter - election ${electionId}:`, error)
        throw error
      }
    }
  },

  // ===== UTILITY FUNCTIONS =====

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
      platform: candidate.platform || 'No platform provided',
      hasCampaignPicture: candidate.hasCampaignPicture || false
    }))
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
        candidate.platform,
        candidate.department,
        candidate.partylist
      ]
      
      return searchFields.some(field => 
        field && field.toString().toLowerCase().includes(term)
      )
    })
  },

  // Filter candidates
  filterCandidates: (candidates, filters = {}) => {
    return candidates.filter(candidate => {
      // Filter by election type
      if (filters.electionType && candidate.electionType !== filters.electionType) {
        return false
      }
      
      // Filter by status
      if (filters.status !== undefined && candidate.isActive !== (filters.status === 'active')) {
        return false
      }
      
      // Filter by position
      if (filters.positionId && candidate.positionId !== filters.positionId) {
        return false
      }
      
      // Filter by partylist
      if (filters.partylistId && candidate.partylistId !== filters.partylistId) {
        return false
      }
      
      // Filter by department
      if (filters.departmentId && candidate.departmentId !== filters.departmentId) {
        return false
      }
      
      return true
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
        // Secondary sort by candidate number
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

  // Paginate results
  paginateResults: (candidates, page = 1, limit = 10) => {
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    
    return {
      data: candidates.slice(startIndex, endIndex),
      pagination: {
        totalPages: Math.ceil(candidates.length / limit),
        currentPage: parseInt(page),
        total: candidates.length,
        hasNext: endIndex < candidates.length,
        hasPrev: page > 1,
        limit: parseInt(limit)
      }
    }
  },

  // Validate candidate form data
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
    
    // Platform validation
    if (formData.platform && formData.platform.length > 1000) {
      errors.platform = 'Platform must be 1000 characters or less'
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  },

  // Generate candidate statistics
  getStatistics: (candidates) => {
    const stats = {
      total: candidates.length,
      active: 0,
      inactive: 0,
      ssg: 0,
      departmental: 0,
      withCampaignPicture: 0,
      byPosition: {},
      byPartylist: {},
      byDepartment: {},
      byYearLevel: {}
    }

    candidates.forEach(candidate => {
      // Status count
      if (candidate.isActive) {
        stats.active++
      } else {
        stats.inactive++
      }

      // Election type count
      if (candidate.electionType === 'ssg') {
        stats.ssg++
      } else if (candidate.electionType === 'departmental') {
        stats.departmental++
      }

      // Campaign picture count
      if (candidate.hasCampaignPicture) {
        stats.withCampaignPicture++
      }

      // By position
      const position = candidate.position || 'Unknown'
      stats.byPosition[position] = (stats.byPosition[position] || 0) + 1

      // By partylist
      const partylist = candidate.partylist || 'Independent'
      stats.byPartylist[partylist] = (stats.byPartylist[partylist] || 0) + 1

      // By department
      const department = candidate.department || 'Unknown'
      stats.byDepartment[department] = (stats.byDepartment[department] || 0) + 1

      // By year level
      if (candidate.yearLevel) {
        const yearLevel = `${candidate.yearLevel}${
          candidate.yearLevel === 1 ? 'st' : 
          candidate.yearLevel === 2 ? 'nd' : 
          candidate.yearLevel === 3 ? 'rd' : 'th'
        } Year`
        stats.byYearLevel[yearLevel] = (stats.byYearLevel[yearLevel] || 0) + 1
      }
    })

    return stats
  },

  // Format candidate data for display
  formatCandidateForDisplay: (candidate) => {
    return {
      ...candidate,
      displayName: candidate.name || candidate.fullName || 'Unknown Candidate',
      displayPosition: candidate.position || 'Unknown Position',
      displayDepartment: candidate.department || 'Unknown Department',
      displayPartylist: candidate.partylist || 'Independent',
      displayYearLevel: candidate.yearLevel ? 
        `${candidate.yearLevel}${
          candidate.yearLevel === 1 ? 'st' : 
          candidate.yearLevel === 2 ? 'nd' : 
          candidate.yearLevel === 3 ? 'rd' : 'th'
        } Year` : 'N/A',
      displayStatus: candidate.isActive ? 'Active' : 'Inactive',
      displayElectionType: candidate.electionType?.toUpperCase() || 'N/A'
    }
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