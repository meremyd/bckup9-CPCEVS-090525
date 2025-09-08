import api from '../api'

export const authAPI = {
  // Admin/Staff login
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials)
    return response.data
  },
  
  // Voter login
  voterLogin: async (credentials) => {
    const response = await api.post('/auth/voter-login', credentials)
    return response.data
  },
  
  // Pre-registration step 1
  preRegisterStep1: async (data) => {
    const response = await api.post('/auth/pre-register-step1', data)
    return response.data
  },
  
  // Pre-registration step 2
  preRegisterStep2: async (data) => {
    const response = await api.post('/auth/pre-register-step2', data)
    return response.data
  },
  
  // Logout
  logout: async () => {
    const response = await api.post('/auth/logout')
    return response.data
  }
}
