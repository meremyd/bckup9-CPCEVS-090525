"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Building2, Users, LogOut, Search, X, Home, Vote, GraduationCap } from "lucide-react"
import { votersAPI } from '@/lib/api/voters'
import { departmentsAPI } from '@/lib/api/departments'
import { getUserFromToken, logout } from '../../../lib/auth'
import BackgroundWrapper from '@/components/BackgroundWrapper'

export default function SAOVotersPage() {
  const [allVoters, setAllVoters] = useState([])
  const [registeredVoters, setRegisteredVoters] = useState([])
  const [officers, setOfficers] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDepartment, setSelectedDepartment] = useState("")
  const [activeTab, setActiveTab] = useState("voters")
  const [user, setUser] = useState(null)
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

        if (userFromToken.userType !== "sao") {
          console.warn("Unauthorized access: User is not a SAO member")
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
      
      // FIXED: Use the correct API calls that fetch only active voters and departments
      const [votersData, registeredData, officersData, departmentsData] = await Promise.all([
        votersAPI.getActive().then(data => {
          console.log("Active voters data:", data)
          return Array.isArray(data) ? data : (data.voters || data.data || [])
        }).catch(error => {
          console.error("Error fetching active voters:", error)
          return []
        }),
        votersAPI.getActiveRegistered().then(data => {
          console.log("Active registered voters data:", data)
          return Array.isArray(data) ? data : (data.voters || data.data || [])
        }).catch(error => {
          console.error("Error fetching active registered voters:", error)
          return []
        }),
        votersAPI.getActiveOfficers().then(data => {
          console.log("Active officers data:", data)
          return Array.isArray(data) ? data : (data.officers || data.data || [])
        }).catch(error => {
          console.error("Error fetching active officers:", error)
          return []
        }),
        // FIXED: Properly fetch departments
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

    // FIXED: Only show active voters (this is now redundant since we're already fetching only active voters)
    return voters.filter(voter => {
      const matchesSearch = 
        voter.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        voter.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        voter.schoolId?.toString().includes(searchTerm) ||
        voter.email?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesDepartment = 
        selectedDepartment === "" || voter.departmentId?._id === selectedDepartment
      
      // Ensure voter is active (extra safety check)
      return matchesSearch && matchesDepartment && voter.isActive !== false
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
    }).filter(dept => dept.count > 0) // Only show departments with active voters
  }

  if (loading) {
    return (
      <BackgroundWrapper>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto"></div>
            <p className="mt-6 text-lg text-white font-medium">Loading active voters data...</p>
          </div>
        </div>
      </BackgroundWrapper>
    )
  }

  return (
    <BackgroundWrapper>
      {/* Header - SAO Dashboard style */}
<div className="bg-[#b0c8fe]/95 backdrop-blur-sm shadow-lg border-b border-[#b0c8fe]/30 px-4 sm:px-6 py-4">
  <div className="flex items-center justify-between">
    <div className="flex items-center">
      <div className="w-8 h-8 bg-gradient-to-br from-[#001f65] to-[#003399] rounded-lg flex items-center justify-center mr-3 shadow-lg">
        <Users className="w-5 h-5 text-white" />
      </div>
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#001f65]">
          SAO Dashboard
        </h1>
        <p className="text-xs text-[#001f65]/70">Active Voter Information</p>
      </div>
    </div>
    <div className="flex items-center space-x-1 sm:space-x-2">
      {/* Navigation Links */}
      <div 
        onClick={() => router.push('/sao/dashboard')}
        className="flex items-center px-2 sm:px-3 py-2 text-xs sm:text-sm text-[#001f65] hover:bg-[#001f65]/10 rounded-lg transition-colors cursor-pointer"
      >
        <Home className="w-4 h-4 mr-1 sm:mr-1.5" />
        <span className="hidden lg:inline">Home</span>
      </div>
      <div 
        onClick={() => router.push('/sao/voters')}
        className="flex items-center px-2 sm:px-3 py-2 text-xs sm:text-sm text-[#001f65] bg-[#001f65]/10 rounded-lg transition-colors cursor-pointer"
      >
        <Users className="w-4 h-4 mr-1 sm:mr-1.5" />
        <span className="hidden lg:inline">Voters</span>
      </div>
      <div 
        onClick={() => router.push('/sao/ssg')}
        className="flex items-center px-2 sm:px-3 py-2 text-xs sm:text-sm text-[#001f65] hover:bg-[#001f65]/10 rounded-lg transition-colors cursor-pointer"
      >
        <Vote className="w-4 h-4 mr-1 sm:mr-1.5" />
        <span className="hidden lg:inline">SSG</span>
      </div>
      <div 
        onClick={() => router.push('/sao/departmental')}
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
              Active Voters ({allVoters.length})
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
              placeholder="Search active voters by name, school ID, or email..."
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
                  <th className="px-3 sm:px-6 py-4 text-left text-xs sm:text-sm font-medium uppercase tracking-wider">Role</th>
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
                      {voter.yearLevel || "N/A"}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        {voter.isRegistered ? (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Registered
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Not Registered
                          </span>
                        )}
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      {voter.isClassOfficer ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-[#001f65]/10 text-[#001f65]">
                          Class Officer
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Student
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {getFilteredVoters().length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No active voters found matching your criteria.</p>
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