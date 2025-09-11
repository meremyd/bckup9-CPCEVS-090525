"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Building2, Vote, Users, CheckCircle, GraduationCap, LogOut, ChevronRight, Loader2 } from "lucide-react"
import { dashboardAPI } from '@/lib/api/dashboard'
import { ssgElectionsAPI } from '@/lib/api/ssgElections'
import { departmentalElectionsAPI } from '@/lib/api/departmentalElections'
import { getUserFromToken, logout } from '../../../lib/auth'
import BackgroundWrapper from '@/components/BackgroundWrapper'

export default function ElectionCommitteeDashboard() {
  const [dashboardData, setDashboardData] = useState(null)
  const [elections, setElections] = useState({ ssg: [], departmental: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [user, setUser] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      try {
        const token = localStorage.getItem("token")

        if (!token) {
          router.push("/adminlogin")
          return
        }

        // Use getUserFromToken for better token validation
        const userFromToken = getUserFromToken()
        if (!userFromToken) {
          router.push("/adminlogin")
          return
        }

        if (userFromToken.userType !== "election_committee") {
          console.warn("Unauthorized access: User is not an election committee member")
          logout()
          router.push("/adminlogin")
          return
        }

        setUser(userFromToken)
        await Promise.all([fetchDashboardData(), fetchElections()])
      } catch (error) {
        console.error("Auth check error:", error)
        setError("Authentication error occurred")
        logout()
        router.push("/adminlogin")
      } 
    }

    checkAuthAndLoadData()
  }, [router])

  const fetchDashboardData = async () => {
    try {
      const data = await dashboardAPI.getCommitteeDashboard()
      setDashboardData(data)
    } catch (error) {
      console.error("Dashboard error:", error)
      if (error.response?.status === 401 || error.response?.status === 403) {
        logout()
        router.push("/adminlogin")
      } else {
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
    }
  }

  const fetchElections = async () => {
    try {
      // Fetch SSG elections - handle different response structures
      const ssgResponse = await ssgElectionsAPI.getAll()
      console.log('SSG Response:', ssgResponse) // Debug log
      let ssgElections = []
      if (ssgResponse.data?.elections) {
        ssgElections = ssgResponse.data.elections
      } else if (ssgResponse.elections) {
        ssgElections = ssgResponse.elections
      } else if (Array.isArray(ssgResponse.data)) {
        ssgElections = ssgResponse.data
      } else if (Array.isArray(ssgResponse)) {
        ssgElections = ssgResponse
      }
      
      // Fetch departmental elections - handle different response structures
      const deptResponse = await departmentalElectionsAPI.getAll()
      console.log('Dept Response:', deptResponse) // Debug log
      let departmentalElections = []
      if (deptResponse.data?.elections) {
        departmentalElections = deptResponse.data.elections
      } else if (deptResponse.elections) {
        departmentalElections = deptResponse.elections
      } else if (Array.isArray(deptResponse.data)) {
        departmentalElections = deptResponse.data
      } else if (Array.isArray(deptResponse)) {
        departmentalElections = deptResponse
      }
      
      console.log('SSG Elections:', ssgElections.length) // Debug log
      console.log('Dept Elections:', departmentalElections.length) // Debug log
      
      setElections({
        ssg: ssgElections,
        departmental: departmentalElections
      })
    } catch (error) {
      console.error("Fetch elections error:", error)
      if (error.response?.status === 401 || error.response?.status === 403) {
        logout()
        router.push("/adminlogin")
      }
      // Set empty arrays on error to prevent undefined values
      setElections({
        ssg: [],
        departmental: []
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    router.push("/adminlogin")
  }

  const handleElectionTypeClick = (type) => {
    router.push(`/ecommittee/${type}`)
  }

  const handleRetry = () => {
    setError("")
    setLoading(true)
    Promise.all([fetchDashboardData(), fetchElections()])
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
      title: "Total Registered Voters",
      value: dashboardData?.registeredVoters || 0,
      color: "blue",
      path: "/ecommittee/voters",
      icon: <CheckCircle className="w-8 h-8 sm:w-10 md:w-12" />
    },
    {
      title: "Total SSG Elections",
      value: elections.ssg?.length || 0,
      color: "violet",
      path: "/ecommittee/ssg",
      icon: <Vote className="w-8 h-8 sm:w-10 md:w-12" />
    },
    {
      title: "Total Departmental Elections",
      value: elections.departmental?.length || 0,
      color: "cyan",
      path: "/ecommittee/departmental",
      icon: <GraduationCap className="w-8 h-8 sm:w-10 md:w-12" />
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
      violet: {
        text: "text-[#001f65]",
        bg: "bg-[#b0c8fe]/40",
        hover: "hover:bg-[#b0c8fe]/30",
        border: "border-[#b0c8fe]/50",
        shadow: "shadow-[#b0c8fe]/30"
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
      {/* Header with Logout - matching admin dashboard style */}
      <div className="bg-[#b0c8fe]/95 backdrop-blur-sm shadow-lg border-b border-[#b0c8fe]/30 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-br from-[#001f65] to-[#003399] rounded-lg flex items-center justify-center mr-3 shadow-lg">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#001f65]">
                Election Committee Dashboard
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

      {/* Main Content - Centered Dashboard Cards */}
      <div className="min-h-[calc(100vh-120px)] flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-6xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {dashboardCards.map((card, index) => {
              const colors = getColorClasses(card.color)
              return (
                <div
                  key={index}
                  onClick={() => router.push(card.path)}
                  className={`bg-white/90 backdrop-blur-sm rounded-xl shadow-lg cursor-pointer transform hover:scale-105 transition-all duration-300 hover:shadow-2xl ${colors.hover} border ${colors.border} h-56 lg:h-64 flex flex-col justify-center items-center hover:bg-white/95`}
                >
                  <div className="p-6 text-center h-full flex flex-col justify-center items-center w-full">
                    {/* Icon */}
                    <div className={`p-4 rounded-full ${colors.bg} mb-6 shadow-lg border border-[#b0c8fe]/20`}>
                      <div className={colors.text}>
                        {card.icon}
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 flex flex-col justify-center items-center">
                      <p className="text-base sm:text-lg font-medium text-[#001f65]/80 mb-3 text-center">
                        {card.title}
                      </p>
                      <p className={`text-3xl sm:text-4xl lg:text-5xl font-bold ${colors.text} mb-6`}>
                        {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
                      </p>
                    </div>

                    {/* Action Indicator */}
                    <div className="flex items-center justify-center text-sm text-[#001f65]/60">
                      <ChevronRight className="w-4 h-4 mr-1" />
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