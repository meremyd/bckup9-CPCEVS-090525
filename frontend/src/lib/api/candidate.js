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

  // Utility functions for frontend
  
  // Check if candidate has campaign picture
  hasCampaignPicture: (candidate) => {
    return candidate.campaignPicture && candidate.campaignPicture.length > 0
  },

  // Get candidate display name
  getDisplayName: (candidate) => {
    const voter = candidate.voterId
    const middle = voter.middleName ? ` ${voter.middleName}` : ''
    return `${voter.firstName}${middle} ${voter.lastName}`
  },

  // Get candidate full info for display
  getDisplayInfo: (candidate) => {
    const voter = candidate.voterId
    const department = voter.departmentId
    
    return {
      name: candidatesAPI.getDisplayName(candidate),
      schoolId: voter.schoolId,
      department: `${department.departmentCode} - ${department.degreeProgram}`,
      college: department.college,
      yearLevel: `${voter.yearLevel}${voter.yearLevel === 1 ? 'st' : voter.yearLevel === 2 ? 'nd' : voter.yearLevel === 3 ? 'rd' : 'th'} Year`,
      candidateNumber: candidate.candidateNumber,
      position: candidate.positionId.positionName,
      partylist: candidate.partylistId?.partylistName || 'Independent',
      platform: candidate.platform,
      isActive: candidate.isActive,
      electionType: candidate.ssgElectionId ? 'SSG' : 'Departmental'
    }
  },

  // Group candidates by position
  groupByPosition: (candidates) => {
    return candidates.reduce((acc, candidate) => {
      const positionId = candidate.positionId._id
      if (!acc[positionId]) {
        acc[positionId] = {
          position: candidate.positionId,
          candidates: []
        }
      }
      acc[positionId].candidates.push(candidate)
      return acc
    }, {})
  },

  // Filter candidates by partylist
  filterByPartylist: (candidates, partylistId) => {
    if (!partylistId) return candidates
    return candidates.filter(candidate => 
      candidate.partylistId?._id === partylistId
    )
  },

  // Filter candidates by election type
  filterByType: (candidates, type) => {
    if (!type) return candidates
    if (type === 'ssg') {
      return candidates.filter(candidate => candidate.ssgElectionId)
    } else if (type === 'departmental') {
      return candidates.filter(candidate => candidate.deptElectionId)
    }
    return candidates
  },

  // Get candidates statistics
  getStatistics: (candidates) => {
    const stats = {
      total: candidates.length,
      active: 0,
      inactive: 0,
      ssg: 0,
      departmental: 0,
      byPosition: {},
      byPartylist: {},
      byDepartment: {},
      byYearLevel: {}
    }

    candidates.forEach(candidate => {
      // Active/Inactive count
      if (candidate.isActive) {
        stats.active++
      } else {
        stats.inactive++
      }

      // Election type count
      if (candidate.ssgElectionId) {
        stats.ssg++
      } else if (candidate.deptElectionId) {
        stats.departmental++
      }

      // By position
      const positionName = candidate.positionId.positionName
      stats.byPosition[positionName] = (stats.byPosition[positionName] || 0) + 1

      // By partylist
      const partylistName = candidate.partylistId?.partylistName || 'Independent'
      stats.byPartylist[partylistName] = (stats.byPartylist[partylistName] || 0) + 1

      // By department
      const departmentCode = candidate.voterId.departmentId.departmentCode
      stats.byDepartment[departmentCode] = (stats.byDepartment[departmentCode] || 0) + 1

      // By year level
      const yearLevel = `${candidate.voterId.yearLevel}${candidate.voterId.yearLevel === 1 ? 'st' : candidate.voterId.yearLevel === 2 ? 'nd' : candidate.voterId.yearLevel === 3 ? 'rd' : 'th'} Year`
      stats.byYearLevel[yearLevel] = (stats.byYearLevel[yearLevel] || 0) + 1
    })

    return stats
  },

  // Validate candidate data
  validateCandidateData: (candidateData) => {
    const errors = []

    if (!candidateData.voterId) {
      errors.push('Voter ID is required')
    }

    if (!candidateData.positionId) {
      errors.push('Position ID is required')
    }

    if (!candidateData.ssgElectionId && !candidateData.deptElectionId) {
      errors.push('Either SSG Election ID or Departmental Election ID is required')
    }

    if (candidateData.ssgElectionId && candidateData.deptElectionId) {
      errors.push('Cannot specify both SSG Election ID and Departmental Election ID')
    }

    if (candidateData.candidateNumber && candidateData.candidateNumber < 1) {
      errors.push('Candidate number must be positive')
    }

    // Partylist can only be assigned to SSG candidates
    if (candidateData.partylistId && candidateData.deptElectionId) {
      errors.push('Partylists are only available for SSG candidates')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  },

  // Check voting eligibility for voter
  checkVotingEligibility: (voter, election, electionType) => {
    const eligibility = {
      canVote: false,
      canViewResults: voter.isRegistered,
      message: '',
      reasons: []
    }

    if (!voter.isRegistered || !voter.isPasswordActive) {
      eligibility.reasons.push('Must be a registered voter')
      eligibility.message = 'You must be a registered voter to participate in elections'
      return eligibility
    }

    if (electionType === 'ssg') {
      // SSG: Only registered voters can vote
      eligibility.canVote = true
      eligibility.message = 'You are eligible to vote in this SSG election'
    } else if (electionType === 'departmental') {
      // Departmental: Only registered class officers from the same department can vote
      const departmentMatch = voter.departmentId._id === election.departmentId._id
      
      if (!departmentMatch) {
        eligibility.reasons.push('Must be from the same department')
        eligibility.message = 'You can only vote in elections for your department'
      } else if (!voter.isClassOfficer) {
        eligibility.reasons.push('Must be a class officer')
        eligibility.message = 'Only registered class officers can vote in departmental elections. You can view statistics and results.'
      } else {
        eligibility.canVote = true
        eligibility.message = 'You are eligible to vote in this departmental election'
      }
    }

    return eligibility
  },

  // Format candidate for display
  formatForDisplay: (candidate) => {
    return {
      id: candidate._id,
      candidateNumber: candidate.candidateNumber,
      name: candidatesAPI.getDisplayName(candidate),
      schoolId: candidate.voterId.schoolId,
      position: candidate.positionId.positionName,
      positionOrder: candidate.positionId.positionOrder,
      partylist: candidate.partylistId?.partylistName || null,
      platform: candidate.platform,
      department: candidate.voterId.departmentId.departmentCode,
      yearLevel: candidate.voterId.yearLevel,
      electionType: candidate.ssgElectionId ? 'SSG' : 'Departmental',
      isActive: candidate.isActive,
      hasCampaignPicture: candidatesAPI.hasCampaignPicture(candidate)
    }
  },

  // Sort candidates by position order and candidate number
  sortCandidates: (candidates) => {
    return [...candidates].sort((a, b) => {
      // First sort by position order
      if (a.positionId.positionOrder !== b.positionId.positionOrder) {
        return a.positionId.positionOrder - b.positionId.positionOrder
      }
      // Then sort by candidate number
      return a.candidateNumber - b.candidateNumber
    })
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
  }
}