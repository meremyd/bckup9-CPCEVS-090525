"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { dashboardAPI, electionsAPI } from '@/lib/api/dashboard'

export default function SAODashboard() {
  const [dashboardData, setDashboardData] = useState(null)
  const [elections, setElections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [user, setUser] = useState(null)
  const [selectedDegree, setSelectedDegree] = useState("")
  const [activeTab, setActiveTab] = useState("ssg")
  const [showSidebar, setShowSidebar] = useState(false)
  const [selectedElection, setSelectedElection] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const initializeDashboard = async () => {
      const token = localStorage.getItem("token")
      const userData = localStorage.getItem("user")

      if (!token || !userData) {
        router.push("/adminlogin")
        return
      }

      try {
        const parsedUser = JSON.parse(userData)
        setUser(parsedUser)

        if (parsedUser.userType !== "sao") {
          console.log("User type:", parsedUser.userType, "- redirecting to login")
          localStorage.removeItem("token")
          localStorage.removeItem("user")
          router.push("/adminlogin")
          return
        }

        fetchDashboardData(token)
        fetchElections(token)
      } catch (parseError) {
        console.error("Error parsing user data:", parseError)
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        router.push("/adminlogin")
      }
    }

    initializeDashboard()
  }, [router])

  const fetchDashboardData = async (token) => {
    try {
      const data = await dashboardAPI.getSAODashboard()
      setDashboardData(data)
    } catch (error) {
      console.error("Dashboard error:", error)
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        router.push("/adminlogin")
      } else {
        setError(error.message || "Network error - please check if the server is running")
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchElections = async (token) => {
    try {
      const data = await electionsAPI.getAll()
      setElections(data.elections || data)
    } catch (error) {
      console.error("Fetch elections error:", error)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    router.push("/adminlogin")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl max-w-md">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="space-y-2">
              <button
                onClick={() => window.location.reload()}
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
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">SAO Dashboard</h1>
              <p className="text-gray-600">Welcome, {user?.username}</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="p-6">
        {/* Voter Summary Card */}
        <div className="mb-8 flex justify-center">
          <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl p-6 shadow-lg min-w-[300px]">
            <div className="text-center">
              <h3 className="text-xl font-bold mb-2">Total Voters</h3>
              <p className="text-3xl font-bold">
                {dashboardData?.registeredVoters || 0}/{dashboardData?.totalVoters || 0}
              </p>
              <p className="text-emerald-100 text-sm">Registered/Total</p>
            </div>
          </div>
        </div>

        {/* Voter Cards by Degree */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          {dashboardData?.voterStats &&
            Object.entries(dashboardData.voterStats).map(([degreeKey, stats]) => (
              <div
                key={degreeKey}
                className="p-4 rounded-lg border-2 bg-green-100 text-green-800 border-green-200 hover:scale-105 transition-all duration-200"
              >
                <div className="text-center">
                  <h3 className="text-lg font-bold">{degreeKey}</h3>
                  <p className="text-2xl font-bold mt-2">
                    {stats.registered}/{stats.total}
                  </p>
                  <p className="text-xs opacity-75 mt-1">Registered/Total</p>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
