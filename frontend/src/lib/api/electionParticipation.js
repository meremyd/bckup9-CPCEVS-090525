import api from '../api'

export const electionParticipationAPI = {
  // Confirm participation in an election (SSG or Departmental)
  confirmParticipation: async (electionId, electionType) => {
    try {
      const response = await api.post('/election-participation/confirm', {
        electionId,
        electionType
      })
      return response.data
    } catch (error) {
      console.error('Error confirming participation:', error)
      throw error
    }
  },

  // Withdraw from an election (SSG or Departmental)
  withdrawParticipation: async (electionId, electionType) => {
    try {
      const response = await api.post('/election-participation/withdraw', {
        electionId,
        electionType
      })
      return response.data
    } catch (error) {
      console.error('Error withdrawing participation:', error)
      throw error
    }
  },

  // Check voter's status for a specific election (SSG or Departmental)
  checkVoterStatus: async (electionId, electionType) => {
    try {
      const response = await api.get(`/election-participation/status/${electionId}?electionType=${electionType}`)
      return response.data
    } catch (error) {
      console.error('Error checking voter status:', error)
      throw error
    }
  },

  // Get voter's participation history (both SSG and Departmental)
  getVoterHistory: async (voterId) => {
    try {
      const response = await api.get(`/election-participation/voter/${voterId}/history`)
      return response.data
    } catch (error) {
      console.error('Error fetching voter history:', error)
      throw error
    }
  },

  // Get all participants for an election (admin/committee/sao only)
  getElectionParticipants: async (electionId, electionType, params = {}) => {
    try {
      const searchParams = new URLSearchParams({
        electionType,
        page: params.page || 1,
        limit: params.limit || 100,
        ...(params.status && { status: params.status }),
        ...(params.hasVoted !== undefined && { hasVoted: params.hasVoted }),
        ...(params.search && { search: params.search })
      })
      
      const response = await api.get(`/election-participation/election/${electionId}/participants?${searchParams}`)
      return response.data
    } catch (error) {
      console.error('Error fetching election participants:', error)
      throw error
    }
  },

  // Get participation statistics for an election (admin/committee/sao only)
  getElectionStats: async (electionId, electionType) => {
    try {
      const response = await api.get(`/election-participation/election/${electionId}/stats?electionType=${electionType}`)
      return response.data
    } catch (error) {
      console.error('Error fetching election stats:', error)
      throw error
    }
  },

  // Mark voter as having voted (admin/committee/sao only)
  markAsVoted: async (electionId, electionType, voterId) => {
    try {
      const response = await api.post('/election-participation/mark-voted', {
        electionId,
        electionType,
        voterId
      })
      return response.data
    } catch (error) {
      console.error('Error marking voter as voted:', error)
      throw error
    }
  },

  // Convenience methods for specific election types
  ssg: {
    confirmParticipation: (electionId) => electionParticipationAPI.confirmParticipation(electionId, 'ssg'),
    withdrawParticipation: (electionId) => electionParticipationAPI.withdrawParticipation(electionId, 'ssg'),
    checkVoterStatus: (electionId) => electionParticipationAPI.checkVoterStatus(electionId, 'ssg'),
    getParticipants: (electionId, params) => electionParticipationAPI.getElectionParticipants(electionId, 'ssg', params),
    getStats: (electionId) => electionParticipationAPI.getElectionStats(electionId, 'ssg'),
    markAsVoted: (electionId, voterId) => electionParticipationAPI.markAsVoted(electionId, 'ssg', voterId)
  },

  departmental: {
    confirmParticipation: (electionId) => electionParticipationAPI.confirmParticipation(electionId, 'departmental'),
    withdrawParticipation: (electionId) => electionParticipationAPI.withdrawParticipation(electionId, 'departmental'),
    checkVoterStatus: (electionId) => electionParticipationAPI.checkVoterStatus(electionId, 'departmental'),
    getParticipants: (electionId, params) => electionParticipationAPI.getElectionParticipants(electionId, 'departmental', params),
    getStats: (electionId) => electionParticipationAPI.getElectionStats(electionId, 'departmental'),
    markAsVoted: (electionId, voterId) => electionParticipationAPI.markAsVoted(electionId, 'departmental', voterId)
  }
}