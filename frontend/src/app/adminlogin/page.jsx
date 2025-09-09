"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { authAPI } from '../../lib/api/auth'

export default function AdminLogin() {
  const router = useRouter()
  const [form, setForm] = useState({ username: "", password: "" })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError("")
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const data = await authAPI.login({
        username: form.username,
        password: form.password,
      })
      
      // Store token and user data properly
      localStorage.setItem("token", data.token)
      localStorage.setItem("user", JSON.stringify(data.user))

      console.log("Login successful, user type:", data.user.userType)

      // REMOVED: await new Promise((resolve) => setTimeout(resolve, 78000))
      // This was causing unnecessary delay

      // Use router.push instead of direct window.location assignment
      switch (data.user.userType) {
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
          router.push("/admin/dashboard")
      }
    } catch (error) {
      console.error("Login error:", error)
      
      // Enhanced error handling with user-friendly messages
      let errorMessage = "Login failed. Please try again."
      
      if (error.message) {
        if (error.message.includes("Invalid credentials")) {
          errorMessage = "Invalid username or password. Please check your credentials and try again."
        } else if (error.message.includes("Too many")) {
          errorMessage = "Too many login attempts. Please wait 15 minutes before trying again."
        } else if (error.message.includes("Network Error")) {
          errorMessage = "Connection error. Please check your internet connection and try again."
        } else {
          errorMessage = error.message
        }
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image src="/logo.png" alt="Vote Icon" width={64} height={64} className="w-16 h-16" />
          </div>
          <h1 className="text-3xl font-bold text-blue-900 mb-2">Admin Portal</h1>
          <p className="text-gray-600 text-sm">Please login with your credentials</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{error}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Image src="/user.png" alt="User Icon" width={20} height={20} className="text-gray-400" />
              </div>
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                placeholder="Enter your username"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Image src="/lock.png" alt="Lock Icon" width={20} height={20} className="text-gray-400" />
              </div>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                placeholder="Enter your password"
                required
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !form.username.trim() || !form.password.trim()}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </div>
            ) : (
              "Sign In"
            )}
          </button>
        </form>
      </div>
    </div>
  )
}