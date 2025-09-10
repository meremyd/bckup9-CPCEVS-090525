import api from '../api'

export const votingAPI = {
  // SSG Election APIs
  getActiveSSGElections: async () => {
    const response = await api.get('/voting/ssg-elections/active')
    return response.data
  },
  
  getSSGElectionDetails: async (electionId) => {
    const response = await api.get(`/voting/ssg-election/${electionId}/details`)
    return response.data
  },
  
  getSSGElectionCandidates: async (electionId) => {
    const response = await api.get(`/voting/ssg-election/${electionId}/candidates`)
    return response.data
  },
  
  castSSGVote: async (voteData) => {
    const response = await api.post('/voting/ssg-election/cast-vote', voteData)
    return response.data
  },
  
  getMySSGVotes: async () => {
    const response = await api.get('/voting/ssg-votes/my-votes')
    return response.data
  },
  
  getSSGVotingStatus: async () => {
    const response = await api.get('/voting/ssg-voting-status')
    return response.data
  },

  // Departmental Election APIs
  getActiveDepartmentalElections: async () => {
    const response = await api.get('/voting/departmental-elections/active')
    return response.data
  },
  
  getDepartmentalElectionDetails: async (electionId) => {
    const response = await api.get(`/voting/departmental-election/${electionId}/details`)
    return response.data
  },
  
  getDepartmentalElectionCandidates: async (electionId) => {
    const response = await api.get(`/voting/departmental-election/${electionId}/candidates`)
    return response.data
  },
  
  castDepartmentalVote: async (voteData) => {
    const response = await api.post('/voting/departmental-election/cast-vote', voteData)
    return response.data
  },
  
  getMyDepartmentalVotes: async () => {
    const response = await api.get('/voting/departmental-votes/my-votes')
    return response.data
  },
  
  getDepartmentalVotingStatus: async () => {
    const response = await api.get('/voting/departmental-voting-status')
    return response.data
  }
}