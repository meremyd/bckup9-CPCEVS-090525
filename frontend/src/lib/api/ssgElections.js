import api from '../api'

export const ssgElectionsAPI = {
  // STAFF ENDPOINTS
  // Get all SSG elections with filtering and pagination
  getAll: async (params = {}) => {
    const response = await api.get('/ssgElections/user/', { params })
    return response.data
  },

  // Get SSG election by ID (Staff)
  getById: async (id) => {
    const response = await api.get(`/ssgElections/user/${id}`)
    return response.data
  },

  // Get SSG election overview with comprehensive stats
  getOverview: async (id) => {
    const response = await api.get(`/ssgElections/user/${id}/overview`)
    return response.data
  },

  // Dashboard and summary functions
  getDashboardSummary: async () => {
    const response = await api.get('/ssgElections/user/dashboard')
    return response.data
  },

  getUpcoming: async (params = {}) => {
    const response = await api.get('/ssgElections/user/upcoming', { params })
    return response.data
  },

  // Get SSG election results (Staff)
  getResults: async (id) => {
    const response = await api.get(`/ssgElections/user/${id}/results`)
    return response.data
  },

  // Get SSG election statistics (Staff)
  getStatistics: async (id) => {
    const response = await api.get(`/ssgElections/user/${id}/statistics`)
    return response.data
  },

  // Get SSG election candidates (Staff)
  getCandidates: async (id, params = {}) => {
    const response = await api.get(`/ssgElections/user/${id}/candidates`, { params })
    return response.data
  },

  // Get SSG election positions (Staff)
  getPositions: async (id, params = {}) => {
    const response = await api.get(`/ssgElections/user/${id}/positions`, { params })
    return response.data
  },

  // Get SSG election partylists (Staff)
  getPartylists: async (id, params = {}) => {
    const response = await api.get(`/ssgElections/user/${id}/partylists`, { params })
    return response.data
  },

  // Get SSG election voter participants (Staff)
  getVoterParticipants: async (id, params = {}) => {
    const response = await api.get(`/ssgElections/user/${id}/participants`, { params })
    return response.data
  },

  // Get SSG election voter turnout (Staff)
  getVoterTurnout: async (id) => {
    const response = await api.get(`/ssgElections/user/${id}/turnout`)
    return response.data
  },

  // Get SSG election ballots (Staff)
  getBallots: async (id, params = {}) => {
    const response = await api.get(`/ssgElections/user/${id}/ballots`, { params })
    return response.data
  },

  // Create new SSG election (Admin/Election Committee only)
  create: async (electionData) => {
    // Ensure time fields are properly formatted (HH:MM or null)
    const formattedData = {
      ...electionData,
      ballotOpenTime: electionData.ballotOpenTime || null,
      ballotCloseTime: electionData.ballotCloseTime || null
    }
    
    // Validate time format if provided
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    
    if (formattedData.ballotOpenTime && !timeRegex.test(formattedData.ballotOpenTime)) {
      throw new Error('Ballot open time must be in HH:MM format (e.g., 08:00)')
    }
    
    if (formattedData.ballotCloseTime && !timeRegex.test(formattedData.ballotCloseTime)) {
      throw new Error('Ballot close time must be in HH:MM format (e.g., 17:00)')
    }
    
    const response = await api.post('/ssgElections/user/', formattedData)
    return response.data
  },

  // Update SSG election (Admin/Election Committee only)
  update: async (id, electionData) => {
    // Ensure time fields are properly formatted (HH:MM or null)
    const formattedData = {
      ...electionData,
      ballotOpenTime: electionData.ballotOpenTime || null,
      ballotCloseTime: electionData.ballotCloseTime || null
    }
    
    // Validate time format if provided
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    
    if (formattedData.ballotOpenTime && !timeRegex.test(formattedData.ballotOpenTime)) {
      throw new Error('Ballot open time must be in HH:MM format (e.g., 08:00)')
    }
    
    if (formattedData.ballotCloseTime && !timeRegex.test(formattedData.ballotCloseTime)) {
      throw new Error('Ballot close time must be in HH:MM format (e.g., 17:00)')
    }
    
    const response = await api.put(`/ssgElections/user/${id}`, formattedData)
    return response.data
  },

  // Toggle SSG election status
  toggleStatus: async (id, status) => {
    const response = await api.patch(`/ssgElections/user/${id}/status`, { status })
    return response.data
  },

  // Delete SSG election (Admin only)
  delete: async (id) => {
    const response = await api.delete(`/ssgElections/user/${id}`)
    return response.data
  },

  // VOTER ENDPOINTS
  // Get all SSG elections for voters
  getAllForVoters: async (params = {}) => {
    const response = await api.get('/ssgElections/voter/', { params })
    return response.data
  },

  // Get single SSG election for voters
  getForVoters: async (id) => {
    const response = await api.get(`/ssgElections/voter/${id}`)
    return response.data
  },

  // Get SSG elections available for voting
  getForVoting: async () => {
    const response = await api.get('/ssgElections/voter/for-voting')
    return response.data
  },

  // Get SSG election results for voters
  getResultsForVoters: async (id) => {
    const response = await api.get(`/ssgElections/voter/${id}/results`)
    return response.data
  },

  // Get SSG election statistics for voters
  getStatisticsForVoters: async (id) => {
    const response = await api.get(`/ssgElections/voter/${id}/statistics`)
    return response.data
  },

  // Get candidates for voter view
  getCandidatesForVoter: async (electionId) => {
    const response = await api.get(`/ssgElections/voter/${electionId}/candidates`)
    return response.data
  },

  // Get positions for voters (same as staff for viewing)
  getPositionsForVoters: async (id, params = {}) => {
    const response = await api.get(`/ssgElections/voter/${id}/positions`, { params })
    return response.data
  },

  // Get partylists for voters (same as staff for viewing)
  getPartylistsForVoters: async (id, params = {}) => {
    const response = await api.get(`/ssgElections/voter/${id}/partylists`, { params })
    return response.data
  },

  // Utility functions for frontend state management
  isElectionActive: (election) => {
    if (!election || election.status !== 'active') return false
    
    const now = new Date()
    const electionDate = new Date(election.electionDate)
    
    // Check if it's election day and within ballot times if specified
    if (election.ballotOpenTime && election.ballotCloseTime) {
      const [openHours, openMinutes] = election.ballotOpenTime.split(':').map(Number)
      const [closeHours, closeMinutes] = election.ballotCloseTime.split(':').map(Number)
      
      const openDateTime = new Date(electionDate)
      openDateTime.setHours(openHours, openMinutes, 0, 0)
      
      const closeDateTime = new Date(electionDate)
      closeDateTime.setHours(closeHours, closeMinutes, 0, 0)
      
      return now >= openDateTime && now <= closeDateTime
    }
    
    // If no specific times, check if it's election day
    return electionDate.toDateString() === now.toDateString() || electionDate <= now
  },

  // Check if ballots are open for voting
  areBallotsOpen: (election) => {
    if (!election || election.status !== 'active') return false
    
    const now = new Date()
    const electionDate = new Date(election.electionDate)
    
    // If no ballot times specified, use entire election day
    if (!election.ballotOpenTime || !election.ballotCloseTime) {
      const startOfDay = new Date(electionDate)
      startOfDay.setHours(0, 0, 0, 0)
      
      const endOfDay = new Date(electionDate)
      endOfDay.setHours(23, 59, 59, 999)
      
      return now >= startOfDay && now <= endOfDay
    }
    
    // Use specified ballot times
    const [openHours, openMinutes] = election.ballotOpenTime.split(':').map(Number)
    const [closeHours, closeMinutes] = election.ballotCloseTime.split(':').map(Number)
    
    const openDateTime = new Date(electionDate)
    openDateTime.setHours(openHours, openMinutes, 0, 0)
    
    const closeDateTime = new Date(electionDate)
    closeDateTime.setHours(closeHours, closeMinutes, 0, 0)
    
    return now >= openDateTime && now <= closeDateTime
  },

  // Get ballot status with time information
  getBallotStatus: (election) => {
    if (!election) return { status: 'unknown', message: 'No election data' }
    
    const now = new Date()
    const electionDate = new Date(election.electionDate)
    
    // If election is not active
    if (election.status !== 'active') {
      return { 
        status: election.status, 
        message: `Election is ${election.status}` 
      }
    }
    
    // Calculate ballot open and close times
    let openDateTime, closeDateTime
    
    if (election.ballotOpenTime && election.ballotCloseTime) {
      const [openHours, openMinutes] = election.ballotOpenTime.split(':').map(Number)
      const [closeHours, closeMinutes] = election.ballotCloseTime.split(':').map(Number)
      
      openDateTime = new Date(electionDate)
      openDateTime.setHours(openHours, openMinutes, 0, 0)
      
      closeDateTime = new Date(electionDate)
      closeDateTime.setHours(closeHours, closeMinutes, 0, 0)
    } else {
      // Default to full day
      openDateTime = new Date(electionDate)
      openDateTime.setHours(0, 0, 0, 0)
      
      closeDateTime = new Date(electionDate)
      closeDateTime.setHours(23, 59, 59, 999)
    }
    
    // Determine status
    if (now < openDateTime) {
      const hoursUntilOpen = Math.floor((openDateTime - now) / (1000 * 60 * 60))
      const minutesUntilOpen = Math.floor(((openDateTime - now) % (1000 * 60 * 60)) / (1000 * 60))
      
      return {
        status: 'scheduled',
        message: `Ballots open in ${hoursUntilOpen}h ${minutesUntilOpen}m`,
        openTime: election.ballotOpenTime || '00:00',
        closeTime: election.ballotCloseTime || '23:59',
        openDateTime,
        closeDateTime
      }
    }
    
    if (now > closeDateTime) {
      return {
        status: 'closed',
        message: 'Voting has ended',
        openTime: election.ballotOpenTime || '00:00',
        closeTime: election.ballotCloseTime || '23:59',
        openDateTime,
        closeDateTime
      }
    }
    
    // Ballots are currently open
    const hoursRemaining = Math.floor((closeDateTime - now) / (1000 * 60 * 60))
    const minutesRemaining = Math.floor(((closeDateTime - now) % (1000 * 60 * 60)) / (1000 * 60))
    
    return {
      status: 'open',
      message: `Voting closes in ${hoursRemaining}h ${minutesRemaining}m`,
      openTime: election.ballotOpenTime || '00:00',
      closeTime: election.ballotCloseTime || '23:59',
      openDateTime,
      closeDateTime,
      timeRemaining: {
        hours: hoursRemaining,
        minutes: minutesRemaining,
        totalMinutes: Math.floor((closeDateTime - now) / (1000 * 60))
      }
    }
  },

  // Format time for display (HH:MM to 12-hour format)
  formatTimeDisplay: (time24) => {
    if (!time24) return ''
    
    try {
      const [hours, minutes] = time24.split(':').map(Number)
      const period = hours >= 12 ? 'PM' : 'AM'
      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
      
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
    } catch (error) {
      return 'Invalid time'
    }
  },

  // Convert 12-hour format to 24-hour format for API
  convertTo24Hour: (time12, period) => {
    if (!time12 || !period) return ''
    
    try {
      const [hours, minutes] = time12.split(':').map(Number)
      
      let hours24 = hours
      if (period === 'AM' && hours === 12) {
        hours24 = 0
      } else if (period === 'PM' && hours !== 12) {
        hours24 = hours + 12
      }
      
      return `${hours24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    } catch (error) {
      return ''
    }
  },

  // Validate time format (HH:MM)
  validateTimeFormat: (timeString) => {
    if (!timeString) return { isValid: true }
    
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    return {
      isValid: timeRegex.test(timeString),
      error: timeRegex.test(timeString) ? null : 'Time must be in HH:MM format (e.g., 08:00)'
    }
  },

  // Validate time relationship (close after open)
  validateTimeRelationship: (openTime, closeTime) => {
    if (!openTime || !closeTime) return { isValid: true }
    
    try {
      const [openHours, openMinutes] = openTime.split(':').map(Number)
      const [closeHours, closeMinutes] = closeTime.split(':').map(Number)
      
      const openTimeInMinutes = openHours * 60 + openMinutes
      const closeTimeInMinutes = closeHours * 60 + closeMinutes
      
      const isValid = closeTimeInMinutes > openTimeInMinutes
      
      return {
        isValid,
        error: isValid ? null : 'Close time must be after open time'
      }
    } catch (error) {
      return {
        isValid: false,
        error: 'Invalid time format'
      }
    }
  },

  // Comprehensive time validation
  validateBallotTimes: (openTime, closeTime) => {
    // Validate individual time formats
    const openValidation = ssgElectionsAPI.validateTimeFormat(openTime)
    if (!openValidation.isValid) {
      return { isValid: false, error: `Open time: ${openValidation.error}` }
    }
    
    const closeValidation = ssgElectionsAPI.validateTimeFormat(closeTime)
    if (!closeValidation.isValid) {
      return { isValid: false, error: `Close time: ${closeValidation.error}` }
    }
    
    // Validate time relationship
    const relationshipValidation = ssgElectionsAPI.validateTimeRelationship(openTime, closeTime)
    if (!relationshipValidation.isValid) {
      return { isValid: false, error: relationshipValidation.error }
    }
    
    return { isValid: true }
  },

  formatElectionForVoter: (election, eligibility = null) => {
    const ballotStatus = ssgElectionsAPI.getBallotStatus(election)
    
    return {
      id: election._id,
      title: election.title,
      ssgElectionId: election.ssgElectionId,
      status: election.status,
      electionDate: election.electionDate,
      ballotOpenTime: election.ballotOpenTime,
      ballotCloseTime: election.ballotCloseTime,
      ballotStatus: ballotStatus.status,
      ballotStatusMessage: ballotStatus.message,
      timeRemaining: ballotStatus.timeRemaining,
      type: 'SSG',
      eligibility,
      description: election.description,
      canVote: ballotStatus.status === 'open' && election.status === 'active'
    }
  },

  // Helper function to extract count from API responses
  getCountFromResponse: (response, countKeys = ['length', 'total', 'count']) => {
    if (Array.isArray(response)) {
      return response.length
    }
    
    if (response && typeof response === 'object') {
      // Check data property first
      if (response.data) {
        if (Array.isArray(response.data)) {
          return response.data.length
        }
        // Check for count properties in data object
        for (const key of countKeys) {
          if (response.data[key] !== undefined) {
            const value = Array.isArray(response.data[key]) ? response.data[key].length : Number(response.data[key]) || 0
            return value
          }
        }
      }
      
      // Check for count properties in root response
      for (const key of countKeys) {
        if (response[key] !== undefined) {
          const value = Array.isArray(response[key]) ? response[key].length : Number(response[key]) || 0
          return value
        }
      }
      
      // Check for common data array properties
      const dataKeys = ['candidates', 'positions', 'partylists', 'participants', 'ballots', 'results']
      for (const key of dataKeys) {
        if (response[key] && Array.isArray(response[key])) {
          return response[key].length
        }
      }
      
      // Check for summary properties
      if (response.summary) {
        for (const key of countKeys) {
          if (response.summary[key] !== undefined) {
            return Number(response.summary[key]) || 0
          }
        }
      }
    }
    
    return 0
  }
}