import { jwtDecode } from "jwt-decode"
import { authAPI } from "./api/auth"

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
    const statusCode = error.response?.status;
    const errorMessage = error.response?.data?.message || error.message || "Request failed";

    const customError = new Error(errorMessage);
    customError.statusCode = statusCode;
    throw customError;
  }
}

/**
 * Voter login - Updated to handle new response structure with department info
 */
export async function voterLogin(schoolId, password) {
  try {
    const data = await authAPI.voterLogin({ userId: schoolId, password })
    const { token, user } = data

    localStorage.setItem("voterToken", token)
    if (user) localStorage.setItem("voter", JSON.stringify(user))

    return { token, voter: user }
  } catch (error) {
    const statusCode = error.response?.status;
    const errorMessage = error.response?.data?.message || error.message || "Request failed";

    const customError = new Error(errorMessage);
    customError.statusCode = statusCode;
    throw customError;
  }
}

/**
 * Pre-registration functions - Updated to handle department info
 */
export async function preRegisterStep1(schoolId) {
  try {
    const data = await authAPI.preRegisterStep1({ schoolId })
    return data
  } catch (error) {
    const statusCode = error.response?.status;
    const errorMessage = error.response?.data?.message || error.message || "Request failed";

    const customError = new Error(errorMessage);
    customError.statusCode = statusCode;
    throw customError;
  }
}

export async function preRegisterStep2(registrationData) {
  try {
    const data = await authAPI.preRegisterStep2(registrationData)
    return data
  } catch (error) {
    const statusCode = error.response?.status;
    const errorMessage = error.response?.data?.message || error.message || "Request failed";

    const customError = new Error(errorMessage);
    customError.statusCode = statusCode;
    throw customError;
  }
}

/**
 * Logout functions
 */
export function logout() {
  localStorage.removeItem("token")
  localStorage.removeItem("user")
  window.location.href = "/adminlogin"
}

export function voterLogout() {
  localStorage.removeItem("voterToken")
  localStorage.removeItem("voter")
  window.location.href = "/voterlogin"
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

/**
 * Helper to get stored voter data (includes department info)
 */
export function getStoredVoter() {
  const voterData = localStorage.getItem("voter")
  if (!voterData) return null
  
  try {
    return JSON.parse(voterData)
  } catch (error) {
    console.error("Invalid voter data:", error)
    voterLogout()
    return null
  }
}

/**
 * Helper to get stored user data
 */
export function getStoredUser() {
  const userData = localStorage.getItem("user")
  if (!userData) return null
  
  try {
    return JSON.parse(userData)
  } catch (error) {
    console.error("Invalid user data:", error)
    logout()
    return null
  }
}