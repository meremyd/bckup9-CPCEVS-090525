import api from '../api'

export const ballotAPI = {
  // ==================== STAFF/ADMIN SSG BALLOT METHODS ====================

  // Get all SSG ballots for selected election (Election Committee)
  getSelectedSSGElectionBallots: async (electionId, params = {}) => {
    const { page = 1, limit = 10, status } = params
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(status && { status })
    })
    
    const response = await api.get(`/ballots/user/ssg/${electionId}/ballots?${queryParams}`)
    return response.data
  },

  // Get selected SSG election ballot statistics (Election Committee)
  getSelectedSSGElectionBallotStatistics: async (electionId) => {
    const response = await api.get(`/ballots/user/ssg/${electionId}/statistics`)
    return response.data
  },

  // Preview SSG ballot for election committee
  previewSSGBallot: async (electionId) => {
    const response = await api.get(`/ballots/user/ssg/${electionId}/preview`)
    return response.data
  },

  // Get selected SSG election ballot with votes (for review - Staff)
  getSelectedSSGBallotWithVotes: async (ballotId) => {
    const response = await api.get(`/ballots/user/ssg/ballot/${ballotId}/votes`)
    return response.data
  },

  // Update SSG ballot timer (Election Committee)
  updateSSGBallotTimer: async (ballotId, additionalMinutes = 10) => {
    const response = await api.put(`/ballots/user/ssg/${ballotId}/timer`, { additionalMinutes })
    return response.data
  },
   // Update SSG ballot duration for election (Election Committee)
  updateSSGBallotDuration: async (electionId, ballotDuration) => {
    const response = await api.put(`/ballots/user/ssg/${electionId}/ballot-duration`, { ballotDuration })
    return response.data
  },

  // Submit SSG ballot (Election Committee - for testing)
  submitSelectedSSGBallot: async (ballotId, votes) => {
    const response = await api.post(`/ballots/user/ssg/${ballotId}/submit`, { votes })
    return response.data
  },

  // ==================== STAFF/ADMIN DEPARTMENTAL BALLOT METHODS ====================

  // Get departmental ballots for selected election and position
  getDepartmentalBallots: async (electionId, positionId, params = {}) => {
    const { page = 1, limit = 10, status } = params
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(status && { status })
    })
    
    const response = await api.get(`/ballots/user/departmental/${electionId}/${positionId}/ballots?${queryParams}`)
    return response.data
  },

  // Get departmental ballot statistics for selected election and position
  getDepartmentalBallotStatistics: async (electionId, positionId) => {
    const response = await api.get(`/ballots/user/departmental/${electionId}/${positionId}/statistics`)
    return response.data
  },

  // Preview departmental ballot for election committee
  previewDepartmentalBallot: async (electionId, positionId) => {
    const response = await api.get(`/ballots/user/departmental/${electionId}/${positionId}/preview`)
    return response.data
  },

  // Get positions for preview (Staff)
  getPositionsForPreview: async (electionId) => {
    const response = await api.get(`/ballots/user/departmental/${electionId}/preview-positions`)
    return response.data
  },

  // Delete departmental ballot (Election Committee)
  deleteDepartmentalBallot: async (ballotId) => {
    const response = await api.delete(`/ballots/user/departmental/${ballotId}`)
    return response.data
  },

  // Update year level restriction for departmental position (Election Committee)
  updateYearLevelRestriction: async (positionId, allowedYearLevels) => {
    const response = await api.put(`/ballots/user/departmental/position/${positionId}/year-restriction`, { allowedYearLevels })
    return response.data
  },

  // Get departmental position ballot timing
  getDepartmentalPositionBallotTiming: async (positionId) => {
  const response = await api.get(`/ballots/user/departmental/position/${positionId}/timing`)
  return response.data
},

  // Update departmental position ballot timing
  updateDepartmentalPositionBallotTiming: async (positionId, timingData) => {
  const response = await api.put(`/ballots/user/departmental/position/${positionId}/timing`, timingData)
  return response.data
},

  // Open ballot for departmental position
  openDepartmentalPositionBallot: async (positionId) => {
    const response = await api.post(`/ballots/user/departmental/position/${positionId}/open`)
    return response.data
  },

  // Close ballot for departmental position
  closeDepartmentalPositionBallot: async (positionId) => {
    const response = await api.post(`/ballots/user/departmental/position/${positionId}/close`)
    return response.data
  },

  // Update year level restriction for departmental position
  updateDepartmentalPositionYearLevel: async (positionId, allowedYearLevels) => {
    const response = await api.put(`/ballots/user/departmental/position/${positionId}/year-level`, { 
      allowedYearLevels 
    })
    return response.data
  },

  // ==================== VOTER SSG BALLOT METHODS ====================

  voter: {
    // Get voter SSG ballot status for selected election
    getVoterSelectedSSGBallotStatus: async (electionId) => {
      const response = await api.get(`/ballots/voter/ssg/${electionId}/voter-status`)
      return response.data
    },

    // Get selected SSG election ballot with votes (for review - Voter)
    getSelectedSSGBallotWithVotes: async (ballotId) => {
      const response = await api.get(`/ballots/voter/ssg/ballot/${ballotId}/votes`)
      return response.data
    },

    // Start SSG ballot with timer (Voters)
    startSSGBallot: async (electionId) => {
      const response = await api.post('/ballots/voter/ssg/start', { electionId })
      return response.data
    },

    // Submit SSG ballot (Voters)
    submitSelectedSSGBallot: async (ballotId, votes) => {
      const response = await api.post(`/ballots/voter/ssg/${ballotId}/submit`, { votes })
      return response.data
    },

    // Get available positions for departmental voting (Voters)
    getAvailablePositionsForVoting: async (electionId) => {
      const response = await api.get(`/ballots/voter/departmental/${electionId}/available-positions`)
      return response.data
    },

    // Get voter departmental ballot status
    getVoterDepartmentalBallotStatus: async (electionId, positionId) => {
      const response = await api.get(`/ballots/voter/departmental/${electionId}/${positionId}/voter-status`)
      return response.data
    },

    previewDepartmentalBallotForVoter: async (electionId, positionId) => {
      const response = await api.get(`/ballots/voter/departmental/${electionId}/${positionId}/preview`)
      return response.data
    },

    // Start departmental ballot with timer (Voters)
    startDepartmentalBallot: async (electionId, positionId) => {
      const response = await api.post('/ballots/voter/departmental/start', { electionId, positionId })
      return response.data
    },

    // Submit departmental ballot (Voters)
    submitDepartmentalBallot: async (ballotId, votes) => {
      const response = await api.post(`/ballots/voter/departmental/${ballotId}/submit`, { votes })
      return response.data
    },

    previewSSGBallot: async (electionId) => {
      const response = await api.get(`/ballots/voter/ssg/${electionId}/preview`)
      return response.data
    } 
  },

  // ==================== UTILITY FUNCTIONS (UNCHANGED) ====================

  // Check if voter can vote in SSG election
  canVoteInSSGElection: async (electionId) => {
    try {
      const status = await ballotAPI.voter.getVoterSelectedSSGBallotStatus(electionId)
      return status.canVote && !status.hasVoted
    } catch (error) {
      console.error('Error checking SSG voting eligibility:', error)
      return false
    }
  },

  // Check if voter can vote for specific departmental position
  canVoteForDepartmentalPosition: async (electionId, positionId) => {
    try {
      const status = await ballotAPI.voter.getVoterDepartmentalBallotStatus(electionId, positionId)
      return status.canVote && !status.hasVoted
    } catch (error) {
      console.error('Error checking departmental voting eligibility:', error)
      return false
    }
  },

  // Get active SSG ballot for voter (if any)
  getActiveSSGBallot: async (electionId) => {
    try {
      const status = await ballotAPI.voter.getVoterSelectedSSGBallotStatus(electionId)
      if (status.ballot && !status.ballot.isSubmitted) {
        return status.ballot
      }
      return null
    } catch (error) {
      console.error('Error getting active SSG ballot:', error)
      return null
    }
  },

  // Get active Departmental ballot for voter (if any)
  getActiveDepartmentalBallot: async (electionId, positionId = null) => {
    try {
      const status = await ballotAPI.voter.getVoterDepartmentalBallotStatus(electionId, positionId)
      if (status.ballot && !status.ballot.isSubmitted) {
        return status.ballot
      }
      return null
    } catch (error) {
      console.error('Error getting active Departmental ballot:', error)
      return null
    }
  },

  // Get voting progress for departmental elections
  getDepartmentalVotingProgress: async (electionId) => {
    try {
      const availablePositions = await ballotAPI.voter.getAvailablePositionsForVoting(electionId)
      return {
        totalPositions: availablePositions.totalPositions,
        votedPositions: availablePositions.votedPositions,
        remainingPositions: availablePositions.availablePositions.length,
        isComplete: availablePositions.isComplete,
        nextPosition: availablePositions.availablePositions[0] || null
      }
    } catch (error) {
      console.error('Error getting departmental voting progress:', error)
      return {
        totalPositions: 0,
        votedPositions: 0,
        remainingPositions: 0,
        isComplete: false,
        nextPosition: null
      }
    }
  },

  // Check if all positions have been voted for in departmental election
  hasCompletedDepartmentalVoting: async (electionId) => {
    try {
      const progress = await ballotAPI.getDepartmentalVotingProgress(electionId)
      return progress.isComplete
    } catch (error) {
      console.error('Error checking departmental voting completion:', error)
      return false
    }
  },

  // Get SSG voting progress for voter
  getSSGVotingProgress: async (electionId) => {
    try {
      const status = await ballotAPI.voter.getVoterSelectedSSGBallotStatus(electionId)
      const preview = await ballotAPI.previewSSGBallot(electionId)
      
      return {
        totalPositions: preview.totalPositions,
        hasStartedVoting: !!status.ballot,
        hasCompletedVoting: status.hasVoted,
        canVote: status.canVote,
        isVotingTime: status.election.isVotingTime,
        ballotStatus: status.ballot?.ballotStatus || 'not_started'
      }
    } catch (error) {
      console.error('Error getting SSG voting progress:', error)
      return {
        totalPositions: 0,
        hasStartedVoting: false,
        hasCompletedVoting: false,
        canVote: false,
        isVotingTime: false,
        ballotStatus: 'error'
      }
    }
  },

  // Format remaining time for display
  formatRemainingTime: (seconds) => {
    if (seconds <= 0) return "00:00"
    
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  },

  // Get year level display text
  getYearLevelText: (yearLevel) => {
    const suffixes = { 1: 'st', 2: 'nd', 3: 'rd', 4: 'th' }
    return `${yearLevel}${suffixes[yearLevel] || 'th'} Year`
  },

  // Validate year levels array
  validateYearLevels: (yearLevels) => {
    const validLevels = [1, 2, 3, 4]
    
    if (!Array.isArray(yearLevels)) {
      return { valid: false, message: "Year levels must be an array" }
    }
    
    if (yearLevels.length === 0) {
      return { valid: false, message: "At least one year level must be specified" }
    }
    
    const invalidLevels = yearLevels.filter(level => !validLevels.includes(level))
    if (invalidLevels.length > 0) {
      return { 
        valid: false, 
        message: `Invalid year levels: ${invalidLevels.join(', ')}. Valid levels are 1, 2, 3, 4` 
      }
    }
    
    return { valid: true, message: "Valid year levels" }
  },

  // Check if current time is within voting hours for SSG election
  isVotingTimeForSSG: (election) => {
    if (!election.ballotOpenTime || !election.ballotCloseTime) {
      return false
    }
    
    const now = new Date()
    const electionDate = new Date(election.electionDate)
    
    // Check if it's the election date
    if (now.toDateString() !== electionDate.toDateString()) {
      return false
    }
    
    // Parse time strings and check if current time is within voting hours
    const [openHour, openMinute] = election.ballotOpenTime.split(':').map(Number)
    const [closeHour, closeMinute] = election.ballotCloseTime.split(':').map(Number)
    
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    
    const currentTimeMinutes = currentHour * 60 + currentMinute
    const openTimeMinutes = openHour * 60 + openMinute
    const closeTimeMinutes = closeHour * 60 + closeMinute
    
    return currentTimeMinutes >= openTimeMinutes && currentTimeMinutes <= closeTimeMinutes
  },

  // Get ballot status text for display
  getBallotStatusText: (ballotStatus) => {
    const statusTexts = {
      'not_started': 'Not Started',
      'active': 'Active - In Progress',
      'expired': 'Expired',
      'submitted': 'Submitted'
    }
    
    return statusTexts[ballotStatus] || 'Unknown Status'
  },

  // Check if voter meets department requirements for departmental election
  checkDepartmentEligibility: (voterDepartment, electionDepartment) => {
    if (!voterDepartment || !electionDepartment) {
      return {
        eligible: false,
        message: "Department information missing"
      }
    }
    
    const departmentMatch = voterDepartment.college === electionDepartment.college
    
    return {
      eligible: departmentMatch,
      message: departmentMatch ? 
        "Department eligibility confirmed" : 
        "You can only vote in elections for your own department"
    }
  },

  // Get election status display information
  getElectionStatusInfo: (election) => {
    const statusInfo = {
      'upcoming': {
        color: 'blue',
        text: 'Upcoming',
        description: 'Election has not started yet'
      },
      'active': {
        color: 'green',
        text: 'Active',
        description: 'Election is currently ongoing'
      },
      'completed': {
        color: 'gray',
        text: 'Completed',
        description: 'Election has ended'
      },
      'cancelled': {
        color: 'red',
        text: 'Cancelled',
        description: 'Election has been cancelled'
      }
    }
    
    return statusInfo[election.status] || statusInfo['upcoming']
  },

  // Format election date for display
  formatElectionDate: (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    })
  },

  // Format election time for display
  formatElectionTime: (timeString) => {
    if (!timeString) return 'Not set'
    
    const [hour, minute] = timeString.split(':').map(Number)
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
    
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`
  },

  // Create vote payload for submission
  createVotePayload: (selectedCandidates) => {
    return Object.entries(selectedCandidates).map(([positionId, candidateId]) => ({
      positionId,
      candidateId
    }))
  },

  // Validate vote selections before submission
  validateVoteSelections: (selectedCandidates, ballotPreview) => {
    const errors = []
    const votes = []
    
    // Check each position
    for (const positionData of ballotPreview.ballot) {
      const positionId = positionData.position._id
      const selectedCandidateId = selectedCandidates[positionId]
      
      if (!selectedCandidateId) {
        errors.push(`No candidate selected for ${positionData.position.positionName}`)
        continue
      }
      
      // Check if selected candidate exists for this position
      const candidateExists = positionData.candidates.some(
        candidate => candidate._id === selectedCandidateId
      )
      
      if (!candidateExists) {
        errors.push(`Invalid candidate selection for ${positionData.position.positionName}`)
        continue
      }
      
      votes.push({
        positionId,
        candidateId: selectedCandidateId
      })
    }
    
    return {
      valid: errors.length === 0,
      errors,
      votes
    }
  },

  // Get timer warning thresholds
  getTimerWarningThresholds: () => ({
    critical: 60,    // 1 minute - critical warning (red)
    warning: 300,    // 5 minutes - warning (yellow)
    normal: 600      // 10 minutes - normal (green)
  }),

  // Determine timer warning level
  getTimerWarningLevel: (remainingSeconds) => {
    const thresholds = ballotAPI.getTimerWarningThresholds()
    
    if (remainingSeconds <= thresholds.critical) {
      return { level: 'critical', color: 'red', message: 'Time almost up!' }
    } else if (remainingSeconds <= thresholds.warning) {
      return { level: 'warning', color: 'yellow', message: 'Time running low' }
    } else {
      return { level: 'normal', color: 'green', message: 'Sufficient time remaining' }
    }
  }
}