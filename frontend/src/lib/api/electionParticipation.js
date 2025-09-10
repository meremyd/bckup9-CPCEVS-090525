// frontend/src/lib/api/electionParticipation.js
import { api } from './index'

export const electionParticipationAPI = {
  // Confirm participation in an election (SSG or Departmental)
  confirmParticipation: async (electionId, electionType) => {
    const response = await api.post('/election-participation/confirm', {
      electionId,
      electionType
    })
    return response.data
  },

  // Withdraw from an election (SSG or Departmental)
  withdrawParticipation: async (electionId, electionType) => {
    const response = await api.post('/election-participation/withdraw', {
      electionId,
      electionType
    })
    return response.data
  },

  // Check voter's status for a specific election (SSG or Departmental)
  checkVoterStatus: async (electionId, electionType) => {
    const response = await api.get(`/election-participation/status/${electionId}?electionType=${electionType}`)
    return response.data
  },

  // Get voter's participation history (both SSG and Departmental)
  getVoterHistory: async (voterId) => {
    const response = await api.get(`/election-participation/voter/${voterId}/history`)
    return response.data
  },

  // Get all participants for an election (admin/committee/sao only)
  getElectionParticipants: async (electionId, electionType, params = {}) => {
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
  },

  // Get participation statistics for an election (admin/committee/sao only)
  getElectionStats: async (electionId, electionType) => {
    const response = await api.get(`/election-participation/election/${electionId}/stats?electionType=${electionType}`)
    return response.data
  },

  // Mark voter as having voted (admin/committee/sao only - usually called internally when vote is cast)
  markAsVoted: async (electionId, electionType, voterId) => {
    const response = await api.post('/election-participation/mark-voted', {
      electionId,
      electionType,
      voterId
    })
    return response.data
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

// Export for easier importing
export default electionParticipationAPI