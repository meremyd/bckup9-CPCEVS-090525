import api from '../api'

export const candidatesAPI = {
  // ===== STAFF/ADMIN API METHODS =====
  
  // Get all candidates with enhanced filtering (Staff)
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
      
      const response = await api.get(`/candidates/user?${queryParams}`)
      return response.data
    } catch (error) {
      console.error('Error fetching all candidates:', error)
      throw error
    }
  },
  
  // Get candidate by ID (Staff)
  getById: async (id) => {
    try {
      const response = await api.get(`/candidates/user/${id}`)
      return response.data
    } catch (error) {
      console.error(`Error fetching candidate ${id}:`, error)
      throw error
    }
  },
  
  // Create candidate (Staff)
  create: async (candidateData) => {
    try {
      const response = await api.post('/candidates/user/', candidateData)
      return response.data
    } catch (error) {
      console.error('Error creating candidate:', error)
      throw error
    }
  },
  
  // Update candidate (Staff)
  update: async (id, candidateData) => {
    try {
      const response = await api.put(`/candidates/user/${id}`, candidateData)
      return response.data
    } catch (error) {
      console.error(`Error updating candidate ${id}:`, error)
      throw error
    }
  },
  
  // Delete candidate (Staff)
  delete: async (id) => {
    try {
      const response = await api.delete(`/candidates/user/${id}`)
      return response.data
    } catch (error) {
      console.error(`Error deleting candidate ${id}:`, error)
      throw error
    }
  },

  // Export candidates data (Staff)
  export: async (params = {}) => {
    try {
      const { type, electionId, format = 'csv' } = params
      const queryParams = new URLSearchParams({
        format,
        ...(type && { type }),
        ...(electionId && { electionId })
      })
      
      if (format === 'csv') {
        const response = await api.get(`/candidates/user/export?${queryParams}`, {
          responseType: 'blob'
        })
        return response.data
      } else {
        const response = await api.get(`/candidates/user/export?${queryParams}`)
        return response.data
      }
    } catch (error) {
      console.error('Error exporting candidates:', error)
      throw error
    }
  },

  // Campaign picture methods (Staff)
  uploadCampaignPicture: async (id, imageData) => {
    try {
      const response = await api.put(`/candidates/user/${id}/campaign-picture`, { 
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
      const response = await api.get(`/candidates/user/${id}/campaign-picture`, {
        responseType: 'blob'
      })
      return response.data
    } catch (error) {
      console.error(`Error fetching campaign picture for candidate ${id}:`, error)
      throw error
    }
  },

  getCampaignPictureUrl: (candidateId) => {
    return `/api/candidates/user/${candidateId}/campaign-picture`
  },

  // Credentials methods (Staff)
  uploadCredentials: async (id, credentialsData) => {
    try {
      if (typeof credentialsData === 'string' && !credentialsData.startsWith('data:image/')) {
        throw new Error('Credentials must be a valid image file')
      }

      const response = await api.put(`/candidates/user/${id}/credentials`, { 
        credentials: credentialsData 
      })
      return response.data
    } catch (error) {
      console.error(`Error uploading credentials image for candidate ${id}:`, error)
      
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
      const response = await api.get(`/candidates/user/${id}/credentials`, {
        responseType: 'blob'
      })
      return response.data
    } catch (error) {
      console.error(`Error fetching credentials image for candidate ${id}:`, error)
      throw error
    }
  },

  getCredentialsUrl: (candidateId) => {
    return `/api/candidates/user/${candidateId}/credentials`
  },

  // ===== SSG SPECIFIC METHODS (STAFF) =====
  
  ssg: {
    // Get all SSG candidates (Staff)
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
        
        const response = await api.get(`/candidates/user/ssg?${queryParams}`)
        return response.data
      } catch (error) {
        console.error('Error fetching SSG candidates:', error)
        throw error
      }
    },

    // Get SSG candidate by ID (Staff)
    getById: async (id) => {
      try {
        const response = await api.get(`/candidates/user/ssg/${id}`)
        return response.data
      } catch (error) {
        console.error(`Error fetching SSG candidate ${id}:`, error)
        throw error
      }
    },

    // Create SSG candidate (Staff)
    create: async (candidateData) => {
      try {
        const cleanedData = {
          voterId: candidateData.voterId,
          positionId: candidateData.positionId,
          ssgElectionId: candidateData.ssgElectionId || candidateData.electionId,
          isActive: candidateData.isActive !== false
        }

        if (candidateData.partylistId) {
          cleanedData.partylistId = candidateData.partylistId
        }

        if (candidateData.candidateNumber) {
          cleanedData.candidateNumber = candidateData.candidateNumber
        }

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
        
        const response = await api.post('/candidates/user/ssg', cleanedData)
        
        console.log('SSG candidate created successfully:', response.data)
        return response.data
      } catch (error) {
        console.error('Error creating SSG candidate:', error)
        
        if (error.response?.data?.message) {
          const errorMessage = error.response.data.message
          
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
        
        throw error
      }
    },

    // Update SSG candidate (Staff)
    update: async (id, candidateData) => {
      try {
        console.log(`Updating SSG candidate ${id} with data:`, {
          ...candidateData,
          credentials: candidateData.credentials ? '[CREDENTIALS_DATA]' : candidateData.credentials
        })
        
        const response = await api.put(`/candidates/user/ssg/${id}`, candidateData)
        
        console.log('SSG candidate updated successfully:', response.data)
        return response.data
      } catch (error) {
        console.error(`Error updating SSG candidate ${id}:`, error)
        
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

    // Delete SSG candidate (Staff)
    delete: async (id) => {
      try {
        const response = await api.delete(`/candidates/user/ssg/${id}`)
        return response.data
      } catch (error) {
        console.error(`Error deleting SSG candidate ${id}:`, error)
        throw error
      }
    },

    // Get SSG candidates by election (Staff)
    getByElection: async (electionId, params = {}) => {
      try {
        const { positionId, partylistId, status } = params
        const queryParams = new URLSearchParams()
        
        if (positionId) queryParams.append('positionId', positionId)
        if (partylistId) queryParams.append('partylistId', partylistId) 
        if (status !== undefined) queryParams.append('status', status)

        const queryString = queryParams.toString()
        const url = queryString 
          ? `/candidates/user/ssg/election/${electionId}?${queryString}`
          : `/candidates/user/ssg/election/${electionId}`
        
        console.log('Making API call to SSG candidates endpoint:', url)
        
        const response = await api.get(url)
        
        console.log('SSG Candidates API Response Status:', response.status)
        console.log('SSG Candidates API Response Data keys:', Object.keys(response.data || {}))
        console.log('Candidates in response:', response.data?.data?.candidates?.length || 0)
        console.log('Positions in response:', response.data?.data?.positions?.length || 0)
        console.log('Partylists in response:', response.data?.data?.partylists?.length || 0)
        
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

    // Check candidate eligibility (Staff)
    checkEligibility: async (ssgElectionId, positionId, partylistId = null, voterId = null) => {
      try {
        let url = `/candidates/user/ssg/eligibility/${ssgElectionId}/${positionId}`
        if (partylistId) {
          url = `/candidates/user/ssg/eligibility/${ssgElectionId}/${positionId}/${partylistId}`
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

    // Get partylist candidate slots (Staff)
    getPartylistSlots: async (ssgElectionId, partylistId = null) => {
      try {
        const url = partylistId
          ? `/candidates/user/ssg/partylist-slots/${ssgElectionId}/${partylistId}`
          : `/candidates/user/ssg/partylist-slots/${ssgElectionId}`
        
        const response = await api.get(url)
        return response.data
      } catch (error) {
        console.error('Error fetching partylist candidate slots:', error)
        throw error
      }
    }
  },

  // ===== DEPARTMENTAL SPECIFIC METHODS (STAFF) =====
  
  departmental: {
    // Get all Departmental candidates (Staff)
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
        
        const response = await api.get(`/candidates/user/departmental?${queryParams}`)
        return response.data
      } catch (error) {
        console.error('Error fetching departmental candidates:', error)
        throw error
      }
    },

    // Get Departmental candidate by ID (Staff)
    getById: async (id) => {
      try {
        const response = await api.get(`/candidates/user/departmental/${id}`)
        return response.data
      } catch (error) {
        console.error(`Error fetching departmental candidate ${id}:`, error)
        throw error
      }
    },

    // Create Departmental candidate (Staff)
    create: async (candidateData) => {
      try {
        const cleanedData = {
          voterId: candidateData.voterId,
          positionId: candidateData.positionId,
          deptElectionId: candidateData.deptElectionId || candidateData.electionId,
          ssgElectionId: null,
          partylistId: null,
          isActive: candidateData.isActive !== false
        }

        if (candidateData.candidateNumber) {
          cleanedData.candidateNumber = candidateData.candidateNumber
        }

        if (candidateData.campaignPicture && 
            candidateData.campaignPicture.trim() !== '' && 
            candidateData.campaignPicture.includes('base64')) {
          cleanedData.campaignPicture = candidateData.campaignPicture
        }

        console.log('Creating departmental candidate with cleaned data:', {
          ...cleanedData,
          campaignPicture: cleanedData.campaignPicture ? '[IMAGE_DATA]' : undefined
        })
        
        const response = await api.post('/candidates/user/departmental', cleanedData)
        
        console.log('Departmental candidate created successfully:', response.data)
        return response.data
      } catch (error) {
        console.error('Error creating departmental candidate:', error)
        
        if (error.response?.data?.message) {
          const errorMessage = error.response.data.message
          
          if (errorMessage.includes('active voters')) {
            throw new Error('Only active voters can be departmental candidates')
          } else if (errorMessage.includes('class officers')) {
            throw new Error('Only class officers can be departmental candidates')
          } else if (errorMessage.includes('department')) {
            throw new Error('Officer must belong to the same department as the election')
          } else if (errorMessage.includes('already a candidate')) {
            throw new Error('This officer is already a candidate in this departmental election')
          }
        }
        
        throw error
      }
    },

    // Update Departmental candidate (Staff)
    update: async (id, candidateData) => {
      try {
        console.log(`Updating departmental candidate ${id} with data:`, {
          ...candidateData,
          campaignPicture: candidateData.campaignPicture ? '[IMAGE_DATA]' : candidateData.campaignPicture
        })
        
        const updateData = { ...candidateData }
        delete updateData.partylistId
        delete updateData.credentials
        
        const response = await api.put(`/candidates/user/departmental/${id}`, updateData)
        
        console.log('Departmental candidate updated successfully:', response.data)
        return response.data
      } catch (error) {
        console.error(`Error updating departmental candidate ${id}:`, error)
        
        if (error.response?.data?.message) {
          const errorMessage = error.response.data.message
          
          if (errorMessage.includes('active voters')) {
            throw new Error('Only active voters can be departmental candidates')
          } else if (errorMessage.includes('class officers')) {
            throw new Error('Only class officers can be departmental candidates')
          } else if (errorMessage.includes('department')) {
            throw new Error('Officer must belong to the same department as the election')
          } else if (errorMessage.includes('already a candidate')) {
            throw new Error('This officer is already a candidate in this departmental election')
          }
        }
        
        throw error
      }
    },

    // Delete Departmental candidate (Staff)
    delete: async (id) => {
      try {
        const response = await api.delete(`/candidates/user/departmental/${id}`)
        return response.data
      } catch (error) {
        console.error(`Error deleting departmental candidate ${id}:`, error)
        throw error
      }
    },

    // Get Departmental candidates by election (Staff)
    getByElection: async (electionId, params = {}) => {
      try {
        const { positionId, status } = params
        const queryParams = new URLSearchParams({
          ...(positionId && { positionId }),
          ...(status !== undefined && { status })
        })
        
        const queryString = queryParams.toString()
        const url = queryString 
          ? `/candidates/user/departmental/election/${electionId}?${queryString}` 
          : `/candidates/user/departmental/election/${electionId}`
        
        console.log('Making API call to departmental candidates endpoint:', url)
        
        const response = await api.get(url)
        
        console.log('Departmental Candidates API Response Status:', response.status)
        console.log('Departmental Candidates API Response Data keys:', Object.keys(response.data || {}))
        
        if (!response.data?.data) {
          console.error('Invalid response structure - missing data object')
          throw new Error('Invalid response format from server')
        }
        
        return response.data
      } catch (error) {
        console.error(`Error fetching departmental candidates for election ${electionId}:`, error)
        throw error
      }
    }
  },

  // ===== VOTER API METHODS =====
  
  voter: {
    // Get all candidates (Voter view)
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
        
        const response = await api.get(`/candidates/voter?${queryParams}`)
        return response.data
      } catch (error) {
        console.error('Error fetching all candidates (voter):', error)
        throw error
      }
    },

    // Get candidate by ID (Voter view)
    getById: async (id) => {
      try {
        const response = await api.get(`/candidates/voter/${id}`)
        return response.data
      } catch (error) {
        console.error(`Error fetching candidate ${id} (voter):`, error)
        throw error
      }
    },

    // Get campaign picture (Voter view)
    getCampaignPicture: async (id) => {
      try {
        const response = await api.get(`/candidates/voter/${id}/campaign-picture`, {
          responseType: 'blob'
        })
        return response.data
      } catch (error) {
        console.error(`Error fetching campaign picture for candidate ${id} (voter):`, error)
        throw error
      }
    },

    getCampaignPictureUrl: (candidateId) => {
      return `/api/candidates/voter/${candidateId}/campaign-picture`
    },

    // Get credentials (Voter view)
    getCredentials: async (id) => {
      try {
        const response = await api.get(`/candidates/voter/${id}/credentials`, {
          responseType: 'blob'
        })
        return response.data
      } catch (error) {
        console.error(`Error fetching credentials for candidate ${id} (voter):`, error)
        throw error
      }
    },

    getCredentialsUrl: (candidateId) => {
      return `/api/candidates/voter/${candidateId}/credentials`
    },

    // SSG Candidates (Voter view)
    ssg: {
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
          
          const response = await api.get(`/candidates/voter/ssg?${queryParams}`)
          return response.data
        } catch (error) {
          console.error('Error fetching SSG candidates (voter):', error)
          throw error
        }
      },

      getById: async (id) => {
        try {
          const response = await api.get(`/candidates/voter/ssg/${id}`)
          return response.data
        } catch (error) {
          console.error(`Error fetching SSG candidate ${id} (voter):`, error)
          throw error
        }
      },

      getByElection: async (electionId, params = {}) => {
        try {
          const response = await api.get(`/candidates/voter/ssg/election/${electionId}`)
          return response.data
        } catch (error) {
          console.error(`Error fetching SSG candidates for voter - election ${electionId}:`, error)
          throw error
        }
      }
    },

    // Departmental Candidates (Voter view)
    departmental: {
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
          
          const response = await api.get(`/candidates/voter/departmental?${queryParams}`)
          return response.data
        } catch (error) {
          console.error('Error fetching departmental candidates (voter):', error)
          throw error
        }
      },

      getById: async (id) => {
        try {
          const response = await api.get(`/candidates/voter/departmental/${id}`)
          return response.data
        } catch (error) {
          console.error(`Error fetching departmental candidate ${id} (voter):`, error)
          throw error
        }
      },

      getByElection: async (electionId, params = {}) => {
        try {
          const response = await api.get(`/candidates/voter/departmental/election/${electionId}`)
          return response.data
        } catch (error) {
          console.error(`Error fetching departmental candidates for voter - election ${electionId}:`, error)
          throw error
        }
      }
    }
  },

  // ===== UTILITY FUNCTIONS (Unchanged) =====
  
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

  filterByPosition: (candidates, positionId) => {
    if (!positionId) return candidates
    
    return candidates.filter(candidate => {
      const candidatePositionId = candidate.positionId?._id || candidate.positionId
      return candidatePositionId && candidatePositionId.toString() === positionId
    })
  },

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

  sortCandidates: (candidates, sortBy = 'positionOrder', sortOrder = 'asc') => {
    return [...candidates].sort((a, b) => {
      let aValue = a[sortBy]
      let bValue = b[sortBy]
      
      if (sortBy === 'name') {
        aValue = a.name || a.fullName || ''
        bValue = b.name || b.fullName || ''
      }
      
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

  validateSSGCandidateForm: (formData) => {
    const errors = {}
    
    if (!formData.voterId) {
      errors.voterId = 'Voter selection is required'
    }
    
    if (!formData.positionId) {
      errors.positionId = 'Position selection is required'
    }
    
    if (!formData.ssgElectionId && !formData.electionId) {
      errors.election = 'SSG Election selection is required'
    }
    
    if (formData.candidateNumber) {
      const num = parseInt(formData.candidateNumber)
      if (isNaN(num) || num < 1) {
        errors.candidateNumber = 'Candidate number must be a positive number'
      }
    }
    
    if (formData.credentials) {
      if (typeof formData.credentials === 'string') {
        if (!formData.credentials.startsWith('data:image/')) {
          errors.credentials = 'Credentials must be a valid image file'
        } else {
          const base64Length = formData.credentials.split(',')[1]?.length || 0
          const approximateSize = (base64Length * 3) / 4
          if (approximateSize > 5 * 1024 * 1024) {
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

  validateDepartmentalCandidateForm: (formData) => {
    const errors = {}
    
    if (!formData.voterId) {
      errors.voterId = 'Officer selection is required'
    }
    
    if (!formData.positionId) {
      errors.positionId = 'Position selection is required'
    }
    
    if (!formData.deptElectionId && !formData.electionId) {
      errors.election = 'Departmental Election selection is required'
    }
    
    if (formData.candidateNumber) {
      const num = parseInt(formData.candidateNumber)
      if (isNaN(num) || num < 1) {
        errors.candidateNumber = 'Candidate number must be a positive number'
      }
    }
    
    if (formData.partylistId) {
      errors.partylist = 'Partylists are not available for departmental elections'
    }
    
    if (formData.credentials) {
      errors.credentials = 'Credentials are not available for departmental elections'
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  }
}