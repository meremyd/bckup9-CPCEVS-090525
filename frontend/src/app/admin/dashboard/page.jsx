"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { logout } from "../../../lib/auth"

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [user, setUser] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const initializeDashboard = async () => {
      const token = localStorage.getItem("token")
      const userDataFromStorage = localStorage.getItem("user")

      if (!token || !userDataFromStorage) {
        router.push("/adminlogin")
        return
      }

      try {
        const parsedUser = JSON.parse(userDataFromStorage)
        setUser(parsedUser)

        if (parsedUser.userType !== "admin") {
          console.warn("Unauthorized access: User is not an admin")
          logout()
          router.push("/adminlogin")
          return
        }

        fetchDashboardData(token)
      } catch (parseError) {
        console.error("Error parsing user data:", parseError)
        logout()
        router.push("/adminlogin")
      }
    }

    initializeDashboard()
  }, [router])

  const fetchDashboardData = async (token) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/dashboard/admin/dashboard`,
        {
          headers: {
            "x-auth-token": token,
            "Content-Type": "application/json",
          },
        },
      )

      console.log("[v0] Dashboard API response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Dashboard data received:", data)
        setDashboardData(data)
      } else if (response.status === 401 || response.status === 403) {
        console.warn("Session expired or unauthorized. Logging out.")
        logout()
        router.push("/adminlogin")
      } else {
        const errorData = await response.json()
        setError(errorData.message || "Failed to fetch dashboard data")
      }
    } catch (error) {
      console.error("Dashboard error:", error)
      setError("Network error - please check if the server is running")
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    router.push("/adminlogin")
  }

  const handleCardClick = (path) => {
    router.push(path)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md mx-auto">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-y-2">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Retry
            </button>
            <button
              onClick={() => router.push("/adminlogin")}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header with Logout */}
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Welcome, {user?.username}</span>
            <button
              onClick={handleLogout}
              className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 00-3 3H6a3 3 0 00-3-3V7a3 3 0 003-3h4a3 3 0 003 3v1"
                />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Centered Cards */}
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-8">
        <div className="grid grid-cols-2 gap-8 max-w-4xl w-full">
          {/* Total Voters - Top Left */}
          <div
            onClick={() => handleCardClick("/admin/voters")}
            className="bg-white rounded-xl shadow-lg p-8 cursor-pointer transform hover:scale-105 transition-all duration-200 hover:shadow-xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-medium text-gray-600 mb-2">Total Voters</p>
                <p className="text-4xl font-bold text-blue-600">{dashboardData?.totalVoters || 0}</p>
              </div>
              <div className="p-4 rounded-full bg-blue-100">
                <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-gray-500">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Click to manage voters
            </div>
          </div>

          {/* Registered Voters - Top Right */}
          <div
            onClick={() => handleCardClick("/admin/registered-voters")}
            className="bg-white rounded-xl shadow-lg p-8 cursor-pointer transform hover:scale-105 transition-all duration-200 hover:shadow-xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-medium text-gray-600 mb-2">Registered Voters</p>
                <p className="text-4xl font-bold text-green-600">{dashboardData?.registeredVoters || 0}</p>
              </div>
              <div className="p-4 rounded-full bg-green-100">
                <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-gray-500">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Click to view registered voters
            </div>
          </div>

          {/* System Users - Bottom Left */}
          <div
            onClick={() => handleCardClick("/admin/users")}
            className="bg-white rounded-xl shadow-lg p-8 cursor-pointer transform hover:scale-105 transition-all duration-200 hover:shadow-xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-medium text-gray-600 mb-2">System Users</p>
                <p className="text-4xl font-bold text-orange-600">{dashboardData?.systemUsers || 0}</p>
              </div>
              <div className="p-4 rounded-full bg-orange-100">
                <svg className="w-12 h-12 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-gray-500">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Click to manage users
            </div>
          </div>

          {/* Audit Logs - Bottom Right */}
          <div
            onClick={() => handleCardClick("/admin/audit-logs")}
            className="bg-white rounded-xl shadow-lg p-8 cursor-pointer transform hover:scale-105 transition-all duration-200 hover:shadow-xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-medium text-gray-600 mb-2">Audit Logs</p>
                <p className="text-4xl font-bold text-purple-600">{dashboardData?.auditLogs || 0}</p>
              </div>
              <div className="p-4 rounded-full bg-purple-100">
                <svg className="w-12 h-12 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-gray-500">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Click to view audit logs
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
