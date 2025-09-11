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
  
  // Get candidates by election (SSG and Departmental)
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

  // Voter - Get candidates for voting (with eligibility check)
  getForVoter: async (electionId, type) => {
    const response = await api.get(`/candidates/voter/election/${electionId}?type=${type}`)
    return response.data
  },

  // SSG specific APIs
  ssg: {
    // Get all SSG candidates
    getAll: async (params = {}) => {
      return candidatesAPI.getAll({ ...params, type: 'ssg' })
    },

    // Get SSG candidates by election
    getByElection: async (electionId, params = {}) => {
      return candidatesAPI.getByElection(electionId, 'ssg', params)
    },

    // Create SSG candidate
    create: async (candidateData) => {
      // Ensure this is for SSG election
      return candidatesAPI.create({ 
        ...candidateData, 
        deptElectionId: null // Explicitly set as null
      })
    },

    // Upload campaign picture (SSG only)
    uploadCampaignPicture: async (id, imageData) => {
      return candidatesAPI.uploadCampaignPicture(id, imageData)
    },

    // Get SSG candidates for voter
    getForVoter: async (electionId) => {
      return candidatesAPI.getForVoter(electionId, 'ssg')
    }
  },

  // Departmental specific APIs
  departmental: {
    // Get all Departmental candidates
    getAll: async (params = {}) => {
      return candidatesAPI.getAll({ ...params, type: 'departmental' })
    },

    // Get Departmental candidates by election
    getByElection: async (electionId, params = {}) => {
      return candidatesAPI.getByElection(electionId, 'departmental', params)
    },

    // Create Departmental candidate
    create: async (candidateData) => {
      // Ensure this is for departmental election
      return candidatesAPI.create({ 
        ...candidateData, 
        ssgElectionId: null // Explicitly set as null
      })
    },

    // Get Departmental candidates for voter
    getForVoter: async (electionId) => {
      return candidatesAPI.getForVoter(electionId, 'departmental')
    }
  },

  // Frontend utility functions that don't belong in the model
  
  // Client-side data processing helpers
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

  // Client-side search and filtering
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

  // Client-side pagination
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

  // Frontend-specific display helpers
  getCandidateImageUrl: (candidateId) => {
    return `/api/candidates/${candidateId}/image`
  },

  // Generate candidate display card data
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

  // Validation helpers for forms (client-side)
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