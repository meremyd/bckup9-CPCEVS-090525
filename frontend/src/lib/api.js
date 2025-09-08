import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
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
    const isVoterAuthRoute = config.url?.includes('/auth/voter') || 
                            config.url?.includes('/voter/') ||
                            config.url?.startsWith('/voter/')
    
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
    if (error.response?.status === 401) {
      // Clear tokens and redirect based on route
      if (error.config?.url?.includes('/auth/voter') || 
          error.config?.url?.includes('/voter/') ||
          error.config?.url?.startsWith('/voter/')) {
        localStorage.removeItem('voterToken')
        localStorage.removeItem('voter')
        window.location.href = '/voterlogin'
      } else {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/adminlogin'
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
                          endpoint.startsWith('/voter/')
  
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
    if (response.status === 401) {
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
    throw new Error(errorData.message || "API request failed")
  }

  return response.json()
}

// Export axios instance as default
export default api