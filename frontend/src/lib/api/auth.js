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
  
  // Verify OTP for voter login 2FA
  voterLoginVerifyOtp: async (data) => {
    const response = await api.post('/auth/voter-login-verify-otp', data)
    return response.data
  },
  
  // Pre-registration step 1 - Find voter by school ID - Updated to handle department info
  preRegisterStep1: async (data) => {
    const response = await api.post('/auth/pre-register-step1', data)
    return response.data
  },
  
  // Pre-registration step 2 - send OTP to email
  preRegisterStep2: async (data) => {
    const response = await api.post('/auth/pre-register-step2', data)
    return response.data
  },

  // Verify OTP
  verifyOtp: async (data) => {
    const response = await api.post('/auth/pre-register-verify-otp', data)
    return response.data
  },

  // Pre-registration step 3 - Complete registration with password
  preRegisterStep3: async (data) => {
    const response = await api.post('/auth/pre-register-step3', data)
    return response.data
  },
  
  // Resend OTP
  resendOtp: async (data) => {
    const response = await api.post('/auth/pre-register-resend-otp', data)
    return response.data
  },

  // Voter forgot password - request OTP
  voterForgotPassword: async (data) => {
    const response = await api.post('/auth/voter-forgot-password', data)
    return response.data
  },

  // Verify OTP for forgot-password (reuse verify endpoint)
  voterVerifyOtp: async (data) => {
    const response = await api.post('/auth/pre-register-verify-otp', data)
    return response.data
  },

  // Reset password after OTP verified
  voterResetPassword: async (data) => {
    const response = await api.post('/auth/voter-reset-password', data)
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