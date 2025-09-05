"use client"

import { jwtDecode } from "jwt-decode"
import { useRouter } from "next/router"

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

  const router = useRouter()
  if (user && user.userType) {
    switch (user.userType) {
      case "admin":
        router.push("/admin/dashboard")
        break
      case "election_committee":
        router.push("/ecommittee/dashboard")
        break
      case "sao":
        router.push("/sao/dashboard")
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
      console.log("[v0] Token expired, removing from storage")
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      return null
    }

    return decoded
  } catch (error) {
    console.error("Invalid token:", error)
    localStorage.removeItem("token")
    localStorage.removeItem("user")
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
  let user = getUserFromToken()

  // If token doesn't contain userType, try getting from localStorage
  if (!user || !user.userType) {
    const storedUser = localStorage.getItem("user")
    if (storedUser) {
      try {
        user = JSON.parse(storedUser)
      } catch (error) {
        console.error("Error parsing stored user:", error)
        return false
      }
    }
  }

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
