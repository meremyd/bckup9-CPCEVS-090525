const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

export const getAuthHeaders = () => {
  const token = localStorage.getItem("token")
  return token
    ? {
        "x-auth-token": token,
        Authorization: `Bearer ${token}`, // Added Bearer token for compatibility
      }
    : {}
}

export const fetchWithAuth = async (endpoint, options = {}) => {
  const headers = {
    "Content-Type": "application/json",
    ...getAuthHeaders(),
    ...options.headers,
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      window.location.href = "/adminlogin"
      return
    }
    const errorData = await response.json()
    throw new Error(errorData.message || "API request failed")
  }

  return response.json()
}

export default { fetchWithAuth, getAuthHeaders }
