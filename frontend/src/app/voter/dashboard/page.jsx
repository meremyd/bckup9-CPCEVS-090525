"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Vote, GraduationCap, MessageSquare, HelpCircle, LogOut, ChevronRight, Loader2, Fingerprint } from "lucide-react"
import Swal from 'sweetalert2'
import { dashboardAPI } from '@/lib/api/dashboard'
import { ssgElectionsAPI } from '@/lib/api/ssgElections'
import { departmentalElectionsAPI } from '@/lib/api/departmentalElections'
import { getVoterFromToken, voterLogout } from '../../../lib/auth'
import VoterBackground from '@/components/VoterBackground'

export default function VoterDashboard() {
  const [dashboardData, setDashboardData] = useState(null)
  const [votingStatus, setVotingStatus] = useState({
    ssg: { hasVoted: false, availableElections: 0 },
    departmental: { hasVoted: false, availableElections: 0 }
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [voter, setVoter] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      try {
        const voterToken = localStorage.getItem("voterToken")

        if (!voterToken) {
          router.push("/voterlogin")
          return
        }

        const voterFromToken = getVoterFromToken()
        if (!voterFromToken) {
          router.push("/voterlogin")
          return
        }

        setVoter(voterFromToken)
        await Promise.all([fetchDashboardData(), fetchVotingStatus()])
      } catch (error) {
        console.error("Auth check error:", error)
        setError("Authentication error occurred")
        voterLogout()
        router.push("/voterlogin")
      } 
    }

    checkAuthAndLoadData()
  }, [router])

  const fetchDashboardData = async () => {
    try {
      const data = await dashboardAPI.getVoterDashboard()
      setDashboardData(data)
    } catch (error) {
      console.error("Dashboard error:", error)
      if (error.response?.status === 401 || error.response?.status === 403) {
        voterLogout()
        router.push("/voterlogin")
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

  const fetchVotingStatus = async () => {
    try {
      // Fetch SSG elections
      const ssgResponse = await ssgElectionsAPI.getForVoting()
      let ssgElections = []
      if (ssgResponse.elections) {
        ssgElections = ssgResponse.elections
      } else if (Array.isArray(ssgResponse)) {
        ssgElections = ssgResponse
      }

      // Fetch departmental elections
      const deptResponse = await departmentalElectionsAPI.getAll({ status: 'active' })
      let departmentalElections = []
      if (deptResponse.elections) {
        departmentalElections = deptResponse.elections
      } else if (Array.isArray(deptResponse)) {
        departmentalElections = deptResponse
      }

      // Check voting status (this would need to be implemented in the API)
      setVotingStatus({
        ssg: { 
          hasVoted: false, // This should come from API
          availableElections: ssgElections.length 
        },
        departmental: { 
          hasVoted: false, // This should come from API
          availableElections: departmentalElections.length 
        }
      })
    } catch (error) {
      console.error("Fetch voting status error:", error)
      if (error.response?.status === 401 || error.response?.status === 403) {
        voterLogout()
        router.push("/voterlogin")
      }
      // Set default values on error
      setVotingStatus({
        ssg: { hasVoted: false, availableElections: 0 },
        departmental: { hasVoted: false, availableElections: 0 }
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'You will be logged out of your account',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, logout',
      cancelButtonText: 'Cancel'
    })

    if (result.isConfirmed) {
      voterLogout()
      router.push("/voterlogin")
      
      Swal.fire({
        title: 'Logged Out',
        text: 'You have been successfully logged out',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      })
    }
  }

  const handleCardClick = async (path, cardTitle) => {
    if (path === '/voters/ssg' && votingStatus.ssg.availableElections === 0) {
      await Swal.fire({
        title: 'No SSG Elections',
        text: 'There are currently no active SSG elections available',
        icon: 'info',
        confirmButtonText: 'OK'
      })
      return
    }
    
    if (path === '/voters/departmental' && votingStatus.departmental.availableElections === 0) {
      await Swal.fire({
        title: 'No Departmental Elections',
        text: 'There are currently no departmental elections available for your department',
        icon: 'info',
        confirmButtonText: 'OK'
      })
      return
    }

    router.push(path)
  }

  const handleRetry = () => {
    setError("")
    setLoading(true)
    Promise.all([fetchDashboardData(), fetchVotingStatus()])
  }

  if (loading) {
    return (
      <VoterBackground>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20">
            <Loader2 className="animate-spin rounded-full h-12 w-12 mx-auto text-white" />
            <p className="mt-4 text-white font-medium">Loading dashboard...</p>
          </div>
        </div>
      </VoterBackground>
    )
  }

  if (error) {
    return (
      <VoterBackground>
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
                onClick={() => router.push("/voterlogin")}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </VoterBackground>
    )
  }

  const dashboardCards = [
    {
      title: "SSG ELECTION",
      subtitle: "Student Supreme Government",
      availableElections: votingStatus.ssg.availableElections,
      hasVoted: votingStatus.ssg.hasVoted,
      color: "blue",
      path: "/voters/ssg",
      icon: <Vote className="w-8 h-8 sm:w-10 md:w-12" />
    },
    {
      title: "DEPARTMENTAL ELECTION", 
      subtitle: "Class Officers",
      availableElections: votingStatus.departmental.availableElections,
      hasVoted: votingStatus.departmental.hasVoted,
      color: "green",
      path: "/voters/departmental",
      icon: <GraduationCap className="w-8 h-8 sm:w-10 md:w-12" />
    },
    {
      title: "FAQ",
      subtitle: "Frequently Asked Questions",
      color: "purple",
      path: "/voters/faq",
      icon: <HelpCircle className="w-8 h-8 sm:w-10 md:w-12" />
    },
    {
      title: "MESSAGES",
      subtitle: "Support & Notifications",
      color: "orange",
      path: "/voters/messages",
      icon: <MessageSquare className="w-8 h-8 sm:w-10 md:w-12" />
    }
  ]

  const getColorClasses = (color, hasVoted = false) => {
    const colorMap = {
      blue: {
        text: hasVoted ? "text-blue-600" : "text-[#001f65]",
        bg: hasVoted ? "bg-blue-100/80" : "bg-blue-50/80",
        hover: hasVoted ? "hover:bg-blue-200/80" : "hover:bg-blue-100/80",
        border: hasVoted ? "border-blue-300/60" : "border-blue-200/60",
        fingerprint: hasVoted ? "text-blue-600" : "text-gray-400"
      },
      green: {
        text: hasVoted ? "text-green-600" : "text-[#001f65]",
        bg: hasVoted ? "bg-green-100/80" : "bg-green-50/80",
        hover: hasVoted ? "hover:bg-green-200/80" : "hover:bg-green-100/80",
        border: hasVoted ? "border-green-300/60" : "border-green-200/60",
        fingerprint: hasVoted ? "text-green-600" : "text-gray-400"
      },
      purple: {
        text: "text-[#001f65]",
        bg: "bg-purple-50/80",
        hover: "hover:bg-purple-100/80",
        border: "border-purple-200/60",
        fingerprint: "text-gray-400"
      },
      orange: {
        text: "text-[#001f65]",
        bg: "bg-orange-50/80",
        hover: "hover:bg-orange-100/80",
        border: "border-orange-200/60",
        fingerprint: "text-gray-400"
      }
    }
    return colorMap[color] || colorMap.blue
  }

  return (
    <VoterBackground>
      {/* Header with Logout */}
      <div className="bg-white/95 backdrop-blur-sm shadow-lg border-b border-white/30 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-br from-[#001f65] to-[#003399] rounded-lg flex items-center justify-center mr-3 shadow-lg">
              <Vote className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#001f65]">
                Voter Dashboard
              </h1>
              <p className="text-xs text-[#001f65]/70">
                Welcome, {voter?.firstName} {voter?.lastName}
              </p>
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

      {/* Main Content - Dashboard Cards */}
      <div className="min-h-[calc(100vh-120px)] flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-4xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
            {dashboardCards.map((card, index) => {
              const colors = getColorClasses(card.color, card.hasVoted)
              const isElectionCard = card.title.includes('ELECTION')
              
              return (
                <div
                  key={index}
                  onClick={() => handleCardClick(card.path, card.title)}
                  className={`bg-white/90 backdrop-blur-sm rounded-xl shadow-lg cursor-pointer transform hover:scale-105 transition-all duration-300 hover:shadow-2xl ${colors.hover} border ${colors.border} h-64 lg:h-72 flex flex-col justify-center items-center hover:bg-white/95 relative`}
                >
                  {/* Fingerprint icon for election cards */}
                  {isElectionCard && (
                    <div className="absolute top-4 right-4">
                      <Fingerprint className={`w-6 h-6 ${colors.fingerprint} transition-colors duration-300`} />
                    </div>
                  )}
                  
                  <div className="p-6 text-center h-full flex flex-col justify-center items-center w-full">
                    {/* Icon */}
                    <div className={`p-4 rounded-full ${colors.bg} mb-6 shadow-lg border ${colors.border}`}>
                      <div className={colors.text}>
                        {card.icon}
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 flex flex-col justify-center items-center">
                      <h3 className={`text-lg sm:text-xl font-bold ${colors.text} mb-2 text-center leading-tight`}>
                        {card.title}
                      </h3>
                      <p className="text-sm sm:text-base text-gray-600 mb-4 text-center">
                        {card.subtitle}
                      </p>
                      
                      {/* Election status */}
                      {isElectionCard && (
                        <div className="mb-4">
                          {card.hasVoted ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                              ✓ Voted
                            </span>
                          ) : card.availableElections > 0 ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                              {card.availableElections} Available
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
                              No Elections
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Indicator */}
                    <div className="flex items-center justify-center text-sm text-gray-500">
                      <ChevronRight className="w-4 h-4 mr-1" />
                      <span className="hidden sm:inline">Click to access</span>
                      <span className="sm:hidden">Tap to open</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </VoterBackground>
  )
}