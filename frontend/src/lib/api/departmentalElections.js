import api from '../api'

export const departmentalElectionsAPI = {
  // Get all departmental elections with filtering and pagination
  getAll: async (params = {}) => {
    const response = await api.get('/departmentalElections', { params })
    return response.data
  },

  // Get departmental election by ID
  getById: async (id) => {
    const response = await api.get(`/departmentalElections/${id}`)
    return response.data
  },

  // Get available departments with election statistics
  getAvailableDepartments: async () => {
    const response = await api.get('/departmentalElections/departments')
    return response.data
  },

  // Get departmental dashboard summary (Admin/Election Committee only)
  getDashboardSummary: async () => {
    const response = await api.get('/departmentalElections/dashboard')
    return response.data
  },

  // Get audit logs for departmental elections (Admin only)
  getAuditLogs: async (params = {}) => {
    const response = await api.get('/departmentalElections/audit-logs', { params })
    return response.data
  },

  // Get elections by specific department ID
  getByDepartment: async (departmentId, params = {}) => {
    const response = await api.get(`/departmentalElections/department/${departmentId}`, { params })
    return response.data
  },

  // Get departmental election results
  getResults: async (id) => {
    const response = await api.get(`/departmentalElections/${id}/results`)
    return response.data
  },

  // Get departmental election statistics (Admin/Election Committee only)
  getStatistics: async (id) => {
    const response = await api.get(`/departmentalElections/${id}/statistics`)
    return response.data
  },

  // Get candidates for voter view (Voter only)
  getCandidatesForVoter: async (electionId) => {
    const response = await api.get(`/departmentalElections/${electionId}/candidates/voter`)
    return response.data
  },

  // Create new departmental election (Admin/Election Committee only)
  create: async (electionData) => {
    const response = await api.post('/departmentalElections', electionData)
    return response.data
  },

  // Update departmental election (Admin/Election Committee only)
  update: async (id, electionData) => {
    const response = await api.put(`/departmentalElections/${id}`, electionData)
    return response.data
  },

  // Toggle departmental election status (Admin/Election Committee only)
  toggleStatus: async (id, status) => {
    const response = await api.patch(`/departmentalElections/${id}/status`, { status })
    return response.data
  },

  // Delete departmental election (Admin only)
  delete: async (id) => {
    const response = await api.delete(`/departmentalElections/${id}`)
    return response.data
  },

  // Utility functions for frontend state management
  
  // Check if user can vote in departmental election (voter role)
  canVoteInElection: async (electionId) => {
    try {
      const response = await departmentalElectionsAPI.getCandidatesForVoter(electionId)
      return response.voterEligibility?.canVote || false
    } catch (error) {
      console.error('Error checking voting eligibility:', error)
      return false
    }
  },

  // Check if user can view election details
  canViewElectionDetails: async (electionId) => {
    try {
      const response = await departmentalElectionsAPI.getCandidatesForVoter(electionId)
      return response.voterEligibility?.canViewDetails || false
    } catch (error) {
      console.error('Error checking view eligibility:', error)
      return false
    }
  },

  // Get elections available for specific department ID
  getElectionsForDepartment: async (departmentId, activeOnly = true) => {
    try {
      const response = await departmentalElectionsAPI.getByDepartment(departmentId)
      let elections = response.elections || []
      
      if (activeOnly) {
        elections = elections.filter(election => election.status === 'active')
      }
      
      return elections
    } catch (error) {
      console.error('Error getting elections for department:', error)
      return []
    }
  },

  // Get voter's eligible elections (for voter dashboard)
  getVoterEligibleElections: async () => {
    try {
      const response = await departmentalElectionsAPI.getAll({ status: 'active' })
      const elections = response.elections || []
      
      // Filter elections where voter is eligible (will be determined by backend)
      const eligibleElections = []
      
      for (const election of elections) {
        try {
          const candidatesResponse = await departmentalElectionsAPI.getCandidatesForVoter(election._id)
          if (candidatesResponse.voterEligibility?.canVote || candidatesResponse.voterEligibility?.canViewDetails) {
            eligibleElections.push({
              ...election,
              eligibility: candidatesResponse.voterEligibility
            })
          }
        } catch (error) {
          // If error accessing candidates, voter might not be eligible
          console.log(`Voter not eligible for election ${election._id}`)
        }
      }
      
      return eligibleElections
    } catch (error) {
      console.error('Error getting voter eligible elections:', error)
      return []
    }
  },

  // Check election status and voting window
  isElectionActive: (election) => {
    if (!election || election.status !== 'active') return false
    
    const now = new Date()
    const electionDate = new Date(election.electionDate)
    
    // Check if election date is today (or within voting period)
    return electionDate.toDateString() === now.toDateString() || electionDate <= now
  },

  // Get voting time info - now based on ballot timer system
  getVotingTimeInfo: (election) => {
    if (!election) return null
    
    const now = new Date()
    const electionDate = new Date(election.electionDate)
    
    if (election.status === 'upcoming') {
      return {
        status: 'upcoming',
        message: `Election scheduled for ${electionDate.toDateString()}`
      }
    } else if (election.status === 'active') {
      return {
        status: 'active',
        message: 'Election is active - voting available through ballot timer system'
      }
    } else if (election.status === 'completed') {
      return {
        status: 'completed',
        message: 'Election has been completed'
      }
    } else {
      return {
        status: election.status,
        message: `Election status: ${election.status}`
      }
    }
  },

  // Format department display name
  formatDepartmentName: (department) => {
    if (!department) return 'Unknown Department'
    
    if (typeof department === 'string') return department
    
    return `${department.departmentCode} - ${department.degreeProgram}`
  },

  // Group elections by department for display
  groupElectionsByDepartment: (elections) => {
    return elections.reduce((acc, election) => {
      const deptKey = election.departmentId?._id || election.departmentId || 'unknown'
      const deptName = departmentalElectionsAPI.formatDepartmentName(election.departmentId)
      
      if (!acc[deptKey]) {
        acc[deptKey] = {
          department: election.departmentId,
          departmentName: deptName,
          elections: []
        }
      }
      
      acc[deptKey].elections.push(election)
      return acc
    }, {})
  },

  // Validate election data before submission - updated to remove ballot timing
  validateElectionData: (electionData) => {
    const errors = []
    
    if (!electionData.deptElectionId?.trim()) {
      errors.push('Election ID is required')
    }
    
    if (!electionData.title?.trim()) {
      errors.push('Election title is required')
    }
    
    if (!electionData.departmentId) {
      errors.push('Department is required')
    }
    
    if (!electionData.electionYear) {
      errors.push('Election year is required')
    } else {
      const currentYear = new Date().getFullYear()
      const year = parseInt(electionData.electionYear)
      if (year < currentYear || year > currentYear + 5) {
        errors.push('Election year must be within current year to 5 years in the future')
      }
    }
    
    if (!electionData.electionDate) {
      errors.push('Election date is required')
    } else {
      const electionDate = new Date(electionData.electionDate)
      if (electionDate < new Date()) {
        errors.push('Election date cannot be in the past')
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  },

  // New utility functions for ballot timer system integration
  
  // Check if voter has active ballot for election
  hasActiveBallot: async (electionId) => {
    try {
      // This would typically be handled by a separate ballot API
      // For now, return false as placeholder
      return false
    } catch (error) {
      console.error('Error checking active ballot:', error)
      return false
    }
  },

  // Get ballot status for voter in election
  getBallotStatus: async (electionId) => {
    try {
      // This would typically be handled by a separate ballot API
      // Returns ballot status: 'not_started', 'active', 'expired', 'submitted'
      return { status: 'not_started', timeRemaining: null }
    } catch (error) {
      console.error('Error getting ballot status:', error)
      return { status: 'error', timeRemaining: null }
    }
  },

  getOfficersCount: async (id) => {
  const response = await api.get(`/departmentalElections/${id}/officers-count`)
  return response.data
},

checkVoterEligibility: async (id) => {
  const response = await api.get(`/departmentalElections/${id}/voter-eligibility`)
  return response.data
},

  // Format election for voter display with ballot considerations
  formatElectionForVoter: (election, eligibility = null) => {
    return {
      id: election._id,
      title: election.title,
      deptElectionId: election.deptElectionId,
      department: departmentalElectionsAPI.formatDepartmentName(election.departmentId),
      status: election.status,
      electionDate: election.electionDate,
      type: 'DEPARTMENTAL',
      eligibility,
      votingInfo: departmentalElectionsAPI.getVotingTimeInfo(election)
    }
  }
  
}