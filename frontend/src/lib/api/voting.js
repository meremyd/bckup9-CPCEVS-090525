import api from '../api'

export const votingAPI = {
  // SSG Election APIs
  getActiveSSGElections: async () => {
    try {
      const response = await api.get('/voting/ssg-elections/active')
      return response.data
    } catch (error) {
      console.error('Error fetching active SSG elections:', error)
      throw error
    }
  },
  
  getSSGElectionDetails: async (electionId) => {
    try {
      const response = await api.get(`/voting/ssg-election/${electionId}/details`)
      return response.data
    } catch (error) {
      console.error(`Error fetching SSG election details for ${electionId}:`, error)
      throw error
    }
  },
  
  getSSGElectionCandidates: async (electionId) => {
    try {
      const response = await api.get(`/voting/ssg-election/${electionId}/candidates`)
      return response.data
    } catch (error) {
      console.error(`Error fetching SSG election candidates for ${electionId}:`, error)
      throw error
    }
  },
  
  castSSGVote: async (voteData) => {
    try {
      const response = await api.post('/voting/ssg-election/cast-vote', voteData)
      return response.data
    } catch (error) {
      console.error('Error casting SSG vote:', error)
      throw error
    }
  },
  
  getMySSGVotes: async () => {
    try {
      const response = await api.get('/voting/ssg-votes/my-votes')
      return response.data
    } catch (error) {
      console.error('Error fetching my SSG votes:', error)
      throw error
    }
  },
  
  getSSGVotingStatus: async () => {
    try {
      const response = await api.get('/voting/ssg-voting-status')
      return response.data
    } catch (error) {
      console.error('Error fetching SSG voting status:', error)
      throw error
    }
  },

  // Departmental Election APIs
  getActiveDepartmentalElections: async () => {
    try {
      const response = await api.get('/voting/departmental-elections/active')
      return response.data
    } catch (error) {
      console.error('Error fetching active departmental elections:', error)
      throw error
    }
  },
  
  getDepartmentalElectionDetails: async (electionId) => {
    try {
      const response = await api.get(`/voting/departmental-election/${electionId}/details`)
      return response.data
    } catch (error) {
      console.error(`Error fetching departmental election details for ${electionId}:`, error)
      throw error
    }
  },
  
  getDepartmentalElectionCandidates: async (electionId) => {
    try {
      const response = await api.get(`/voting/departmental-election/${electionId}/candidates`)
      return response.data
    } catch (error) {
      console.error(`Error fetching departmental election candidates for ${electionId}:`, error)
      throw error
    }
  },
  
  castDepartmentalVote: async (voteData) => {
    try {
      const response = await api.post('/voting/departmental-election/cast-vote', voteData)
      return response.data
    } catch (error) {
      console.error('Error casting departmental vote:', error)
      throw error
    }
  },
  
  getMyDepartmentalVotes: async () => {
    try {
      const response = await api.get('/voting/departmental-votes/my-votes')
      return response.data
    } catch (error) {
      console.error('Error fetching my departmental votes:', error)
      throw error
    }
  },
  
  getDepartmentalVotingStatus: async () => {
    try {
      const response = await api.get('/voting/departmental-voting-status')
      return response.data
    } catch (error) {
      console.error('Error fetching departmental voting status:', error)
      throw error
    }
  }
}