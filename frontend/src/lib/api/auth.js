import api from '../api'

export const authAPI = {
  // Admin/Staff login
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials)
    return response.data
  },
  
  // Voter login - Updated to handle new response structure with department info
  voterLogin: async (credentials) => {
    const response = await api.post('/auth/voter-login', credentials)
    return response.data
  },
  
  // Pre-registration step 1 - Find voter by school ID - Updated to handle department info
  preRegisterStep1: async (data) => {
    const response = await api.post('/auth/pre-register-step1', data)
    return response.data
  },
  
  // Pre-registration step 2 - Complete registration with password - Updated response structure
  preRegisterStep2: async (data) => {
    const response = await api.post('/auth/pre-register-step2', data)
    return response.data
  },
  
  // Logout
  logout: async () => {
    const response = await api.post('/auth/logout')
    return response.data
  },

  // Check authentication status
  checkAuth: async () => {
    const response = await api.get('/auth/me')
    return response.data
  },

  // Refresh token
  refreshToken: async () => {
    const response = await api.post('/auth/refresh')
    return response.data
  }
}