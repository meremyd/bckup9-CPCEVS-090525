"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { X, Loader2 } from "lucide-react"
import { login } from '../../lib/auth'

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
      // Use the login function from auth.js which handles token storage and redirects
      await login(form.username, form.password)
      // The login function will handle the redirect automatically
    } catch (error) {
      console.error("Login error:", error)
      
      // The error messages are already processed by the API interceptors
      let errorMessage = error.message || "Login failed. Please try again."
      
      // Additional client-side error handling for specific cases
      if (error.name === 'NetworkError' || error.code === 'NETWORK_ERROR') {
        errorMessage = "Connection error. Please check your internet connection and try again."
      } else if (error.response?.status === 429) {
        errorMessage = "Too many login attempts. Please wait 15 minutes before trying again."
      } else if (error.response?.status === 401) {
        errorMessage = "Invalid username or password. Please check your credentials and try again."
      } else if (error.response?.status >= 500) {
        errorMessage = "Server error. Please try again later or contact support."
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
            <Image src="/cpclogo.png" alt="Vote Icon" width={64} height={64} className="w-16 h-16" />
          </div>
          <h1 className="text-3xl font-bold text-blue-900 mb-2">Admin Portal</h1>
          <p className="text-gray-600 text-sm">Please login with your credentials</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <X className="h-5 w-5 text-red-400" />
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
                autoComplete="username"
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
                autoComplete="current-password"
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
                <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
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