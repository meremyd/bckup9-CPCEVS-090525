import api from '../api'

export const candidatesAPI = {
  // Admin/Committee - Get all candidates (SSG and Departmental)
  getAll: async (params = {}) => {
    const { page = 1, limit = 10, type, electionId, positionId, status } = params
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(type && { type }),
      ...(electionId && { electionId }),
      ...(positionId && { positionId }),
      ...(status && { status })
    })
    
    const response = await api.get(`/candidates?${queryParams}`)
    return response.data
  },
  
  // Get candidate by ID (SSG and Departmental)
  getById: async (id) => {
    const response = await api.get(`/candidates/${id}`)
    return response.data
  },
  
  // Create candidate (SSG and Departmental)
  create: async (candidateData) => {
    const response = await api.post('/candidates', candidateData)
    return response.data
  },
  
  // Update candidate (SSG and Departmental)
  update: async (id, candidateData) => {
    const response = await api.put(`/candidates/${id}`, candidateData)
    return response.data
  },
  
  // Delete candidate (SSG and Departmental)
  delete: async (id) => {
    const response = await api.delete(`/candidates/${id}`)
    return response.data
  },
  
  // Upload campaign picture (SSG only)
  uploadCampaignPicture: async (id, imageData) => {
    const response = await api.put(`/candidates/${id}/campaign-picture`, { campaignPicture: imageData })
    return response.data
  },
  
  // Get candidates by election (SSG and Departmental) - FIXED
  getByElection: async (electionId, type, params = {}) => {
    const { positionId, partylistId, status } = params
    const queryParams = new URLSearchParams({
      type,
      ...(positionId && { positionId }),
      ...(partylistId && { partylistId }),
      ...(status && { status })
    })
    
    const response = await api.get(`/candidates/election/${electionId}?${queryParams}`)
    return response.data
  },

  // Voter - Get candidates for voting (with eligibility check) - FIXED
  getForVoter: async (electionId, type) => {
    const response = await api.get(`/candidates/voter/election/${electionId}?type=${type}`)
    return response.data
  },

  ssg: {
    // Get all SSG candidates - FIXED to match route
    getAll: async (params = {}) => {
      const { page = 1, limit = 10, electionId, positionId, status } = params
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(electionId && { electionId }),
        ...(positionId && { positionId }),
        ...(status && { status })
      })
      
      const response = await api.get(`/candidates/ssg?${queryParams}`)
      return response.data
    },

    // Get SSG candidate by ID - FIXED to match route
    getById: async (id) => {
      const response = await api.get(`/candidates/ssg/${id}`)
      return response.data
    },

    // Get SSG candidates by election - FIXED to match route exactly
    getByElection: async (electionId, params = {}) => {
      const { positionId, partylistId, status } = params
      const queryParams = new URLSearchParams({
        ...(positionId && { positionId }),
        ...(partylistId && { partylistId }),
        ...(status && { status })
      })
      
      const queryString = queryParams.toString()
      const url = queryString 
        ? `/candidates/ssg/election/${electionId}?${queryString}` 
        : `/candidates/ssg/election/${electionId}`
      
      console.log('SSG Candidates API URL:', url)
      
      const response = await api.get(url)
      return response.data
    },

    // Create SSG candidate - FIXED to match route
    create: async (candidateData) => {
      const response = await api.post('/candidates/ssg', candidateData)
      return response.data
    },

    // Update SSG candidate - FIXED to match route
    update: async (id, candidateData) => {
      const response = await api.put(`/candidates/ssg/${id}`, candidateData)
      return response.data
    },

    // Delete SSG candidate - FIXED to match route
    delete: async (id) => {
      const response = await api.delete(`/candidates/ssg/${id}`)
      return response.data
    },

    // Get SSG candidates for voter - FIXED to match route exactly
    getForVoter: async (electionId) => {
      const response = await api.get(`/candidates/ssg/voter/election/${electionId}`)
      return response.data
    }
  },

  departmental: {
    // Get all Departmental candidates - FIXED to match route
    getAll: async (params = {}) => {
      const { page = 1, limit = 10, electionId, positionId, status } = params
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(electionId && { electionId }),
        ...(positionId && { positionId }),
        ...(status && { status })
      })
      
      const response = await api.get(`/candidates/departmental?${queryParams}`)
      return response.data
    },

    // Get Departmental candidate by ID - FIXED to match route
    getById: async (id) => {
      const response = await api.get(`/candidates/departmental/${id}`)
      return response.data
    },

    // Get Departmental candidates by election - FIXED to match route exactly
    getByElection: async (electionId, params = {}) => {
      const { positionId, status } = params
      const queryParams = new URLSearchParams({
        ...(positionId && { positionId }),
        ...(status && { status })
      })
      
      const queryString = queryParams.toString()
      const url = queryString 
        ? `/candidates/departmental/election/${electionId}?${queryString}` 
        : `/candidates/departmental/election/${electionId}`
      
      const response = await api.get(url)
      return response.data
    },

    // Create Departmental candidate - FIXED to match route
    create: async (candidateData) => {
      const response = await api.post('/candidates/departmental', { 
        ...candidateData, 
        ssgElectionId: null
      })
      return response.data
    },

    // Update Departmental candidate - FIXED to match route
    update: async (id, candidateData) => {
      const response = await api.put(`/candidates/departmental/${id}`, candidateData)
      return response.data
    },

    // Delete Departmental candidate - FIXED to match route
    delete: async (id) => {
      const response = await api.delete(`/candidates/departmental/${id}`)
      return response.data
    },

    // Get Departmental candidates for voter - FIXED to match route exactly
    getForVoter: async (electionId) => {
      const response = await api.get(`/candidates/departmental/voter/election/${electionId}`)
      return response.data
    }
  },

  // Export candidates data
  export: async (params = {}) => {
    const { type, electionId, format = 'csv' } = params
    const queryParams = new URLSearchParams({
      format,
      ...(type && { type }),
      ...(electionId && { electionId })
    })
    
    const response = await api.get(`/candidates/export?${queryParams}`, {
      responseType: 'blob'
    })
    return response.data
  },

  // Frontend utility functions (keeping these as they don't involve API calls)
  processForTable: (candidates) => {
    return candidates.map(candidate => ({
      id: candidate._id,
      candidateNumber: candidate.candidateNumber,
      name: candidate.fullName || 'Unknown',
      schoolId: candidate.voterId?.schoolId || 'N/A',
      position: candidate.positionId?.positionName || 'Unknown Position',
      department: candidate.voterId?.departmentId?.departmentCode || 'Unknown',
      yearLevel: candidate.voterId?.yearLevel || 'N/A',
      partylist: candidate.partylistId?.partylistName || 'Independent',
      electionType: candidate.electionType,
      isActive: candidate.isActive,
      platform: candidate.platform
    }))
  },

  searchCandidates: (candidates, searchTerm) => {
    if (!searchTerm) return candidates
    
    const term = searchTerm.toLowerCase()
    return candidates.filter(candidate => {
      const name = candidate.fullName?.toLowerCase() || ''
      const schoolId = candidate.voterId?.schoolId?.toString() || ''
      const position = candidate.positionId?.positionName?.toLowerCase() || ''
      const platform = candidate.platform?.toLowerCase() || ''
      
      return name.includes(term) || 
             schoolId.includes(term) || 
             position.includes(term) ||
             platform.includes(term)
    })
  },

  paginateResults: (candidates, page = 1, limit = 10) => {
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    
    return {
      data: candidates.slice(startIndex, endIndex),
      totalPages: Math.ceil(candidates.length / limit),
      currentPage: page,
      total: candidates.length,
      hasNext: endIndex < candidates.length,
      hasPrev: page > 1
    }
  },

  getCandidateImageUrl: (candidateId) => {
    return `/api/candidates/${candidateId}/image`
  },

  generateCandidateCard: (candidate) => {
    return {
      id: candidate._id,
      candidateNumber: candidate.candidateNumber,
      name: candidate.fullName || 'Unknown Candidate',
      position: candidate.positionId?.positionName || 'Unknown Position',
      partylist: candidate.partylistId?.partylistName || 'Independent',
      department: candidate.voterId?.departmentId?.departmentCode || 'Unknown',
      yearLevel: candidate.voterId?.yearLevel || 'N/A',
      platform: candidate.platform || 'No platform provided',
      hasImage: !!(candidate.campaignPicture && candidate.campaignPicture.length > 0),
      imageUrl: candidate.campaignPicture ? `data:image/jpeg;base64,${candidate.campaignPicture.toString('base64')}` : null,
      isActive: candidate.isActive,
      electionType: candidate.electionType
    }
  },

  validateCandidateForm: (formData) => {
    const errors = {}
    
    if (!formData.voterId) {
      errors.voterId = 'Voter selection is required'
    }
    
    if (!formData.positionId) {
      errors.positionId = 'Position selection is required'
    }
    
    if (!formData.ssgElectionId && !formData.deptElectionId) {
      errors.election = 'Election selection is required'
    }
    
    if (formData.ssgElectionId && formData.deptElectionId) {
      errors.election = 'Cannot select both SSG and Departmental elections'
    }
    
    if (formData.candidateNumber && (isNaN(formData.candidateNumber) || formData.candidateNumber < 1)) {
      errors.candidateNumber = 'Candidate number must be a positive number'
    }
    
    if (formData.partylistId && formData.deptElectionId) {
      errors.partylist = 'Partylists are only available for SSG elections'
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  }
}