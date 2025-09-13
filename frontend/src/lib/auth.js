
import { jwtDecode } from "jwt-decode"
import { authAPI } from "./api/auth"

// Add a flag to prevent multiple simultaneous logouts
let isLoggingOut = false

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

export function logout() {
  if (isLoggingOut) return
  isLoggingOut = true
  
  localStorage.removeItem("token")
  localStorage.removeItem("user")
  
  setTimeout(() => {
    window.location.href = "/adminlogin"
    isLoggingOut = false
  }, 100)
}

export function voterLogout() {
  if (isLoggingOut) return
  isLoggingOut = true
  
  localStorage.removeItem("voterToken")
  localStorage.removeItem("voter")
  
  setTimeout(() => {
    window.location.href = "/voterlogin"
    isLoggingOut = false
  }, 100)
}

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
    // Add 30-second buffer to prevent premature expiration
    if (decoded.exp && decoded.exp < (Date.now() / 1000) + 30) {
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

// FIXED: Better token validation with debugging
export function getVoterFromToken() {
  const token = getVoterToken()
  if (!token) {
    console.log("No voter token found")
    return null
  }

  try {
    const decoded = jwtDecode(token)
    const currentTime = Math.floor(Date.now() / 1000)
    const expiryTime = decoded.exp
    
    console.log("Token validation:", {
      currentTime,
      expiryTime,
      timeUntilExpiry: expiryTime - currentTime,
      isExpired: expiryTime < currentTime
    })
    
    // Add 30-second buffer to prevent premature expiration
    if (decoded.exp && decoded.exp < currentTime + 30) {
      console.log("Token expired or about to expire")
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

// NEW: Function to check token validity without automatic logout
export function isVoterTokenValid() {
  const token = getVoterToken()
  if (!token) return false

  try {
    const decoded = jwtDecode(token)
    const currentTime = Math.floor(Date.now() / 1000)
    return decoded.exp && decoded.exp > currentTime + 30 // 30-second buffer
  } catch (error) {
    return false
  }
}

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