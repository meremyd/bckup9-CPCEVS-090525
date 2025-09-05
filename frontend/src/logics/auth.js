import { jwtDecode } from "jwt-decode"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

/**
 * Login user with username and password.
 * Saves JWT token to localStorage on success.
 * Returns user info decoded from token.
 */
export async function login(username, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || "Login failed")
  }

  const data = await response.json()
  localStorage.setItem("token", data.token)

  const user = getUserFromToken()

  // Redirect based on user type
  if (user && user.userType) {
    switch (user.userType) {
      case "admin":
        window.location.href = "/admin/dashboard"
        break
      case "election_committee":
        window.location.href = "/ecommittee/dashboard"
        break
      case "sao":
        window.location.href = "/sao/dashboard"
        break
      default:
        console.error("Unknown user type:", user.userType)
        throw new Error("Invalid user type")
    }
  }

  return user
}

/**
 * Remove JWT token from localStorage to logout user.
 */
export function logout() {
  localStorage.removeItem("token")
  localStorage.removeItem("user")
  window.location.href = "/adminlogin"
}

/**
 * Get JWT token from localStorage.
 */
export function getToken() {
  return localStorage.getItem("token")
}

/**
 * Decode and return user info from JWT token.
 * Returns null if no token or invalid token.
 */
export function getUserFromToken() {
  const token = getToken()
  if (!token) return null
  try {
    const decoded = jwtDecode(token)
    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      localStorage.removeItem("token")
      return null
    }
    return decoded
  } catch (error) {
    console.error("Invalid token:", error)
    localStorage.removeItem("token")
    return null
  }
}

/**
 * Check if user is authenticated (has valid token).
 */
export function isAuthenticated() {
  return getUserFromToken() !== null
}

/**
 * Check if user has specific role/userType
 */
export function hasRole(requiredRole) {
  const user = getUserFromToken()
  return user && user.userType === requiredRole
}

/**
 * Redirect to login if not authenticated
 */
export function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = "/adminlogin"
    return false
  }
  return true
}
