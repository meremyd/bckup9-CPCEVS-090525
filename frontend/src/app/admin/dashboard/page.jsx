"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Building2, Users, CheckCircle, GraduationCap, User, MessageCircle, FileText, LogOut, ChevronRight, Loader2 } from "lucide-react"
import { logout, getUserFromToken } from "../../../lib/auth"
import { dashboardAPI } from '@/lib/api/dashboard'
import BackgroundWrapper from '@/components/BackgroundWrapper'

export default function AdminDashboard() {
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

        // Check if user is admin
        if (userFromToken.userType !== "admin") {
          console.warn("Unauthorized access: User is not an admin")
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
      const data = await dashboardAPI.getAdminDashboard()
      console.log("Dashboard data received:", data)
      setDashboardData(data)
      setError("") // Clear any previous errors
    } catch (error) {
      console.error("Dashboard error:", error)
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.warn("Session expired or unauthorized. Logging out.")
        logout()
        router.push("/adminlogin")
      } else {
        // More specific error handling based on error type
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

  const handleCardClick = (path) => {
    router.push(path)
  }

  const handleRetry = () => {
    setError("")
    fetchDashboardData()
  }

  if (loading) {
    return (
      <BackgroundWrapper>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20">
            <Loader2 className="animate-spin rounded-full h-12 w-12 mx-auto text-white" />
            <p className="mt-4 text-white font-medium">Loading dashboard...</p>
          </div>
        </div>
      </BackgroundWrapper>
    )
  }

  if (error) {
    return (
      <BackgroundWrapper>
        <div className="min-h-screen flex items-center justify-center">
          <div className="bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-xl max-w-md mx-auto border border-white/20">
            <div className="text-red-500 text-6xl mb-4 text-center">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Error</h2>
            <p className="text-gray-600 mb-4 text-center">{error}</p>
            <div className="space-y-2">
              <button
                onClick={handleRetry}
                className="w-full bg-[#001f65] hover:bg-[#003399] text-white px-6 py-2 rounded-lg transition-colors"
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
      </BackgroundWrapper>
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
      color: "emerald",
      path: "/admin/registered-voters",
      icon: <CheckCircle className="w-8 h-8 sm:w-10 md:w-12" />
    },
    {
      title: "Departments",
      value: dashboardData?.totalDepartments || dashboardData?.totalDegrees || 0,
      color: "violet",
      path: "/admin/departments",
      icon: <GraduationCap className="w-8 h-8 sm:w-10 md:w-12" />
    },
    {
      title: "System Users",
      value: dashboardData?.systemUsers || dashboardData?.totalUsers || 0,
      color: "amber",
      path: "/admin/users",
      icon: <User className="w-8 h-8 sm:w-10 md:w-12" />
    },
    {
      title: "Support Messages",
      value: dashboardData?.totalMessages || dashboardData?.supportRequests || dashboardData?.totalSupportRequests || 0,
      color: "rose",
      path: "/admin/messages",
      icon: <MessageCircle className="w-8 h-8 sm:w-10 md:w-12" />
    },
    {
      title: "Audit Logs",
      value: dashboardData?.auditLogs || dashboardData?.totalAuditLogs || 0,
      color: "cyan",
      path: "/admin/audit-logs",
      icon: <FileText className="w-8 h-8 sm:w-10 md:w-12" />
    }
  ]

  const getColorClasses = (color) => {
    const colorMap = {
      blue: {
        text: "text-[#001f65]",
        bg: "bg-[#b0c8fe]/30",
        hover: "hover:bg-[#b0c8fe]/20",
        border: "border-[#b0c8fe]/40",
        shadow: "shadow-[#b0c8fe]/20"
      },
      emerald: {
        text: "text-[#001f65]",
        bg: "bg-[#b0c8fe]/25",
        hover: "hover:bg-[#b0c8fe]/15",
        border: "border-[#b0c8fe]/35",
        shadow: "shadow-[#b0c8fe]/15"
      },
      amber: {
        text: "text-[#001f65]",
        bg: "bg-[#b0c8fe]/35",
        hover: "hover:bg-[#b0c8fe]/25",
        border: "border-[#b0c8fe]/45",
        shadow: "shadow-[#b0c8fe]/25"
      },
      violet: {
        text: "text-[#001f65]",
        bg: "bg-[#b0c8fe]/40",
        hover: "hover:bg-[#b0c8fe]/30",
        border: "border-[#b0c8fe]/50",
        shadow: "shadow-[#b0c8fe]/30"
      },
      rose: {
        text: "text-[#001f65]",
        bg: "bg-[#b0c8fe]/20",
        hover: "hover:bg-[#b0c8fe]/10",
        border: "border-[#b0c8fe]/30",
        shadow: "shadow-[#b0c8fe]/10"
      },
      cyan: {
        text: "text-[#001f65]",
        bg: "bg-[#b0c8fe]/45",
        hover: "hover:bg-[#b0c8fe]/35",
        border: "border-[#b0c8fe]/55",
        shadow: "shadow-[#b0c8fe]/35"
      }
    }
    return colorMap[color] || colorMap.blue
  }

  return (
    <BackgroundWrapper>
      {/* Header with Logout */}
      <div className="bg-[#b0c8fe]/95 backdrop-blur-sm shadow-lg border-b border-[#b0c8fe]/30 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-br from-[#001f65] to-[#003399] rounded-lg flex items-center justify-center mr-3 shadow-lg">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#001f65]">
                Admin Dashboard
              </h1>
              <p className="text-xs text-[#001f65]/70">Welcome back, {user?.username}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={handleLogout}
              className="flex items-center px-2 sm:px-4 py-2 text-xs sm:text-sm text-red-600 hover:bg-red-50/80 rounded-lg transition-colors border border-red-200 bg-white/60 backdrop-blur-sm"
            >
              <LogOut className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Dashboard Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            {dashboardCards.map((card, index) => {
              const colors = getColorClasses(card.color)
              return (
                <div
                  key={index}
                  onClick={() => handleCardClick(card.path)}
                  className={`bg-white/90 backdrop-blur-sm rounded-xl shadow-lg cursor-pointer transform hover:scale-105 transition-all duration-300 hover:shadow-2xl ${colors.hover} border ${colors.border} h-48 lg:h-56 flex flex-col justify-center hover:bg-white/95`}
                >
                  <div className="p-3 sm:p-4 lg:p-5 text-center h-full flex flex-col justify-center">
                    {/* Icon */}
                    <div className={`mx-auto p-3 sm:p-4 rounded-full ${colors.bg} mb-4 shadow-lg border border-[#b0c8fe]/20`}>
                      <div className={colors.text}>
                        {card.icon}
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 flex flex-col justify-center">
                      <p className="text-sm sm:text-base lg:text-lg font-medium text-[#001f65]/80 mb-2">
                        {card.title}
                      </p>
                      <p className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${colors.text} mb-4`}>
                        {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
                      </p>
                    </div>

                    {/* Action Indicator */}
                    <div className="flex items-center justify-center text-xs sm:text-sm text-[#001f65]/60">
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
    </BackgroundWrapper>
  )
}