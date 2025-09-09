"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { dashboardAPI } from '@/lib/api/dashboard'
import { electionsAPI } from '@/lib/api/elections'

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
        const userData = localStorage.getItem("user")

        if (!token) {
          router.push("/adminlogin")
          return
        }

        let parsedUser = null
        if (userData) {
          try {
            parsedUser = JSON.parse(userData)
          } catch (parseError) {
            console.error("Error parsing user data:", parseError)
            localStorage.removeItem("user")
            localStorage.removeItem("token")
            router.push("/adminlogin")
            return
          }
        }

        if (!parsedUser || parsedUser.userType !== "election_committee") {
          localStorage.removeItem("user")
          localStorage.removeItem("token")
          router.push("/adminlogin")
          return
        }

        setUser(parsedUser)
        await Promise.all([fetchDashboardData(), fetchElections()])
      } catch (error) {
        console.error("Auth check error:", error)
        setError("Authentication error occurred")
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
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        router.push("/adminlogin")
      } else {
        setError(error.message || "Failed to load dashboard data")
      }
    }
  }

  const fetchElections = async () => {
    try {
      const data = await electionsAPI.getAll()
      const allElections = data.elections || data
      
      // Separate elections by type
      const ssgElections = allElections.filter(election => election.electionType === 'ssg')
      const departmentalElections = allElections.filter(election => election.electionType === 'departmental')
      
      setElections({
        ssg: ssgElections,
        departmental: departmentalElections
      })
    } catch (error) {
      console.error("Fetch elections error:", error)
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        router.push("/adminlogin")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    router.push("/adminlogin")
  }

  const handleElectionTypeClick = (type) => {
    router.push(`/ecommittee/${type}`)
  }

  const getElectionTypeInfo = (type) => {
    const info = {
      ssg: {
        title: "SSG Election",
        subtitle: "Student Government",
        icon: (
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        ),
        gradient: "bg-gradient-to-br from-indigo-500 to-purple-600"
      },
      departmental: {
        title: "Departmental Election",
        subtitle: "Department Representatives",
        icon: (
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
        ),
        gradient: "bg-gradient-to-br from-teal-500 to-cyan-600"
      }
    }
    return info[type]
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto"></div>
          <p className="mt-6 text-lg text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-xl max-w-md border border-red-200">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
              >
                Retry
              </button>
              <button
                onClick={handleLogout}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm shadow-sm border-b border-indigo-100">
        <div className="px-6 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Election Committee Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome back, {user?.username}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium shadow-sm"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Election Management Cards with Total Registered Voters */}
        <div className="mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* Total Registered Voters Card */}
            <div 
              onClick={() => router.push('/ecommittee/voters')}
              className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-105"
            >
              <div className="text-center">
                <div className="flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 text-indigo-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2">Total Registered Voters</h3>
                <p className="text-4xl font-bold mb-2">
                  {dashboardData?.registeredVoters || 0}
                </p>
                <p className="text-indigo-200 text-sm">
                  of {dashboardData?.totalVoters || 0} total students
                </p>
                <div className="mt-3 bg-white/20 rounded-full h-2">
                  <div 
                    className="bg-white rounded-full h-2 transition-all duration-500"
                    style={{ 
                      width: `${dashboardData?.totalVoters > 0 ? 
                        (dashboardData?.registeredVoters / dashboardData?.totalVoters) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* SSG Election Card */}
            <div
              onClick={() => handleElectionTypeClick('ssg')}
              className={`${getElectionTypeInfo('ssg').gradient} text-white rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 transform`}
            >
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  {getElectionTypeInfo('ssg').icon}
                </div>
                <h3 className="text-xl font-bold mb-2">{getElectionTypeInfo('ssg').title}</h3>
                <p className="text-indigo-100 mb-4">{getElectionTypeInfo('ssg').subtitle}</p>
                
                <div className="bg-white/20 rounded-lg p-3 mb-3">
                  <p className="text-sm mb-1">Active Elections</p>
                  <p className="text-3xl font-bold">{elections.ssg.length}</p>
                </div>
                
                <div className="flex items-center justify-center text-indigo-200">
                  <span className="text-sm font-medium">Manage Elections</span>
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Departmental Election Card */}
            <div
              onClick={() => handleElectionTypeClick('departmental')}
              className={`${getElectionTypeInfo('departmental').gradient} text-white rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 transform`}
            >
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  {getElectionTypeInfo('departmental').icon}
                </div>
                <h3 className="text-xl font-bold mb-2">{getElectionTypeInfo('departmental').title}</h3>
                <p className="text-teal-100 mb-4">{getElectionTypeInfo('departmental').subtitle}</p>
                
                <div className="bg-white/20 rounded-lg p-3 mb-3">
                  <p className="text-sm mb-1">Active Elections</p>
                  <p className="text-3xl font-bold">{elections.departmental.length}</p>
                </div>
                
                <div className="flex items-center justify-center text-teal-200">
                  <span className="text-sm font-medium">Manage Elections</span>
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}