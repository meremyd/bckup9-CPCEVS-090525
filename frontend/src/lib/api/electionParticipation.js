// frontend/src/lib/api/electionParticipation.js
import { api } from './index'

export const electionParticipationAPI = {
  // Confirm participation in an election
  confirmParticipation: async (electionId, voterId) => {
    const response = await api.post('/election-participation/confirm', {
      electionId,
      voterId
    })
    return response.data
  },

  // Withdraw from an election
  withdrawParticipation: async (electionId, voterId) => {
    const response = await api.post('/election-participation/withdraw', {
      electionId,
      voterId
    })
    return response.data
  },

  // Check voter's status for a specific election
  checkVoterStatus: async (voterId, electionId) => {
    const response = await api.get(`/election-participation/voter/${voterId}/status/${electionId}`)
    return response.data
  },

  // Get voter's participation history
  getVoterHistory: async (voterId) => {
    const response = await api.get(`/election-participation/voter/${voterId}/history`)
    return response.data
  },

  // Get all participants for an election (admin only)
  getElectionParticipants: async (electionId, params = {}) => {
    const searchParams = new URLSearchParams({
      page: params.page || 1,
      limit: params.limit || 100,
      ...(params.status && { status: params.status }),
      ...(params.hasVoted !== undefined && { hasVoted: params.hasVoted }),
      ...(params.search && { search: params.search })
    })
    
    const response = await api.get(`/election-participation/election/${electionId}/participants?${searchParams}`)
    return response.data
  },

  // Get participation statistics for an election (admin only)
  getElectionStats: async (electionId) => {
    const response = await api.get(`/election-participation/election/${electionId}/stats`)
    return response.data
  },

  // Mark voter as having voted (admin only - usually called internally when vote is cast)
  markAsVoted: async (electionId, voterId) => {
    const response = await api.post('/election-participation/mark-voted', {
      electionId,
      voterId
    })
    return response.data
  }
}

// Export for easier importing
export default electionParticipationAPI