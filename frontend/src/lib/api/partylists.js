import api from '../api'

export const partylistsAPI = {
  // ==================== STAFF/ADMIN PARTYLIST METHODS ====================
  
  // Get all partylists with optional filtering (Staff)
  getAll: async (params = {}) => {
    try {
      const response = await api.get('/partylists/user/', { params })
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },
  
  // Get partylist by ID with candidates and statistics (Staff)
  getById: async (id) => {
    try {
      const response = await api.get(`/partylists/user/${id}`)
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },
  
  // Get partylist logo (Staff)
  getLogo: async (id) => {
    try {
      const response = await api.get(`/partylists/user/${id}/logo`, {
        responseType: 'blob'
      })
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Get logo URL for img src (Staff)
  getLogoUrl: (id) => {
    return `/api/partylists/user/${id}/logo`
  },
  
  // Get partylist platform image (Staff)
  getPlatform: async (id) => {
    try {
      const response = await api.get(`/partylists/user/${id}/platform`, {
        responseType: 'blob'
      })
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Get platform URL for img src (Staff)
  getPlatformUrl: (id) => {
    return `/api/partylists/user/${id}/platform`
  },
  
  // Create new partylist (Staff)
  create: async (partylistData) => {
    try {
      const response = await api.post('/partylists/user/', partylistData)
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },
  
  // Update partylist (Staff)
  update: async (id, partylistData) => {
    try {
      const response = await api.put(`/partylists/user/${id}`, partylistData)
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },
  
  // Delete partylist (Staff)
  delete: async (id, force = false) => {
    try {
      const params = force ? { force: true } : {}
      const response = await api.delete(`/partylists/user/${id}`, { params })
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },
  
  // Get partylists by SSG election ID (Staff)
  getBySSGElection: async (ssgElectionId) => {
    try {
      const response = await api.get(`/partylists/user/ssg-election/${ssgElectionId}`)
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },
  
  // Get detailed partylist statistics (Staff)
  getStatistics: async (id) => {
    try {
      const response = await api.get(`/partylists/user/${id}/statistics`)
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // ==================== VOTER PARTYLIST METHODS (READ-ONLY) ====================
  
  voter: {
    // Get all partylists with optional filtering (Voter)
    getAll: async (params = {}) => {
      try {
        const response = await api.get('/partylists/voter/', { params })
        return response.data
      } catch (error) {
        throw error.response?.data || error.message
      }
    },
    
    // Get partylist by ID with candidates and statistics (Voter)
    getById: async (id) => {
      try {
        const response = await api.get(`/partylists/voter/${id}`)
        return response.data
      } catch (error) {
        throw error.response?.data || error.message
      }
    },
    
    // Get partylist logo (Voter)
    getLogo: async (id) => {
      try {
        const response = await api.get(`/partylists/voter/${id}/logo`, {
          responseType: 'blob'
        })
        return response.data
      } catch (error) {
        throw error.response?.data || error.message
      }
    },

    // Get logo URL for img src (Voter)
    getLogoUrl: (id) => {
      return `/api/partylists/voter/${id}/logo`
    },
    
    // Get partylist platform image (Voter)
    getPlatform: async (id) => {
      try {
        const response = await api.get(`/partylists/voter/${id}/platform`, {
          responseType: 'blob'
        })
        return response.data
      } catch (error) {
        throw error.response?.data || error.message
      }
    },

    // Get platform URL for img src (Voter)
    getPlatformUrl: (id) => {
      return `/api/partylists/voter/${id}/platform`
    },
    
    // Get partylists by SSG election ID (Voter)
    getBySSGElection: async (ssgElectionId) => {
      try {
        const response = await api.get(`/partylists/voter/ssg-election/${ssgElectionId}`)
        return response.data
      } catch (error) {
        throw error.response?.data || error.message
      }
    },
    
    // Get detailed partylist statistics (Voter)
    getStatistics: async (id) => {
      try {
        const response = await api.get(`/partylists/voter/${id}/statistics`)
        return response.data
      } catch (error) {
        throw error.response?.data || error.message
      }
    }
  },

  // ==================== UTILITY FUNCTIONS (UNCHANGED) ====================

  // Validate partylist form data
  validatePartylistForm: (formData) => {
    const errors = {}

    if (!formData.partylistId || formData.partylistId.trim() === '') {
      errors.partylistId = 'Partylist ID is required'
    }

    if (!formData.ssgElectionId) {
      errors.ssgElectionId = 'SSG Election selection is required'
    }

    if (!formData.partylistName || formData.partylistName.trim() === '') {
      errors.partylistName = 'Partylist name is required'
    }

    // Validate logo if provided
    if (formData.logo && typeof formData.logo === 'string') {
      if (!formData.logo.startsWith('data:image/')) {
        errors.logo = 'Logo must be a valid image file'
      } else {
        const base64Length = formData.logo.split(',')[1]?.length || 0
        const approximateSize = (base64Length * 3) / 4
        if (approximateSize > 2 * 1024 * 1024) {
          errors.logo = 'Logo file is too large (max 2MB)'
        }
      }
    }

    // Validate platform if provided
    if (formData.platform && typeof formData.platform === 'string') {
      if (!formData.platform.startsWith('data:image/')) {
        errors.platform = 'Platform must be a valid image file'
      } else {
        const base64Length = formData.platform.split(',')[1]?.length || 0
        const approximateSize = (base64Length * 3) / 4
        if (approximateSize > 2 * 1024 * 1024) {
          errors.platform = 'Platform file is too large (max 2MB)'
        }
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  },

  // Process partylists for table display
  processForTable: (partylists) => {
    return partylists.map(partylist => ({
      id: partylist._id,
      partylistId: partylist.partylistId,
      partylistName: partylist.partylistName,
      ssgElectionTitle: partylist.ssgElectionId?.title || 'Unknown Election',
      ssgElectionYear: partylist.ssgElectionId?.electionYear || 'N/A',
      candidateCount: partylist.statistics?.candidateCount || 0,
      totalVotes: partylist.statistics?.totalVotes || 0,
      hasLogo: !!partylist.logo,
      hasPlatform: !!partylist.platform,
      isActive: partylist.isActive !== false
    }))
  },

  // Filter partylists by election
  filterByElection: (partylists, electionId) => {
    if (!electionId) return partylists
    
    return partylists.filter(partylist => {
      const partylistElectionId = partylist.ssgElectionId?._id || partylist.ssgElectionId
      return partylistElectionId && partylistElectionId.toString() === electionId
    })
  },

  // Search partylists
  searchPartylists: (partylists, searchTerm) => {
    if (!searchTerm || !searchTerm.trim()) return partylists
    
    const term = searchTerm.toLowerCase().trim()
    return partylists.filter(partylist => {
      const searchFields = [
        partylist.partylistId,
        partylist.partylistName,
        partylist.ssgElectionId?.title
      ]
      
      return searchFields.some(field => 
        field && field.toString().toLowerCase().includes(term)
      )
    })
  },

  // Sort partylists
  sortPartylists: (partylists, sortBy = 'partylistName', sortOrder = 'asc') => {
    return [...partylists].sort((a, b) => {
      let aValue = a[sortBy]
      let bValue = b[sortBy]
      
      if (sortBy === 'candidateCount' || sortBy === 'totalVotes') {
        aValue = a.statistics?.[sortBy] || 0
        bValue = b.statistics?.[sortBy] || 0
      }
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue ? bValue.toLowerCase() : ''
      }
      
      if (sortOrder === 'desc') {
        return aValue < bValue ? 1 : -1
      } else {
        return aValue > bValue ? 1 : -1
      }
    })
  },

  // Convert image file to base64
  fileToBase64: (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result)
      reader.onerror = error => reject(error)
    })
  },

  // Validate image file
  validateImageFile: (file, maxSizeMB = 2) => {
    const errors = []

    if (!file) {
      errors.push('No file provided')
      return { isValid: false, errors }
    }

    // Check file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
    if (!validTypes.includes(file.type)) {
      errors.push('File must be an image (JPEG, PNG, or GIF)')
    }

    // Check file size
    const maxSize = maxSizeMB * 1024 * 1024
    if (file.size > maxSize) {
      errors.push(`File size must be less than ${maxSizeMB}MB`)
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  },

  // Create blob URL from base64
  createBlobUrl: (base64Data) => {
    try {
      const byteString = atob(base64Data.split(',')[1])
      const mimeString = base64Data.split(',')[0].split(':')[1].split(';')[0]
      
      const ab = new ArrayBuffer(byteString.length)
      const ia = new Uint8Array(ab)
      
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i)
      }
      
      const blob = new Blob([ab], { type: mimeString })
      return URL.createObjectURL(blob)
    } catch (error) {
      console.error('Error creating blob URL:', error)
      return null
    }
  },

  // Get partylist status color
  getStatusColor: (isActive) => {
    return isActive ? 'green' : 'red'
  },

  // Get partylist status text
  getStatusText: (isActive) => {
    return isActive ? 'Active' : 'Inactive'
  },

  // Format partylist for display
  formatForDisplay: (partylist) => {
    return {
      id: partylist._id,
      partylistId: partylist.partylistId,
      partylistName: partylist.partylistName,
      election: partylist.ssgElectionId?.title || 'Unknown Election',
      electionYear: partylist.ssgElectionId?.electionYear || 'N/A',
      candidateCount: partylist.statistics?.candidateCount || partylist.candidateCount || 0,
      totalVotes: partylist.statistics?.totalVotes || partylist.totalVotes || 0,
      hasLogo: !!partylist.logo,
      hasPlatform: !!partylist.platform,
      isActive: partylist.isActive !== false,
      statusText: partylistsAPI.getStatusText(partylist.isActive),
      statusColor: partylistsAPI.getStatusColor(partylist.isActive)
    }
  }
}