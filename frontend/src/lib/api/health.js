import api from '../api'

export const healthAPI = {
  // Check server health
  check: async () => {
    const response = await api.get('/health')
    return response.data
  }
}