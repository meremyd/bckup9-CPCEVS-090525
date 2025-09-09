"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Building2, Users, CheckCircle, GraduationCap, User, MessageCircle, FileText, LogOut, ChevronRight, Loader2 } from "lucide-react"
import { logout } from "../../../lib/auth"
import { dashboardAPI } from '@/lib/api/dashboard'

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
      const data = await dashboardAPI.getAdminDashboard()
      console.log("[v0] Dashboard data received:", data)
      setDashboardData(data)
    } catch (error) {
      console.error("Dashboard error:", error)
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.warn("Session expired or unauthorized. Logging out.")
        logout()
        router.push("/adminlogin")
      } else {
        setError(error.message || "Network error - please check if the server is running")
      }
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
          <Loader2 className="animate-spin rounded-full h-12 w-12 mx-auto text-blue-600" />
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

  const dashboardCards = [
    {
      title: "Voters",
      value: dashboardData?.totalVoters || 0,
      color: "blue",
      path: "/admin/voters",
      icon: <Users className="w-8 h-8 sm:w-10 md:w-12" />
    },
    {
      title: "Registered Voters",
      value: dashboardData?.registeredVoters || 0,
      color: "green",
      path: "/admin/registered-voters",
      icon: <CheckCircle className="w-8 h-8 sm:w-10 md:w-12" />
    },
    {
      title: "Degrees",
      value: dashboardData?.totalDegrees || 0,
      color: "indigo",
      path: "/admin/degrees",
      icon: <GraduationCap className="w-8 h-8 sm:w-10 md:w-12" />
    },
    {
      title: "System Users",
      value: dashboardData?.systemUsers || 0,
      color: "orange",
      path: "/admin/users",
      icon: <User className="w-8 h-8 sm:w-10 md:w-12" />
    },
    {
      title: "Messages",
      value: dashboardData?.totalMessages || dashboardData?.supportRequests || 0,
      color: "pink",
      path: "/admin/messages",
      icon: <MessageCircle className="w-8 h-8 sm:w-10 md:w-12" />
    },
    {
      title: "Audit Logs",
      value: dashboardData?.auditLogs || 0,
      color: "purple",
      path: "/admin/audit-logs",
      icon: <FileText className="w-8 h-8 sm:w-10 md:w-12" />
    }
  ]

  const getColorClasses = (color) => {
    const colorMap = {
      blue: {
        text: "text-blue-600",
        bg: "bg-blue-100",
        hover: "hover:bg-blue-50"
      },
      green: {
        text: "text-green-600",
        bg: "bg-green-100",
        hover: "hover:bg-green-50"
      },
      orange: {
        text: "text-orange-600",
        bg: "bg-orange-100",
        hover: "hover:bg-orange-50"
      },
      purple: {
        text: "text-purple-600",
        bg: "bg-purple-100",
        hover: "hover:bg-purple-50"
      },
      indigo: {
        text: "text-indigo-600",
        bg: "bg-indigo-100",
        hover: "hover:bg-indigo-50"
      },
      pink: {
        text: "text-pink-600",
        bg: "bg-pink-100",
        hover: "hover:bg-pink-50"
      }
    }
    return colorMap[color] || colorMap.blue
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header with Logout */}
      <div className="bg-white shadow-sm border-b px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Admin Dashboard</h1>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <span className="text-xs sm:text-sm text-gray-600 hidden sm:block">Welcome, {user?.username}</span>
            <button
              onClick={handleLogout}
              className="flex items-center px-2 sm:px-4 py-2 text-xs sm:text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4 mr-1 sm:mr-2" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            {dashboardCards.map((card, index) => {
              const colors = getColorClasses(card.color)
              return (
                <div
                  key={index}
                  onClick={() => handleCardClick(card.path)}
                  className={`bg-white rounded-xl shadow-lg cursor-pointer transform hover:scale-105 transition-all duration-200 hover:shadow-xl ${colors.hover} h-48 lg:h-56 flex flex-col justify-center`}
                >
                  <div className="p-3 sm:p-4 lg:p-5 text-center h-full flex flex-col justify-center">
                    {/* Icon */}
                    <div className={`mx-auto p-3 sm:p-4 rounded-full ${colors.bg} mb-4`}>
                      <div className={colors.text}>
                        {card.icon}
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 flex flex-col justify-center">
                      <p className="text-sm sm:text-base lg:text-lg font-medium text-gray-600 mb-2">
                        {card.title}
                      </p>
                      <p className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${colors.text} mb-4`}>
                        {card.value}
                      </p>
                    </div>

                    {/* Action Indicator */}
                    <div className="flex items-center justify-center text-xs sm:text-sm text-gray-500">
                      <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      <span className="hidden sm:inline">Click to manage</span>
                      <span className="sm:hidden">Tap to open</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}