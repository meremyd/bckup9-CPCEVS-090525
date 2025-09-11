"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Users, UserCheck, Building2, LogOut, AlertCircle } from "lucide-react"
import { logout, getUserFromToken } from "../../../lib/auth"
import { dashboardAPI } from '@/lib/api/dashboard'

export default function SAODashboard() {
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [user, setUser] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const initializeDashboard = async () => {
      const token = localStorage.getItem("token")

      if (!token) {
        router.push("/adminlogin")
        return
      }

      try {
        // Use getUserFromToken for better token validation
        const userFromToken = getUserFromToken()
        if (!userFromToken) {
          router.push("/adminlogin")
          return
        }

        setUser(userFromToken)

        // Check if user is SAO
        if (userFromToken.userType !== "sao") {
          console.warn("Unauthorized access: User is not SAO")
          logout()
          router.push("/adminlogin")
          return
        }

        await fetchDashboardData()
      } catch (error) {
        console.error("Error initializing dashboard:", error)
        logout()
        router.push("/adminlogin")
      }
    }

    initializeDashboard()
  }, [router])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const data = await dashboardAPI.getSAODashboard()
      console.log("SAO Dashboard data received:", data)
      setDashboardData(data)
      setError("") // Clear any previous errors
    } catch (error) {
      console.error("Dashboard error:", error)
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.warn("Session expired or unauthorized. Logging out.")
        logout()
        router.push("/adminlogin")
      } else {
        // More specific error handling
        let errorMessage = "Failed to load dashboard data"
        
        if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
          errorMessage = "Network error - please check if the server is running"
        } else if (error.response?.status >= 500) {
          errorMessage = "Server error - please try again later"
        } else if (error.message) {
          errorMessage = error.message
        }
        
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    router.push("/adminlogin")
  }

  const handleRetry = () => {
    setError("")
    fetchDashboardData()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="text-center">
          <Loader2 className="animate-spin rounded-full h-12 w-12 mx-auto text-green-600" />
          <p className="mt-4 text-gray-600">Loading SAO dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl max-w-md">
          <div className="text-center">
            <AlertCircle className="text-red-500 w-16 h-16 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="space-y-2">
              <button
                onClick={handleRetry}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Retry
              </button>
              <button
                onClick={handleLogout}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-white/20">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center mr-3">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800">SAO Dashboard</h1>
                <p className="text-xs sm:text-sm text-gray-600">Student Affairs Office Portal</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-xs text-gray-500">Welcome back,</p>
                <p className="text-sm font-medium text-gray-700">{user?.username}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center px-2 sm:px-4 py-2 text-xs sm:text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
              >
                <LogOut className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Main Stats Card */}
          <div className="mb-8 flex justify-center">
            <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl p-6 shadow-xl min-w-[300px] max-w-md w-full">
              <div className="text-center">
                <div className="flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 mr-3" />
                  <h3 className="text-xl font-bold">Total Voters Overview</h3>
                </div>
                <div className="flex items-center justify-center space-x-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold">
                      {dashboardData?.registeredVoters || dashboardData?.totalRegisteredVoters || 0}
                    </p>
                    <p className="text-emerald-100 text-sm">Registered</p>
                  </div>
                  <div className="text-white/60 text-2xl">/</div>
                  <div className="text-center">
                    <p className="text-3xl font-bold">
                      {dashboardData?.totalVoters || 0}
                    </p>
                    <p className="text-emerald-100 text-sm">Total</p>
                  </div>
                </div>
                {dashboardData?.totalVoters > 0 && (
                  <div className="mt-4">
                    <div className="bg-white/20 rounded-full h-2">
                      <div 
                        className="bg-white rounded-full h-2 transition-all duration-500"
                        style={{ 
                          width: `${((dashboardData?.registeredVoters || 0) / dashboardData.totalVoters * 100)}%` 
                        }}
                      ></div>
                    </div>
                    <p className="text-emerald-100 text-xs mt-1">
                      {Math.round((dashboardData?.registeredVoters || 0) / dashboardData.totalVoters * 100)}% Registration Rate
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Department Statistics */}
          {dashboardData?.voterStatsByDepartment && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">Voter Statistics by Department</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {Object.entries(dashboardData.voterStatsByDepartment).map(([deptKey, stats]) => (
                  <div
                    key={deptKey}
                    className="bg-white rounded-lg shadow-lg border-2 border-green-200 hover:border-green-400 hover:scale-105 transition-all duration-200 p-4"
                  >
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-2">
                        <UserCheck className="w-5 h-5 text-green-600 mr-2" />
                        <h3 className="text-sm font-bold text-gray-800 truncate" title={deptKey}>
                          {deptKey}
                        </h3>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-center items-baseline space-x-1">
                          <span className="text-2xl font-bold text-green-600">
                            {stats.registered || 0}
                          </span>
                          <span className="text-gray-400">/</span>
                          <span className="text-lg font-semibold text-gray-600">
                            {stats.total || 0}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">Registered/Total</p>
                        
                        {/* Progress bar */}
                        {stats.total > 0 && (
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div 
                              className="bg-green-600 h-1.5 rounded-full transition-all duration-500"
                              style={{ width: `${(stats.registered / stats.total * 100)}%` }}
                            ></div>
                          </div>
                        )}
                        
                        {/* Percentage */}
                        <p className="text-xs text-green-600 font-medium">
                          {stats.total > 0 ? Math.round((stats.registered / stats.total) * 100) : 0}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fallback for legacy data structure */}
          {dashboardData?.voterStats && !dashboardData?.voterStatsByDepartment && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">Voter Statistics by Department</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {Object.entries(dashboardData.voterStats).map(([deptKey, stats]) => (
                  <div
                    key={deptKey}
                    className="bg-white rounded-lg shadow-lg border-2 border-green-200 hover:border-green-400 hover:scale-105 transition-all duration-200 p-4"
                  >
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-2">
                        <UserCheck className="w-5 h-5 text-green-600 mr-2" />
                        <h3 className="text-sm font-bold text-gray-800 truncate" title={deptKey}>
                          {deptKey}
                        </h3>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-center items-baseline space-x-1">
                          <span className="text-2xl font-bold text-green-600">
                            {stats.registered || 0}
                          </span>
                          <span className="text-gray-400">/</span>
                          <span className="text-lg font-semibold text-gray-600">
                            {stats.total || 0}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">Registered/Total</p>
                        
                        {/* Progress bar */}
                        {stats.total > 0 && (
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div 
                              className="bg-green-600 h-1.5 rounded-full transition-all duration-500"
                              style={{ width: `${(stats.registered / stats.total * 100)}%` }}
                            ></div>
                          </div>
                        )}
                        
                        {/* Percentage */}
                        <p className="text-xs text-green-600 font-medium">
                          {stats.total > 0 ? Math.round((stats.registered / stats.total) * 100) : 0}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Additional SAO Metrics */}
          {dashboardData && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {dashboardData.activeElections || 0}
                </div>
                <p className="text-sm text-gray-600">Active Elections</p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {dashboardData.totalCandidates || 0}
                </div>
                <p className="text-sm text-gray-600">Total Candidates</p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {dashboardData.totalVotes || 0}
                </div>
                <p className="text-sm text-gray-600">Votes Cast</p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {dashboardData.totalDepartments || dashboardData.totalDegrees || 0}
                </div>
                <p className="text-sm text-gray-600">Departments</p>
              </div>
            </div>
          )}

          {/* No Data State */}
          {!dashboardData?.voterStats && !dashboardData?.voterStatsByDepartment && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">No voter data available</h3>
              <p className="text-gray-500 mb-4">Voter statistics will appear here once data is loaded</p>
              <button
                onClick={handleRetry}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Refresh Data
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}