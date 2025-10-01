import api from '../api'

export const electionParticipationAPI = {
  // Confirm participation in SSG election (voter only)
  confirmSSGParticipation: async (ssgElectionId) => {
    try {
      console.log('API: Confirming SSG participation for election:', ssgElectionId)
      const response = await api.post('/election-participation/voter/confirm/ssg', {
        ssgElectionId: ssgElectionId // Ensure the ID is sent correctly
      })
      console.log('API: Participation confirmed:', response.data)
      return response.data
    } catch (error) {
      console.error('API: Error confirming SSG participation:', error)
      console.error('API: Error response:', error.response?.data)
      throw error
    }
  },

  // Confirm participation in Departmental election (voter only)
  confirmDepartmentalParticipation: async (deptElectionId) => {
    try {
      const response = await api.post('/election-participation/voter/confirm/departmental', {
        deptElectionId
      })
      return response.data
    } catch (error) {
      console.error('Error confirming Departmental participation:', error)
      throw error
    }
  },

  // Check voter status for SSG election (voter only)
  checkSSGStatus: async (ssgElectionId) => {
    try {
      const response = await api.get(`/election-participation/voter/status/ssg/${ssgElectionId}`)
      return response.data
    } catch (error) {
      console.error('Error checking SSG status:', error)
      throw error
    }
  },

  // Check voter status for Departmental election (voter only)
  checkDepartmentalStatus: async (deptElectionId) => {
    try {
      const response = await api.get(`/election-participation/voter/status/departmental/${deptElectionId}`)
      return response.data
    } catch (error) {
      console.error('Error checking Departmental status:', error)
      throw error
    }
  },

  // Get SSG voting receipt (voter only)
  getSSGVotingReceipt: async (ssgElectionId) => {
    try {
      const response = await api.get(`/election-participation/voter/receipt/ssg/${ssgElectionId}`)
      return response.data
    } catch (error) {
      console.error('Error fetching SSG voting receipt:', error)
      throw error
    }
  },

  // Get Departmental voting receipt (voter only)
  getDepartmentalVotingReceipt: async (deptElectionId) => {
    try {
      const response = await api.get(`/election-participation/voter/receipt/departmental/${deptElectionId}`)
      return response.data
    } catch (error) {
      console.error('Error fetching Departmental voting receipt:', error)
      throw error
    }
  },

  // Get SSG election participants (admin/committee/sao only)
  getSSGParticipants: async (ssgElectionId, params = {}) => {
    try {
      const searchParams = new URLSearchParams({
        page: params.page || 1,
        limit: params.limit || 100,
        ...(params.hasVoted !== undefined && { hasVoted: params.hasVoted }),
        ...(params.search && { search: params.search })
      })
      
      const response = await api.get(`/election-participation/user/participants/ssg/${ssgElectionId}?${searchParams}`)
      return response.data
    } catch (error) {
      console.error('Error fetching SSG participants:', error)
      throw error
    }
  },

  // Get Departmental election participants (admin/committee/sao only)
  getDepartmentalParticipants: async (deptElectionId, params = {}) => {
    try {
      const searchParams = new URLSearchParams({
        page: params.page || 1,
        limit: params.limit || 100,
        ...(params.hasVoted !== undefined && { hasVoted: params.hasVoted }),
        ...(params.search && { search: params.search })
      })
      
      const response = await api.get(`/election-participation/user/participants/departmental/${deptElectionId}?${searchParams}`)
      return response.data
    } catch (error) {
      console.error('Error fetching Departmental participants:', error)
      throw error
    }
  },

  // Get SSG election statistics (admin/committee/sao only)
  getSSGStatistics: async (ssgElectionId) => {
    try {
      const response = await api.get(`/election-participation/user/statistics/ssg/${ssgElectionId}`)
      return response.data
    } catch (error) {
      console.error('Error fetching SSG statistics:', error)
      throw error
    }
  },

  // Get Departmental election statistics (admin/committee/sao only)
  getDepartmentalStatistics: async (deptElectionId) => {
    try {
      const response = await api.get(`/election-participation/user/statistics/departmental/${deptElectionId}`)
      return response.data
    } catch (error) {
      console.error('Error fetching Departmental statistics:', error)
      throw error
    }
  },

  exportSSGParticipantsPDF: async (ssgElectionId, params = {}) => {
  try {
    const searchParams = new URLSearchParams({
      ...(params.hasVoted !== undefined && { hasVoted: params.hasVoted })
    })
    
    const response = await api.get(`/election-participation/user/export/ssg/${ssgElectionId}/pdf?${searchParams}`, {
      responseType: 'blob'
    })
    return response.data
  } catch (error) {
    console.error('Error exporting SSG participants PDF:', error)
    throw error
  }
},

exportDepartmentalParticipantsPDF: async (deptElectionId, params = {}) => {
  try {
    const searchParams = new URLSearchParams({
      ...(params.hasVoted !== undefined && { hasVoted: params.hasVoted })
    })
    
    const response = await api.get(`/election-participation/user/export/departmental/${deptElectionId}/pdf?${searchParams}`, {
      responseType: 'blob'
    })
    return response.data
  } catch (error) {
    console.error('Error exporting Departmental participants PDF:', error)
    throw error
  }
},

  // Convenience methods grouped by election type
  ssg: {
    confirmParticipation: (electionId) => electionParticipationAPI.confirmSSGParticipation(electionId),
    checkStatus: (electionId) => electionParticipationAPI.checkSSGStatus(electionId),
    getReceipt: (electionId) => electionParticipationAPI.getSSGVotingReceipt(electionId),
    getParticipants: (electionId, params) => electionParticipationAPI.getSSGParticipants(electionId, params),
    getStatistics: (electionId) => electionParticipationAPI.getSSGStatistics(electionId),
    exportPDF: (electionId, params) => electionParticipationAPI.exportSSGParticipantsPDF(electionId, params)
  },

  departmental: {
    confirmParticipation: (electionId) => electionParticipationAPI.confirmDepartmentalParticipation(electionId),
    checkStatus: (electionId) => electionParticipationAPI.checkDepartmentalStatus(electionId),
    getReceipt: (electionId) => electionParticipationAPI.getDepartmentalVotingReceipt(electionId),
    getParticipants: (electionId, params) => electionParticipationAPI.getDepartmentalParticipants(electionId, params),
    getStatistics: (electionId) => electionParticipationAPI.getDepartmentalStatistics(electionId),
    exportPDF: (electionId, params) => electionParticipationAPI.exportDepartmentalParticipantsPDF(electionId, params)
  },

  // Generic methods (for backward compatibility or when election type is dynamic)
  confirmParticipation: async (electionId, electionType) => {
    if (electionType === 'ssg') {
      return electionParticipationAPI.confirmSSGParticipation(electionId)
    } else if (electionType === 'departmental') {
      return electionParticipationAPI.confirmDepartmentalParticipation(electionId)
    } else {
      throw new Error('Invalid election type. Must be "ssg" or "departmental"')
    }
  },

  checkStatus: async (electionId, electionType) => {
    if (electionType === 'ssg') {
      return electionParticipationAPI.checkSSGStatus(electionId)
    } else if (electionType === 'departmental') {
      return electionParticipationAPI.checkDepartmentalStatus(electionId)
    } else {
      throw new Error('Invalid election type. Must be "ssg" or "departmental"')
    }
  },

  getReceipt: async (electionId, electionType) => {
    if (electionType === 'ssg') {
      return electionParticipationAPI.getSSGVotingReceipt(electionId)
    } else if (electionType === 'departmental') {
      return electionParticipationAPI.getDepartmentalVotingReceipt(electionId)
    } else {
      throw new Error('Invalid election type. Must be "ssg" or "departmental"')
    }
  },

  getParticipants: async (electionId, electionType, params) => {
    if (electionType === 'ssg') {
      return electionParticipationAPI.getSSGParticipants(electionId, params)
    } else if (electionType === 'departmental') {
      return electionParticipationAPI.getDepartmentalParticipants(electionId, params)
    } else {
      throw new Error('Invalid election type. Must be "ssg" or "departmental"')
    }
  },

  getStatistics: async (electionId, electionType) => {
    if (electionType === 'ssg') {
      return electionParticipationAPI.getSSGStatistics(electionId)
    } else if (electionType === 'departmental') {
      return electionParticipationAPI.getDepartmentalStatistics(electionId)
    } else {
      throw new Error('Invalid election type. Must be "ssg" or "departmental"')
    }
  },

  getSSGVotingStatus: async (ssgElectionId) => {
  try {
    const response = await api.get(`/election-participation/voter/voting-status/ssg/${ssgElectionId}`)
    return response.data
  } catch (error) {
    console.error('Error fetching SSG voting status:', error)
    throw error
  }
},

// Get voter's voting status for Departmental election
getDepartmentalVotingStatus: async (deptElectionId) => {
  try {
    const response = await api.get(`/election-participation/voter/voting-status/departmental/${deptElectionId}`)
    return response.data
  } catch (error) {
    console.error('Error fetching Departmental voting status:', error)
    throw error
  }
},

// Export SSG voting receipt as PDF
exportSSGVotingReceiptPDF: async (ssgElectionId) => {
  try {
    const response = await api.get(`/election-participation/voter/receipt/ssg/${ssgElectionId}/pdf`, {
      responseType: 'blob'
    })
    return response.data
  } catch (error) {
    console.error('Error exporting SSG voting receipt PDF:', error)
    throw error
  }
},

// Export Departmental voting receipt as PDF
exportDepartmentalVotingReceiptPDF: async (deptElectionId) => {
  try {
    const response = await api.get(`/election-participation/voter/receipt/departmental/${deptElectionId}/pdf`, {
      responseType: 'blob'
    })
    return response.data
  } catch (error) {
    console.error('Error exporting Departmental voting receipt PDF:', error)
    throw error
  }
},

// Update the ssg and departmental convenience methods by adding:
ssg: {
  // ... existing methods
  getVotingStatus: (electionId) => electionParticipationAPI.getSSGVotingStatus(electionId),
  exportReceiptPDF: (electionId) => electionParticipationAPI.exportSSGVotingReceiptPDF(electionId)
},

departmental: {
  // ... existing methods  
  getVotingStatus: (electionId) => electionParticipationAPI.getDepartmentalVotingStatus(electionId),
  exportReceiptPDF: (electionId) => electionParticipationAPI.exportDepartmentalVotingReceiptPDF(electionId)
},

// Add generic methods for voting status:
getVotingStatus: async (electionId, electionType) => {
  if (electionType === 'ssg') {
    return electionParticipationAPI.getSSGVotingStatus(electionId)
  } else if (electionType === 'departmental') {
    return electionParticipationAPI.getDepartmentalVotingStatus(electionId)
  } else {
    throw new Error('Invalid election type. Must be "ssg" or "departmental"')
  }
},

exportReceiptPDF: async (electionId, electionType) => {
  if (electionType === 'ssg') {
    return electionParticipationAPI.exportSSGVotingReceiptPDF(electionId)
  } else if (electionType === 'departmental') {
    return electionParticipationAPI.exportDepartmentalVotingReceiptPDF(electionId)
  } else {
    throw new Error('Invalid election type. Must be "ssg" or "departmental"')
  }
}
}