import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    const voterToken = localStorage.getItem('voterToken')
    
  // Use voter token ONLY for voter-specific authentication routes
  // Not for admin routes that happen to contain "voter" in the path
  // Additionally: when checking auth (/auth/me) prefer the voter token if one exists
  const isVoterAuthRoute = config.url?.includes('/auth/voter') || 
              config.url?.includes('/voter/') ||
              config.url?.startsWith('/voter/') ||
              (config.url?.includes('/auth/me') && !!voterToken)

  const authToken = isVoterAuthRoute ? voterToken : token
    
    if (authToken) {
      config.headers['x-auth-token'] = authToken
      config.headers['Authorization'] = `Bearer ${authToken}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't auto-redirect for login endpoints - let the component handle errors
    const isLoginAttempt = error.config?.url?.includes('/auth/login') || 
                          error.config?.url?.includes('/auth/voter-login')
    
    if (error.response?.status === 401 && !isLoginAttempt) {
      // Decide whether this 401 relates to a voter session or an admin session.
      const isVoterErrorRoute = error.config?.url?.includes('/auth/voter') || 
                               error.config?.url?.includes('/voter/') ||
                               error.config?.url?.startsWith('/voter/') ||
                               (error.config?.url?.includes('/auth/me') && !!localStorage.getItem('voterToken'))

      if (isVoterErrorRoute) {
        localStorage.removeItem('voterToken')
        localStorage.removeItem('voter')
        window.location.href = '/voterlogin'
      } else {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/adminlogin'
      }
    }
    
    // Enhanced error messages
    if (error.response?.data?.message) {
      const originalMessage = error.response.data.message
      let userFriendlyMessage = originalMessage
      
      // Transform backend messages to user-friendly ones
      if (originalMessage.includes('Too many requests')) {
        if (originalMessage.includes('login attempts')) {
          userFriendlyMessage = 'Too many login attempts. Please wait 15 minutes before trying again.'
        } else {
          userFriendlyMessage = 'Too many requests. Please wait a moment and try again.'
        }
      } else if (originalMessage === 'Invalid credentials') {
        userFriendlyMessage = 'Invalid username or password. Please check your credentials and try again.'
      } else if (originalMessage.includes('Token is not valid')) {
        userFriendlyMessage = 'Your session has expired. Please log in again.'
      } else if (originalMessage.includes('Student not found')) {
        userFriendlyMessage = 'School ID not found. Please check your School ID or contact support.'
      } else if (originalMessage.includes('Account not activated')) {
        userFriendlyMessage = 'Your account is not yet activated. Please complete the pre-registration process first.'
      }
      
      // Update the error message
      error.message = userFriendlyMessage
      if (error.response.data) {
        error.response.data.message = userFriendlyMessage
      }
    }
    
    return Promise.reject(error)
  }
)

// Legacy fetch-based function for backward compatibility
export const fetchWithAuth = async (endpoint, options = {}) => {
  const token = localStorage.getItem("token")
  const voterToken = localStorage.getItem("voterToken")
  
  // Use voter token ONLY for voter-specific authentication routes
  const isVoterAuthRoute = endpoint.includes('/auth/voter') || 
                          endpoint.includes('/voter/') ||
                          endpoint.startsWith('/voter/') ||
                          (endpoint.includes('/auth/me') && !!voterToken)
  
  const authToken = isVoterAuthRoute ? voterToken : token
  
  const headers = {
    "Content-Type": "application/json",
    ...(authToken && { "x-auth-token": authToken, "Authorization": `Bearer ${authToken}` }),
    ...options.headers,
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    // Don't auto-redirect for login attempts
    const isLoginAttempt = endpoint.includes('/auth/login') || endpoint.includes('/auth/voter-login')
    
    if (response.status === 401 && !isLoginAttempt) {
      if (isVoterAuthRoute) {
        localStorage.removeItem("voterToken")
        localStorage.removeItem("voter")
        window.location.href = "/voterlogin"
      } else {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        window.location.href = "/adminlogin"
      }
      return
    }
    
    const errorData = await response.json()
    
    // Enhanced error handling
    let errorMessage = errorData.message || "API request failed"
    
    if (errorMessage.includes('Too many requests')) {
      if (errorMessage.includes('login attempts')) {
        errorMessage = 'Too many login attempts. Please wait 15 minutes before trying again.'
      } else {
        errorMessage = 'Too many requests. Please wait a moment and try again.'
      }
    } else if (errorMessage === 'Invalid credentials') {
      errorMessage = 'Invalid username or password. Please check your credentials and try again.'
    }
    
    throw new Error(errorMessage)
  }

  return response.json()
}

// Export axios instance as default
export default api