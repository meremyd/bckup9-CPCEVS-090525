"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Building2, Users, LogOut, Search, X, Check, Edit2, Home, Vote, GraduationCap } from "lucide-react"
import { votersAPI } from '@/lib/api/voters'
import { departmentsAPI } from '@/lib/api/departments'
import { getUserFromToken, logout } from '../../../lib/auth'
import BackgroundWrapper from '@/components/BackgroundWrapper'

export default function ElectionCommitteeVotersPage() {
  const [allVoters, setAllVoters] = useState([])
  const [registeredVoters, setRegisteredVoters] = useState([])
  const [officers, setOfficers] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDepartment, setSelectedDepartment] = useState("")
  const [activeTab, setActiveTab] = useState("voters")
  const [toggleLoading, setToggleLoading] = useState({})
  const [user, setUser] = useState(null)
  const [editingYearLevel, setEditingYearLevel] = useState({})
  const [yearLevelUpdating, setYearLevelUpdating] = useState({})
  const router = useRouter()

  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      try {
        const token = localStorage.getItem("token")
        if (!token) {
          router.push("/adminlogin")
          return
        }

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
        await fetchAllData()
      } catch (error) {
        console.error("Auth check error:", error)
        setError("Authentication error occurred")
        logout()
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
      setError("")
      
      console.log("Fetching all data...")
      
      // Fetch all data concurrently
      const [votersData, registeredData, officersData, departmentsData] = await Promise.all([
        votersAPI.getActive().then(data => {
          console.log("All voters data:", data)
          return Array.isArray(data) ? data : (data.voters || data.data || [])
        }).catch(error => {
          console.error("Error fetching all voters:", error)
          return []
        }),
        votersAPI.getActiveRegistered().then(data => {
          console.log("Registered voters data:", data)
          return Array.isArray(data) ? data : (data.voters || data.data || [])
        }).catch(error => {
          console.error("Error fetching registered voters:", error)
          return []
        }),
        votersAPI.getActiveOfficers().then(data => {
          console.log("Officers data:", data)
          return Array.isArray(data) ? data : (data.officers || data.data || [])
        }).catch(error => {
          console.error("Error fetching officers:", error)
          return []
        }),
        departmentsAPI.getAll().then(data => {
          console.log("Departments data:", data)
          return Array.isArray(data) ? data : (data.departments || data.data || [])
        }).catch(error => {
          console.error("Error fetching departments:", error)
          return []
        })
      ])

      setAllVoters(votersData || [])
      setRegisteredVoters(registeredData || [])
      setOfficers(officersData || [])
      setDepartments(departmentsData || [])
      
      console.log("Data fetched successfully:", {
        allVoters: votersData?.length || 0,
        registeredVoters: registeredData?.length || 0,
        officers: officersData?.length || 0,
        departments: departmentsData?.length || 0
      })
      
    } catch (error) {
      console.error("Fetch data error:", error)
      if (error.response?.status === 401 || error.response?.status === 403) {
        logout()
        router.push("/adminlogin")
      } else {
        let errorMessage = "Failed to fetch data"
        
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

  const fetchRegisteredVoters = async () => {
    try {
      const data = await votersAPI.getActiveRegistered()
      const votersArray = Array.isArray(data) ? data : (data.voters || data.data || [])
      setRegisteredVoters(votersArray)
    } catch (error) {
      console.error("Fetch registered voters error:", error)
      setRegisteredVoters([])
    }
  }

  const fetchOfficers = async () => {
    try {
      const data = await votersAPI.getActiveOfficers()
      const officersArray = Array.isArray(data) ? data : (data.officers || data.data || [])
      setOfficers(officersArray)
    } catch (error) {
      console.error("Fetch officers error:", error)
      setOfficers([])
    }
  }

  const handleLogout = () => {
    logout()
    router.push("/adminlogin")
  }

  const handleToggleOfficer = async (voterId) => {
    try {
      setToggleLoading(prev => ({ ...prev, [voterId]: true }))
      
      const result = await votersAPI.toggleOfficerStatus(voterId)
      
      // Refresh all relevant data
      await fetchAllData()
      
      // Clear any existing errors
      setError("")
      
    } catch (error) {
      console.error("Toggle officer error:", error)
      setError(error.message || "Failed to update officer status")
      
      // Clear error after 3 seconds
      setTimeout(() => setError(""), 3000)
    } finally {
      setToggleLoading(prev => ({ ...prev, [voterId]: false }))
    }
  }

  const handleYearLevelEdit = (voterId, currentYearLevel) => {
    setEditingYearLevel(prev => ({
      ...prev,
      [voterId]: currentYearLevel || ""
    }))
  }

  const handleYearLevelSave = async (voterId) => {
    const newYearLevel = editingYearLevel[voterId]
    
    if (!newYearLevel || ![1, 2, 3, 4].includes(parseInt(newYearLevel))) {
      setError("Year level must be 1, 2, 3, or 4")
      setTimeout(() => setError(""), 3000)
      return
    }

    try {
      setYearLevelUpdating(prev => ({ ...prev, [voterId]: true }))
      
      await votersAPI.updateYearLevel(voterId, parseInt(newYearLevel))
      
      // Update the voter in all relevant lists
      const updateVoterInList = (voters) => 
        voters.map(voter => 
          voter._id === voterId 
            ? { ...voter, yearLevel: parseInt(newYearLevel) }
            : voter
        )

      setAllVoters(prev => updateVoterInList(prev))
      setRegisteredVoters(prev => updateVoterInList(prev))
      setOfficers(prev => updateVoterInList(prev))
      
      // Clear editing state
      setEditingYearLevel(prev => {
        const newState = { ...prev }
        delete newState[voterId]
        return newState
      })
      
      // Clear any existing errors
      setError("")
      
    } catch (error) {
      console.error("Update year level error:", error)
      setError(error.message || "Failed to update year level")
      
      // Clear error after 3 seconds
      setTimeout(() => setError(""), 3000)
    } finally {
      setYearLevelUpdating(prev => ({ ...prev, [voterId]: false }))
    }
  }

  const handleYearLevelCancel = (voterId) => {
    setEditingYearLevel(prev => {
      const newState = { ...prev }
      delete newState[voterId]
      return newState
    })
  }

  const handleDepartmentCardClick = (departmentId) => {
    setSelectedDepartment(selectedDepartment === departmentId ? "" : departmentId)
  }

  const getCurrentVoters = () => {
    switch (activeTab) {
      case "registered":
        return Array.isArray(registeredVoters) ? registeredVoters : []
      case "officers":
        return Array.isArray(officers) ? officers : []
      default:
        return Array.isArray(allVoters) ? allVoters : []
    }
  }

  const getFilteredVoters = () => {
    const voters = getCurrentVoters()

    if (!Array.isArray(voters)) {
      console.warn("getCurrentVoters did not return an array:", voters)
      return []
    }

    return voters.filter(voter => {
      const matchesSearch = 
        voter.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        voter.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        voter.schoolId?.toString().includes(searchTerm) ||
        voter.email?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesDepartment = 
        selectedDepartment === "" || voter.departmentId?._id === selectedDepartment
      
      return matchesSearch && matchesDepartment
    })
  }

  const getDepartmentCountForTab = (departmentId) => {
    const currentVoters = getCurrentVoters()
    return currentVoters.filter(voter => voter.departmentId?._id === departmentId).length
  }

  // Create department cards from the fetched departments
  const getDepartmentCards = () => {
    if (!departments.length) return []

    return departments.map(department => {
      const count = getDepartmentCountForTab(department._id)
      return {
        id: department._id,
        code: department.departmentCode,
        name: department.degreeProgram || department.departmentName,
        count: count
      }
    }).filter(dept => dept.count > 0) // Only show departments with voters
  }

  const getDepartmentName = (departmentId) => {
    if (!departmentId) return "Unknown"
    
    const department = departments.find(dept => dept._id === departmentId)
    return department ? (department.degreeProgram || department.departmentName) : "Unknown"
  }

  if (loading) {
    return (
      <BackgroundWrapper>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto"></div>
            <p className="mt-6 text-lg text-white font-medium">Loading voters data...</p>
          </div>
        </div>
      </BackgroundWrapper>
    )
  }

  return (
    <BackgroundWrapper>
      {/* Header - Matching the Election Committee Dashboard style */}
<div className="bg-[#b0c8fe]/95 backdrop-blur-sm shadow-lg border-b border-[#b0c8fe]/30 px-4 sm:px-6 py-4">
  <div className="flex items-center justify-between">
    <div className="flex items-center">
      <div className="w-8 h-8 bg-gradient-to-br from-[#001f65] to-[#003399] rounded-lg flex items-center justify-center mr-3 shadow-lg">
        <Users className="w-5 h-5 text-white" />
      </div>
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#001f65]">
          Election Committee Dashboard
        </h1>
        <p className="text-xs text-[#001f65]/70">Voter Management</p>
      </div>
    </div>
    <div className="flex items-center space-x-1 sm:space-x-2">
      {/* Navigation Links */}
      <div 
        onClick={() => router.push('/ecommittee/dashboard')}
        className="flex items-center px-2 sm:px-3 py-2 text-xs sm:text-sm text-[#001f65] hover:bg-[#001f65]/10 rounded-lg transition-colors cursor-pointer"
      >
        <Home className="w-4 h-4 mr-1 sm:mr-1.5" />
        <span className="hidden lg:inline">Home</span>
      </div>
      <div 
        onClick={() => router.push('/ecommittee/voters')}
        className="flex items-center px-2 sm:px-3 py-2 text-xs sm:text-sm text-[#001f65] bg-[#001f65]/10 rounded-lg transition-colors cursor-pointer"
      >
        <Users className="w-4 h-4 mr-1 sm:mr-1.5" />
        <span className="hidden lg:inline">Voters</span>
      </div>
      <div 
        onClick={() => router.push('/ecommittee/ssg')}
        className="flex items-center px-2 sm:px-3 py-2 text-xs sm:text-sm text-[#001f65] hover:bg-[#001f65]/10 rounded-lg transition-colors cursor-pointer"
      >
        <Vote className="w-4 h-4 mr-1 sm:mr-1.5" />
        <span className="hidden lg:inline">SSG</span>
      </div>
      <div 
        onClick={() => router.push('/ecommittee/departmental')}
        className="flex items-center px-2 sm:px-3 py-2 text-xs sm:text-sm text-[#001f65] hover:bg-[#001f65]/10 rounded-lg transition-colors cursor-pointer"
      >
        <GraduationCap className="w-4 h-4 mr-1 sm:mr-1.5" />
        <span className="hidden lg:inline">Departmental</span>
      </div>
      <div className="w-px h-6 bg-[#001f65]/20 mx-1 sm:mx-2"></div>
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

      <div className="container mx-auto px-4 sm:px-6 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-100/90 backdrop-blur-sm border border-red-400 text-red-700 px-4 py-3 rounded-lg relative">
            <span className="block sm:inline">{error}</span>
            <button 
              onClick={() => setError("")}
              className="absolute top-0 bottom-0 right-0 px-4 py-3"
            >
              <span className="sr-only">Close</span>
              <X className="w-6 h-6" />
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 flex justify-center">
          <div className="flex space-x-1 bg-white/50 backdrop-blur-sm p-1 rounded-lg border border-white/20">
            <button
              onClick={() => setActiveTab("voters")}
              className={`px-4 sm:px-6 py-3 rounded-md transition-colors text-sm sm:text-base ${
                activeTab === "voters" ? "bg-white text-[#001f65] shadow-sm" : "text-[#001f65]/70 hover:text-[#001f65]"
              }`}
            >
              All Voters ({allVoters.length})
            </button>
            <button
              onClick={() => setActiveTab("registered")}
              className={`px-4 sm:px-6 py-3 rounded-md transition-colors text-sm sm:text-base ${
                activeTab === "registered" ? "bg-white text-[#001f65] shadow-sm" : "text-[#001f65]/70 hover:text-[#001f65]"
              }`}
            >
              Registered ({registeredVoters.length})
            </button>
            <button
              onClick={() => setActiveTab("officers")}
              className={`px-4 sm:px-6 py-3 rounded-md transition-colors text-sm sm:text-base ${
                activeTab === "officers" ? "bg-white text-[#001f65] shadow-sm" : "text-[#001f65]/70 hover:text-[#001f65]"
              }`}
            >
              Officers ({officers.length})
            </button>
          </div>
        </div>

        {/* Department Filter Cards */}
        <div className="mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {/* All Departments Card */}
            <div
              onClick={() => handleDepartmentCardClick("")}
              className={`p-4 rounded-lg cursor-pointer transition-all duration-200 border-2 ${
                selectedDepartment === ""
                  ? "bg-[#001f65] text-white border-[#001f65] shadow-lg"
                  : "bg-white/80 backdrop-blur-sm text-[#001f65] border-white/40 hover:border-[#001f65]/30 hover:bg-white/90"
              }`}
            >
              <div className="text-center">
                <div className="text-2xl font-bold mb-1">
                  {getCurrentVoters().length}
                </div>
                <div className="text-sm font-medium">
                  All Departments
                </div>
              </div>
            </div>
            
            {/* Department Cards */}
            {getDepartmentCards().map((dept) => (
              <div
                key={dept.id}
                onClick={() => handleDepartmentCardClick(dept.id)}
                className={`p-4 rounded-lg cursor-pointer transition-all duration-200 border-2 ${
                  selectedDepartment === dept.id
                    ? "bg-[#001f65] text-white border-[#001f65] shadow-lg"
                    : "bg-white/80 backdrop-blur-sm text-[#001f65] border-white/40 hover:border-[#001f65]/30 hover:bg-white/90"
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl font-bold mb-1">
                    {dept.count}
                  </div>
                  <div className="text-sm font-medium mb-1">
                    {dept.code}
                  </div>
                  <div className="text-xs opacity-80 line-clamp-2">
                    {dept.name}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-4 flex justify-start">
          <div className="relative w-full max-w-md">
            <input
              type="text"
              placeholder="Search voters by name, school ID, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001f65] focus:border-[#001f65] bg-white/80 backdrop-blur-sm"
            />
            <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
          </div>
          
          {(searchTerm || selectedDepartment) && (
            <button
              onClick={() => {
                setSearchTerm("")
                setSelectedDepartment("")
              }}
              className="ml-3 px-4 py-3 bg-[#001f65]/10 text-[#001f65] rounded-lg hover:bg-[#001f65]/20 transition-colors flex items-center justify-center whitespace-nowrap backdrop-blur-sm border border-[#001f65]/20"
            >
              Clear Filters
              <X className="w-4 h-4 ml-2" />
            </button>
          )}
        </div>

        {/* Voters Table */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden border border-white/20">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-[#001f65] text-white">
                <tr>
                  <th className="px-3 sm:px-6 py-4 text-left text-xs sm:text-sm font-medium uppercase tracking-wider">School ID</th>
                  <th className="px-3 sm:px-6 py-4 text-left text-xs sm:text-sm font-medium uppercase tracking-wider">Name</th>
                  <th className="px-3 sm:px-6 py-4 text-left text-xs sm:text-sm font-medium uppercase tracking-wider">Sex</th>
                  <th className="px-3 sm:px-6 py-4 text-left text-xs sm:text-sm font-medium uppercase tracking-wider">Email</th>
                  <th className="px-3 sm:px-6 py-4 text-left text-xs sm:text-sm font-medium uppercase tracking-wider">Department</th>
                  <th className="px-3 sm:px-6 py-4 text-left text-xs sm:text-sm font-medium uppercase tracking-wider">Year Level</th>
                  <th className="px-3 sm:px-6 py-4 text-left text-xs sm:text-sm font-medium uppercase tracking-wider">Status</th>
                  <th className="px-3 sm:px-6 py-4 text-left text-xs sm:text-sm font-medium uppercase tracking-wider">
                    {activeTab === "officers" ? "Actions" : "Officer"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {getFilteredVoters().map((voter) => (
                  <tr key={voter._id} className="hover:bg-[#001f65]/5">
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                      {voter.schoolId}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                      <div className="max-w-[150px] truncate">
                        {voter.firstName} {voter.middleName ? `${voter.middleName} ` : ""}{voter.lastName}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                      {voter.sex || '-'}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                      <div className="max-w-[200px] truncate">
                        {voter.email || "N/A"}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                      <div className="max-w-[120px] truncate">
                        {voter.departmentId?.departmentCode || "N/A"}
                        {voter.departmentId?.college && (
                          <div className="text-xs text-gray-500">
                            {voter.departmentId.college}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                      {editingYearLevel[voter._id] !== undefined ? (
                        <div className="flex items-center space-x-2">
                          <select
                            value={editingYearLevel[voter._id]}
                            onChange={(e) => setEditingYearLevel(prev => ({
                              ...prev,
                              [voter._id]: e.target.value
                            }))}
                            className="px-2 py-1 border rounded text-xs focus:outline-none focus:ring-2 focus:ring-[#001f65] focus:border-[#001f65]"
                            disabled={yearLevelUpdating[voter._id]}
                          >
                            <option value="">Select</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                          </select>
                          <button
                            onClick={() => handleYearLevelSave(voter._id)}
                            disabled={yearLevelUpdating[voter._id]}
                            className="p-1 text-green-600 hover:text-green-800 disabled:opacity-50"
                          >
                            {yearLevelUpdating[voter._id] ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b border-current"></div>
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                          </button>
                          <button
                            onClick={() => handleYearLevelCancel(voter._id)}
                            disabled={yearLevelUpdating[voter._id]}
                            className="p-1 text-red-600 hover:text-red-800 disabled:opacity-50"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span>{voter.yearLevel || "N/A"}</span>
                          <button
                            onClick={() => handleYearLevelEdit(voter._id, voter.yearLevel)}
                            className="p-1 text-[#001f65] hover:text-[#001f65]/80"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
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
                          className="px-2 sm:px-3 py-1 rounded-full text-xs font-medium transition-colors bg-red-100 text-red-800 hover:bg-red-200 disabled:opacity-50"
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
                              ? "bg-[#001f65]/10 text-[#001f65] hover:bg-[#001f65]/20"
                              : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
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
                {(searchTerm || selectedDepartment) && (
                  <p className="text-sm mt-2">Try adjusting your search term or clearing filters.</p>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </BackgroundWrapper>
  )
}