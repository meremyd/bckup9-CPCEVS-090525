import api from '../api'

export const electionParticipationAPI = {
  // Confirm participation in SSG election (voter only)
  confirmSSGParticipation: async (ssgElectionId) => {
    try {
      const response = await api.post('/election-participation/confirm/ssg', {
        ssgElectionId
      })
      return response.data
    } catch (error) {
      console.error('Error confirming SSG participation:', error)
      throw error
    }
  },

  // Confirm participation in Departmental election (voter only)
  confirmDepartmentalParticipation: async (deptElectionId) => {
    try {
      const response = await api.post('/election-participation/confirm/departmental', {
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
      const response = await api.get(`/election-participation/status/ssg/${ssgElectionId}`)
      return response.data
    } catch (error) {
      console.error('Error checking SSG status:', error)
      throw error
    }
  },

  // Check voter status for Departmental election (voter only)
  checkDepartmentalStatus: async (deptElectionId) => {
    try {
      const response = await api.get(`/election-participation/status/departmental/${deptElectionId}`)
      return response.data
    } catch (error) {
      console.error('Error checking Departmental status:', error)
      throw error
    }
  },

  // Get SSG voting receipt (voter only)
  getSSGVotingReceipt: async (ssgElectionId) => {
    try {
      const response = await api.get(`/election-participation/receipt/ssg/${ssgElectionId}`)
      return response.data
    } catch (error) {
      console.error('Error fetching SSG voting receipt:', error)
      throw error
    }
  },

  // Get Departmental voting receipt (voter only)
  getDepartmentalVotingReceipt: async (deptElectionId) => {
    try {
      const response = await api.get(`/election-participation/receipt/departmental/${deptElectionId}`)
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
      
      const response = await api.get(`/election-participation/participants/ssg/${ssgElectionId}?${searchParams}`)
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
      
      const response = await api.get(`/election-participation/participants/departmental/${deptElectionId}?${searchParams}`)
      return response.data
    } catch (error) {
      console.error('Error fetching Departmental participants:', error)
      throw error
    }
  },

  // Get SSG election statistics (admin/committee/sao only)
  getSSGStatistics: async (ssgElectionId) => {
    try {
      const response = await api.get(`/election-participation/statistics/ssg/${ssgElectionId}`)
      return response.data
    } catch (error) {
      console.error('Error fetching SSG statistics:', error)
      throw error
    }
  },

  // Get Departmental election statistics (admin/committee/sao only)
  getDepartmentalStatistics: async (deptElectionId) => {
    try {
      const response = await api.get(`/election-participation/statistics/departmental/${deptElectionId}`)
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
    
    const response = await api.get(`/election-participation/export/ssg/${ssgElectionId}/pdf?${searchParams}`, {
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
    
    const response = await api.get(`/election-participation/export/departmental/${deptElectionId}/pdf?${searchParams}`, {
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
  }
}