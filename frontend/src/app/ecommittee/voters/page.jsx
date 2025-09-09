"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { votersAPI } from '@/lib/api/voters'

export default function ElectionCommitteeVotersPage() {
  const [allVoters, setAllVoters] = useState([])
  const [registeredVoters, setRegisteredVoters] = useState([])
  const [officers, setOfficers] = useState([])
  const [degreeStats, setDegreeStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDegree, setSelectedDegree] = useState("")
  const [activeTab, setActiveTab] = useState("voters")
  const [toggleLoading, setToggleLoading] = useState({})
  const [user, setUser] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const checkAuthAndFetchData = async () => {
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
        await fetchAllData()
      } catch (error) {
        console.error("Auth check error:", error)
        setError("Authentication error occurred")
        router.push("/adminlogin")
      }
    }

    checkAuthAndFetchData()
  }, [router])

  useEffect(() => {
    // Refetch data when tab changes to ensure fresh data
    if (activeTab === "registered") {
      fetchRegisteredVoters()
    } else if (activeTab === "officers") {
      fetchOfficers()
    }
  }, [activeTab])

  const fetchAllData = async () => {
    try {
      setLoading(true)
      
      // Fetch all data concurrently
      const [votersData, registeredData, officersData, statsData] = await Promise.all([
        votersAPI.getAll(),
        votersAPI.getRegistered(),
        votersAPI.getOfficers(),
        votersAPI.getStatisticsByDegree()
      ])

      setAllVoters(votersData)
      setRegisteredVoters(registeredData)
      setOfficers(officersData)
      setDegreeStats(statsData)
      
    } catch (error) {
      console.error("Fetch data error:", error)
      setError(error.message || "Failed to fetch data")
    } finally {
      setLoading(false)
    }
  }

  const fetchRegisteredVoters = async () => {
    try {
      const data = await votersAPI.getRegistered()
      setRegisteredVoters(data)
    } catch (error) {
      console.error("Fetch registered voters error:", error)
    }
  }

  const fetchOfficers = async () => {
    try {
      const data = await votersAPI.getOfficers()
      setOfficers(data)
    } catch (error) {
      console.error("Fetch officers error:", error)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    router.push("/adminlogin")
  }

  const handleToggleOfficer = async (voterId) => {
    try {
      setToggleLoading(prev => ({ ...prev, [voterId]: true }))
      
      const result = await votersAPI.toggleOfficerStatus(voterId)
      
      // Refresh all relevant data
      await fetchAllData()
      
      // Show success message (you can implement toast notifications)
      console.log('Officer status updated:', result.message)
      
    } catch (error) {
      console.error("Toggle officer error:", error)
      setError(error.message || "Failed to update officer status")
      
      // Clear error after 3 seconds
      setTimeout(() => setError(""), 3000)
    } finally {
      setToggleLoading(prev => ({ ...prev, [voterId]: false }))
    }
  }

  const handleDegreeCardClick = (degreeId) => {
    setSelectedDegree(selectedDegree === degreeId ? "" : degreeId)
  }

  const getDegreeCardColors = (degreeCode, isSelected) => {
    const baseColors = {
      'BSIT': isSelected 
        ? 'bg-green-500 text-white shadow-lg ring-4 ring-green-300' 
        : 'bg-green-100 text-green-800 hover:bg-green-200',
      'BEED': isSelected 
        ? 'bg-red-500 text-white shadow-lg ring-4 ring-red-300' 
        : 'bg-red-100 text-red-800 hover:bg-red-200',
      'BSED': isSelected 
        ? 'bg-blue-500 text-white shadow-lg ring-4 ring-blue-300' 
        : 'bg-blue-100 text-blue-800 hover:bg-blue-200',
      'BSHM': isSelected 
        ? 'bg-orange-500 text-white shadow-lg ring-4 ring-orange-300' 
        : 'bg-orange-100 text-orange-800 hover:bg-orange-200'
    }
    
    // Handle different BSED majors with different blue shades
    if (degreeCode?.startsWith('BSED')) {
      if (isSelected) {
        return 'bg-blue-500 text-white shadow-lg ring-4 ring-blue-300'
      } else {
        // Different blue shades for different majors
        const blueVariants = [
          'bg-blue-100 text-blue-800 hover:bg-blue-200',
          'bg-sky-100 text-sky-800 hover:bg-sky-200',
          'bg-indigo-100 text-indigo-800 hover:bg-indigo-200',
          'bg-cyan-100 text-cyan-800 hover:bg-cyan-200'
        ]
        const hash = degreeCode.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
        return blueVariants[hash % blueVariants.length]
      }
    }
    
    return baseColors[degreeCode] || (isSelected 
      ? 'bg-gray-500 text-white shadow-lg ring-4 ring-gray-300' 
      : 'bg-gray-100 text-gray-800 hover:bg-gray-200')
  }

  const getCurrentVoters = () => {
    switch (activeTab) {
      case "registered":
        return registeredVoters
      case "officers":
        return officers
      default:
        return allVoters
    }
  }

  const getFilteredVoters = () => {
    const voters = getCurrentVoters()
    
    return voters.filter(voter => {
      const matchesSearch = 
        voter.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        voter.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        voter.schoolId.toString().includes(searchTerm) ||
        voter.email?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesDegree = selectedDegree === "" || voter.degreeId?._id === selectedDegree
      
      return matchesSearch && matchesDegree
    })
  }

  const getDegreeCountForTab = (stats, degreeId) => {
    const currentVoters = getCurrentVoters()
    return currentVoters.filter(voter => voter.degreeId?._id === degreeId).length
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto"></div>
          <p className="mt-6 text-lg text-gray-600 font-medium">Loading voters data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header - Same as Dashboard */}
      <div className="bg-white/90 backdrop-blur-sm shadow-sm border-b border-indigo-100">
        <div className="px-6 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Election Committee Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome back, {user?.username}</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push('/ecommittee/dashboard')}
                className="flex items-center px-4 py-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors font-medium"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a3 3 0 106 0v4H8V5z" />
                </svg>
                Dashboard
              </button>
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
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <span className="block sm:inline">{error}</span>
            <button 
              onClick={() => setError("")}
              className="absolute top-0 bottom-0 right-0 px-4 py-3"
            >
              <span className="sr-only">Close</span>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Navigation */}
        {/* <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/ecommittee/dashboard')}
              className="flex items-center px-4 py-2 text-sm text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a3 3 0 106 0v4H8V5z" />
              </svg>
              Dashboard
            </button>
            <span className="text-gray-300">|</span>
            <span className="text-gray-600 font-medium">Voter Management</span>
          </div>
        </div> */}

        {/* Tabs */}
        <div className="mb-6 flex justify-center">
          <div className="flex space-x-1 bg-white/50 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab("voters")}
              className={`px-4 sm:px-6 py-3 rounded-md transition-colors text-sm sm:text-base ${
                activeTab === "voters" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-600 hover:text-gray-800"
              }`}
            >
              All Voters ({allVoters.length})
            </button>
            <button
              onClick={() => setActiveTab("registered")}
              className={`px-4 sm:px-6 py-3 rounded-md transition-colors text-sm sm:text-base ${
                activeTab === "registered" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Registered ({registeredVoters.length})
            </button>
            <button
              onClick={() => setActiveTab("officers")}
              className={`px-4 sm:px-6 py-3 rounded-md transition-colors text-sm sm:text-base ${
                activeTab === "officers" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Officers ({officers.length})
            </button>
          </div>
        </div>

        {/* Degree Filter Cards - Inline Layout */}
        <div className="mb-8">

          <div className="flex flex-wrap justify-center gap-4 max-w-6xl mx-auto">
            {Object.entries(degreeStats).map(([key, stats]) => (
              <button
                key={key}
                onClick={() => handleDegreeCardClick(stats.degreeInfo.id)}
                className={`${getDegreeCardColors(stats.degreeInfo.code, selectedDegree === stats.degreeInfo.id)} 
                  rounded-xl p-6 text-center transition-all duration-200 transform hover:scale-105 w-[200px] h-[140px] flex-shrink-0 flex flex-col justify-between`}
              >
                <div className="font-bold text-2xl mb-2">
                  {stats.degreeInfo.code}
                </div>
                <div className="text-4xl font-bold mb-3">
                  {getDegreeCountForTab(stats, stats.degreeInfo.id)}
                </div>
                <div className="text-sm font-medium leading-tight flex-grow flex items-end justify-center">
                  {stats.degreeInfo.name}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search voters by name, school ID, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white/80"
            />
            <svg
              className="absolute left-3 top-3.5 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          
          {selectedDegree && (
            <button
              onClick={() => setSelectedDegree("")}
              className="px-4 py-3 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors flex items-center justify-center whitespace-nowrap"
            >
              Clear Filter
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Voters Table */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-indigo-600 text-white">
                <tr>
                  <th className="px-3 sm:px-6 py-4 text-left text-xs sm:text-sm font-medium uppercase tracking-wider">School ID</th>
                  <th className="px-3 sm:px-6 py-4 text-left text-xs sm:text-sm font-medium uppercase tracking-wider">Name</th>
                  <th className="px-3 sm:px-6 py-4 text-left text-xs sm:text-sm font-medium uppercase tracking-wider">Email</th>
                  <th className="px-3 sm:px-6 py-4 text-left text-xs sm:text-sm font-medium uppercase tracking-wider">Degree</th>
                  <th className="px-3 sm:px-6 py-4 text-left text-xs sm:text-sm font-medium uppercase tracking-wider">Department</th>
                  <th className="px-3 sm:px-6 py-4 text-left text-xs sm:text-sm font-medium uppercase tracking-wider">Status</th>
                  <th className="px-3 sm:px-6 py-4 text-left text-xs sm:text-sm font-medium uppercase tracking-wider">
                    {activeTab === "officers" ? "Actions" : "Officer"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {getFilteredVoters().map((voter) => (
                  <tr key={voter._id} className="hover:bg-indigo-50/50">
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                      {voter.schoolId}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                      <div className="max-w-[150px] truncate">
                        {voter.firstName} {voter.middleName ? `${voter.middleName} ` : ""}{voter.lastName}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                      <div className="max-w-[200px] truncate">
                        {voter.email || "N/A"}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                      <div className="max-w-[120px] truncate">
                        {voter.degreeId?.degreeCode || "N/A"}
                        {voter.degreeId?.major && (
                          <div className="text-xs text-gray-500">
                            {voter.degreeId.major}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                      <div className="max-w-[120px] truncate">
                        {voter.degreeId?.department || "N/A"}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        {voter.isRegistered ? (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Registered
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Not Registered
                          </span>
                        )}
                        {!voter.isActive && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Inactive
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      {activeTab === "officers" ? (
                        <button
                          onClick={() => handleToggleOfficer(voter._id)}
                          disabled={toggleLoading[voter._id]}
                          className="px-2 sm:px-3 py-1 rounded-full text-xs font-medium transition-colors bg-red-100 text-red-800 hover:bg-red-200"
                        >
                          {toggleLoading[voter._id] ? (
                            <div className="flex items-center">
                              <div className="animate-spin rounded-full h-3 w-3 border-b border-current mr-1"></div>
                              Removing...
                            </div>
                          ) : (
                            "Remove"
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleOfficer(voter._id)}
                          disabled={toggleLoading[voter._id]}
                          className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            voter.isClassOfficer
                              ? "bg-indigo-100 text-indigo-800 hover:bg-indigo-200"
                              : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                          } ${toggleLoading[voter._id] ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          {toggleLoading[voter._id] ? (
                            <div className="flex items-center">
                              <div className="animate-spin rounded-full h-3 w-3 border-b border-current mr-1"></div>
                              Loading...
                            </div>
                          ) : voter.isClassOfficer ? (
                            "Remove"
                          ) : (
                            "Make Officer"
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {getFilteredVoters().length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No voters found matching your criteria.</p>
              </div>
            )}
          </div>
        </div>

        {/* Summary Footer */}
        <div className="mt-6 text-center text-sm text-gray-600">
          Showing {getFilteredVoters().length} of {getCurrentVoters().length} {activeTab} 
          {selectedDegree && " (filtered by degree)"}
        </div>
      </div>
    </div>
  )
}