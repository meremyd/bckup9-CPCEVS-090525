// frontend/src/lib/auth.js
import { jwtDecode } from "jwt-decode"
import { authAPI } from "./api/auth"

/**
 * Admin/staff login
 */
export async function login(username, password) {
  try {
    const data = await authAPI.login({ username, password })
    const { token, user } = data

    localStorage.setItem("token", token)
    if (user) localStorage.setItem("user", JSON.stringify(user))

    const decodedUser = getUserFromToken() || user

    // Redirect based on role
    if (decodedUser?.userType) {
      switch (decodedUser.userType) {
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
          throw new Error("Invalid user type")
      }
    }

    return decodedUser
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || "Login failed"
    throw new Error(errorMessage)
  }
}

/**
 * Voter login
 */
export async function voterLogin(schoolId, password) {
  try {
    const data = await authAPI.voterLogin({ schoolId, password })
    const { token, voter } = data

    localStorage.setItem("voterToken", token)
    if (voter) localStorage.setItem("voter", JSON.stringify(voter))

    return { token, voter }
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || "Voter login failed"
    throw new Error(errorMessage)
  }
}

/**
 * Logout (admin/user + voter)
 */
export function logout() {
  localStorage.removeItem("token")
  localStorage.removeItem("user")
  router.push("/adminlogin")
}

export function voterLogout() {
  localStorage.removeItem("voterToken")
  localStorage.removeItem("voter")
  router.push("/voterlogin")
}

/**
 * Token + user helpers
 */
export function getToken() {
  return localStorage.getItem("token")
}

export function getVoterToken() {
  return localStorage.getItem("voterToken")
}

export function getUserFromToken() {
  const token = getToken()
  if (!token) return null

  try {
    const decoded = jwtDecode(token)
    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      logout()
      return null
    }
    return decoded
  } catch (error) {
    console.error("Invalid token:", error)
    logout()
    return null
  }
}

export function getVoterFromToken() {
  const token = getVoterToken()
  if (!token) return null

  try {
    const decoded = jwtDecode(token)
    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      voterLogout()
      return null
    }
    return decoded
  } catch (error) {
    console.error("Invalid voter token:", error)
    voterLogout()
    return null
  }
}
