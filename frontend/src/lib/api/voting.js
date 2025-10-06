import api from '../api'

export const votingAPI = {
  // ===== SSG ELECTION VOTING APIs =====
  
  // Get all active SSG elections for voters
  getActiveSSGElections: async () => {
    try {
      const response = await api.get('/voting/voter/ssg-elections/active')
      return response.data
    } catch (error) {
      console.error('Error fetching active SSG elections:', error)
      throw error
    }
  },

  // Cast SSG vote (all positions at once)
  castSSGVote: async (voteData) => {
    try {
      const response = await api.post('/voting/voter/ssg-elections/vote', voteData)
      return response.data
    } catch (error) {
      console.error('Error casting SSG vote:', error)
      throw error
    }
  },

  // Get SSG voting status for current voter
  getSSGVotingStatus: async () => {
    try {
      const response = await api.get('/voting/voter/ssg-elections/status')
      return response.data
    } catch (error) {
      console.error('Error fetching SSG voting status:', error)
      throw error
    }
  },

  // Get voter's SSG voting history
  getMySSGVotes: async () => {
    try {
      const response = await api.get('/voting/voter/ssg-elections/my-votes')
      return response.data
    } catch (error) {
      console.error('Error fetching SSG voting history:', error)
      throw error
    }
  },

  // ===== DEPARTMENTAL ELECTION VOTING APIs =====

  // Get all active departmental elections for voter's department
  getActiveDepartmentalElections: async () => {
    try {
      const response = await api.get('/voting/voter/departmental-elections/active')
      return response.data
    } catch (error) {
      console.error('Error fetching active departmental elections:', error)
      throw error
    }
  },

  // Cast departmental vote (position by position)
  castDepartmentalVote: async (voteData) => {
    try {
      const response = await api.post('/voting/voter/departmental-elections/vote', voteData)
      return response.data
    } catch (error) {
      console.error('Error casting departmental vote:', error)
      throw error
    }
  },

  // Get departmental voting status for current voter
  getDepartmentalVotingStatus: async () => {
    try {
      const response = await api.get('/voting/voter/departmental-elections/status')
      return response.data
    } catch (error) {
      console.error('Error fetching departmental voting status:', error)
      throw error
    }
  },

  // Get voter's departmental voting history
  getMyDepartmentalVotes: async () => {
    try {
      const response = await api.get('/voting/voter/departmental-elections/my-votes')
      return response.data
    } catch (error) {
      console.error('Error fetching departmental voting history:', error)
      throw error
    }
  },

  // ===== STAFF/USER ELECTION DETAILS APIs =====

  // Get SSG election details with positions and candidates (Staff)
  getSSGElectionDetails: async (electionId) => {
    try {
      const response = await api.get(`/voting/user/ssg-elections/${electionId}/details`)
      return response.data
    } catch (error) {
      console.error(`Error fetching SSG election details for ${electionId}:`, error)
      throw error
    }
  },

  // Get SSG election candidates (Staff)
  getSSGElectionCandidates: async (electionId) => {
    try {
      const response = await api.get(`/voting/user/ssg-elections/${electionId}/candidates`)
      return response.data
    } catch (error) {
      console.error(`Error fetching SSG election candidates for ${electionId}:`, error)
      throw error
    }
  },

  // Get departmental election details with positions and candidates (Staff)
  getDepartmentalElectionDetails: async (electionId) => {
    try {
      const response = await api.get(`/voting/user/departmental-elections/${electionId}/details`)
      return response.data
    } catch (error) {
      console.error(`Error fetching departmental election details for ${electionId}:`, error)
      throw error
    }
  },

  // Get departmental election candidates (Staff)
  getDepartmentalElectionCandidates: async (electionId) => {
    try {
      const response = await api.get(`/voting/user/departmental-elections/${electionId}/candidates`)
      return response.data
    } catch (error) {
      console.error(`Error fetching departmental election candidates for ${electionId}:`, error)
      throw error
    }
  },

  // ===== UTILITY METHODS =====

  // Format vote data for SSG elections
  formatSSGVoteData: (electionId, positionVotes) => {
    return {
      ssgElectionId: electionId,
      votes: positionVotes.map(vote => ({
        positionId: vote.positionId,
        candidateId: vote.candidateId
      }))
    }
  },

  // Format vote data for departmental elections  
  formatDepartmentalVoteData: (electionId, positionId, candidateId) => {
    return {
      deptElectionId: electionId,
      positionId: positionId,
      candidateId: candidateId
    }
  },

  // Check if election is currently active for voting
  isElectionVotingActive: (election) => {
    if (!election || election.status !== 'active') return false

    const now = new Date()
    const electionDate = new Date(election.electionDate)

    // Check if election date has passed
    if (electionDate > now) return false

    // Check ballot times if specified
    if (election.ballotOpenTime && election.ballotCloseTime) {
      const currentTime = now.toTimeString().slice(0, 8)
      return currentTime >= election.ballotOpenTime && currentTime <= election.ballotCloseTime
    }

    return true
  },

  // Get ballot status information
  getBallotStatus: (election) => {
    if (!election) return { status: 'unknown', message: 'No election data' }

    const now = new Date()
    const electionDate = new Date(election.electionDate)

    if (election.status !== 'active') {
      return { 
        status: election.status, 
        message: `Election is ${election.status}` 
      }
    }

    // Check election date
    if (electionDate > now) {
      const daysUntil = Math.ceil((electionDate - now) / (1000 * 60 * 60 * 24))
      return {
        status: 'scheduled',
        message: `Election starts in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`,
        electionDate: election.electionDate
      }
    }

    // Check ballot times
    if (election.ballotOpenTime && election.ballotCloseTime) {
      const [openHours, openMinutes] = election.ballotOpenTime.split(':').map(Number)
      const [closeHours, closeMinutes] = election.ballotCloseTime.split(':').map(Number)
      
      const openDateTime = new Date(electionDate)
      openDateTime.setHours(openHours, openMinutes, 0, 0)
      
      const closeDateTime = new Date(electionDate)
      closeDateTime.setHours(closeHours, closeMinutes, 0, 0)

      if (now < openDateTime) {
        const timeDiff = openDateTime - now
        const hoursUntil = Math.floor(timeDiff / (1000 * 60 * 60))
        const minutesUntil = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
        
        return {
          status: 'scheduled',
          message: `Voting opens in ${hoursUntil}h ${minutesUntil}m`,
          openTime: election.ballotOpenTime,
          closeTime: election.ballotCloseTime
        }
      }

      if (now > closeDateTime) {
        return {
          status: 'closed',
          message: 'Voting has ended',
          openTime: election.ballotOpenTime,
          closeTime: election.ballotCloseTime
        }
      }

      // Currently open
      const timeDiff = closeDateTime - now
      const hoursRemaining = Math.floor(timeDiff / (1000 * 60 * 60))
      const minutesRemaining = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
      
      return {
        status: 'open',
        message: `Voting closes in ${hoursRemaining}h ${minutesRemaining}m`,
        openTime: election.ballotOpenTime,
        closeTime: election.ballotCloseTime,
        timeRemaining: {
          hours: hoursRemaining,
          minutes: minutesRemaining,
          totalMinutes: Math.floor(timeDiff / (1000 * 60))
        }
      }
    }

    // No specific ballot times - check if it's election day
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const electionDay = new Date(electionDate)
    electionDay.setHours(0, 0, 0, 0)

    if (today.getTime() === electionDay.getTime()) {
      return {
        status: 'open',
        message: 'Voting is open all day'
      }
    }

    return {
      status: 'closed',
      message: 'Voting period has ended'
    }
  },

  // Format time for display (24-hour to 12-hour)
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

  // Group candidates by position
  groupCandidatesByPosition: (candidates) => {
    const grouped = {}
    
    candidates.forEach(candidate => {
      const positionId = candidate.positionId._id || candidate.positionId
      const positionName = candidate.positionId.positionName || 'Unknown Position'
      
      if (!grouped[positionId]) {
        grouped[positionId] = {
          position: {
            _id: positionId,
            positionName: positionName,
            positionOrder: candidate.positionId.positionOrder || 0,
            maxVotes: candidate.positionId.maxVotes || 1
          },
          candidates: []
        }
      }
      
      grouped[positionId].candidates.push(candidate)
    })
    
    // Sort candidates within each position by candidate number
    Object.values(grouped).forEach(positionGroup => {
      positionGroup.candidates.sort((a, b) => a.candidateNumber - b.candidateNumber)
    })
    
    return grouped
  },

  // Validate vote selection for SSG
  validateSSGVoteSelection: (positions, selectedVotes) => {
    const errors = []
    const selectedPositions = new Set()
    
    selectedVotes.forEach(vote => {
      if (!vote.positionId || !vote.candidateId) {
        errors.push('Invalid vote structure')
        return
      }
      
      // Check for duplicate position selection
      if (selectedPositions.has(vote.positionId)) {
        errors.push('Cannot vote for multiple candidates in the same position')
        return
      }
      selectedPositions.add(vote.positionId)
      
      // Validate position exists
      const position = positions.find(p => p._id === vote.positionId)
      if (!position) {
        errors.push(`Invalid position selected: ${vote.positionId}`)
        return
      }
      
      // Validate candidate belongs to position
      const candidate = position.candidates?.find(c => c._id === vote.candidateId)
      if (!candidate) {
        errors.push(`Invalid candidate selected for position: ${position.positionName}`)
      }
    })
    
    return {
      isValid: errors.length === 0,
      errors
    }
  },

  // Validate vote selection for departmental
  validateDepartmentalVoteSelection: (position, candidateId) => {
    const errors = []
    
    if (!position) {
      errors.push('No position provided')
    }
    
    if (!candidateId) {
      errors.push('No candidate selected')
    }
    
    if (position && candidateId) {
      const candidate = position.candidates?.find(c => c._id === candidateId)
      if (!candidate) {
        errors.push(`Invalid candidate selected for position: ${position.positionName}`)
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  },

  // Get voting summary
  getVotingSummary: (votingHistory) => {
    const summary = {
      totalElections: 0,
      totalVotes: 0,
      ssgElections: 0,
      departmentalElections: 0,
      recentVotes: []
    }
    
    if (!votingHistory || !Array.isArray(votingHistory)) {
      return summary
    }
    
    votingHistory.forEach(record => {
      summary.totalElections++
      summary.totalVotes += record.totalVotes || record.votes?.length || 0
      
      // Determine election type
      if (record.election?.ssgElectionId) {
        summary.ssgElections++
      } else if (record.election?.deptElectionId) {
        summary.departmentalElections++
      }
      
      // Add to recent votes (last 5)
      if (summary.recentVotes.length < 5) {
        summary.recentVotes.push({
          electionTitle: record.election?.title || 'Unknown Election',
          electionType: record.election?.ssgElectionId ? 'SSG' : 'Departmental',
          submittedAt: record.submittedAt,
          voteCount: record.totalVotes || record.votes?.length || 0
        })
      }
    })
    
    // Sort recent votes by date (newest first)
    summary.recentVotes.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
    
    return summary
  },

  // Format election for display
  formatElectionForDisplay: (election, hasVoted = false, votedAt = null) => {
    const ballotStatus = votingAPI.getBallotStatus(election)
    
    return {
      id: election._id,
      title: election.title,
      electionId: election.ssgElectionId || election.deptElectionId,
      status: election.status,
      electionDate: election.electionDate,
      ballotOpenTime: election.ballotOpenTime,
      ballotCloseTime: election.ballotCloseTime,
      ballotStatus: ballotStatus.status,
      ballotStatusMessage: ballotStatus.message,
      timeRemaining: ballotStatus.timeRemaining,
      type: election.ssgElectionId ? 'SSG' : 'Departmental',
      department: election.departmentId,
      hasVoted,
      votedAt,
      canVote: ballotStatus.status === 'open' && election.status === 'active' && !hasVoted,
      description: election.description,
      totalVotes: election.totalVotes || 0,
      voterTurnout: election.voterTurnout || 0
    }
  },


// Get live SSG election results (Voters)
getSSGElectionLiveResultsForVoter: async (electionId) => {
  try {
    const response = await api.get(`/voting/voter/ssg-elections/${electionId}/live-results`)
    return response.data
  } catch (error) {
    console.error(`Error fetching SSG live results for voter ${electionId}:`, error)
    throw error
  }
},

// Get live departmental election results (Voters)
getDepartmentalElectionLiveResultsForVoter: async (electionId) => {
  try {
    const response = await api.get(`/voting/voter/departmental-elections/${electionId}/live-results`)
    return response.data
  } catch (error) {
    console.error(`Error fetching departmental live results for voter ${electionId}:`, error)
    throw error
  }
},

// Get live SSG election results (Staff)
getSSGElectionLiveResults: async (electionId) => {
  try {
    const response = await api.get(`/voting/user/ssg-elections/${electionId}/live-results`)
    return response.data
  } catch (error) {
    console.error(`Error fetching SSG live results for ${electionId}:`, error)
    throw error
  }
},

// Get live departmental election results for current active position (Staff)  
getDepartmentalElectionLiveResults: async (electionId) => {
  try {
    const response = await api.get(`/voting/user/departmental-elections/${electionId}/live-results`)
    return response.data
  } catch (error) {
    console.error(`Error fetching departmental live results for ${electionId}:`, error)
    throw error
  }
},

// Helper method to format live results for display
formatLiveResults: (results, electionType) => {
  if (!results || !results.data) return null

  if (electionType === 'ssg') {
    return {
      election: results.data.election,
      positions: results.data.positions.map(pos => ({
        ...pos,
        candidates: pos.candidates.map(candidate => ({
          ...candidate,
          displayName: candidate.voterId ? 
            `${candidate.voterId.firstName} ${candidate.voterId.lastName}` : 
            'Unknown Candidate',
          isLeading: pos.candidates[0]?._id === candidate._id && candidate.voteCount > 0
        }))
      })),
      summary: results.data.summary
    }
  } else {
    // Departmental
    return {
      election: results.data.election,
      currentPosition: results.data.currentPosition,
      candidates: results.data.candidates.map(candidate => ({
        ...candidate,
        displayName: candidate.voterId ? 
          `${candidate.voterId.firstName} ${candidate.voterId.lastName}` : 
          'Unknown Candidate',
        isLeading: results.data.candidates[0]?._id === candidate._id && candidate.voteCount > 0
      })),
      summary: results.data.summary
    }
  }
},

getSSGElectionResultsByDepartmentForVoter: async (electionId, departmentId) => {
  try {
    const response = await api.get(`/voting/voter/ssg-elections/${electionId}/department-results`, {
      params: { departmentId }
    })
    return response.data
  } catch (error) {
    console.error(`Error fetching SSG department results for voter ${electionId}:`, error)
    throw error
  }
},

// Get SSG election results by department (Staff)
getSSGElectionResultsByDepartment: async (electionId, departmentId) => {
  try {
    const response = await api.get(`/voting/user/ssg-elections/${electionId}/department-results`, {
      params: { departmentId }
    })
    return response.data
  } catch (error) {
    console.error(`Error fetching SSG department results for ${electionId}:`, error)
    throw error
  }
},

// Export SSG election results (Staff)
exportSSGElectionResults: async (electionId) => {
  try {
    const response = await api.get(`/voting/user/ssg-elections/${electionId}/export`)
    return response.data
  } catch (error) {
    console.error(`Error exporting SSG election results for ${electionId}:`, error)
    throw error
  }
},

// Export departmental election results (Staff)
exportDepartmentalElectionResults: async (electionId) => {
  try {
    const response = await api.get(`/voting/user/departmental-elections/${electionId}/export`)
    return response.data
  } catch (error) {
    console.error(`Error exporting departmental election results for ${electionId}:`, error)
    throw error
  }
},

  // Helper to get count from API responses
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
    }
    
    return 0
  },


  // Error handling helper
  handleVotingError: (error) => {
    const errorResponse = {
      success: false,
      message: 'An error occurred while processing your request',
      code: 'VOTING_ERROR'
    }

    if (error.response && error.response.data) {
      errorResponse.message = error.response.data.message || errorResponse.message
      errorResponse.code = error.response.data.code || errorResponse.code
      errorResponse.statusCode = error.response.status
    } else if (error.message) {
      errorResponse.message = error.message
    }

    // Map common error scenarios
    if (errorResponse.statusCode === 400) {
      errorResponse.code = 'VALIDATION_ERROR'
    } else if (errorResponse.statusCode === 401) {
      errorResponse.code = 'AUTHENTICATION_ERROR'
      errorResponse.message = 'Please log in to continue voting'
    } else if (errorResponse.statusCode === 403) {
      errorResponse.code = 'AUTHORIZATION_ERROR'
      errorResponse.message = 'You do not have permission to perform this action'
    } else if (errorResponse.statusCode === 404) {
      errorResponse.code = 'NOT_FOUND_ERROR'
      errorResponse.message = 'The requested election or resource was not found'
    } else if (errorResponse.statusCode >= 500) {
      errorResponse.code = 'SERVER_ERROR'
      errorResponse.message = 'A server error occurred. Please try again later'
    }

    return errorResponse
  }
}