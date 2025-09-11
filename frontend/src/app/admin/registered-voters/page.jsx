"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, Search, Edit, UserX, Users, Loader2, Eye, EyeOff } from "lucide-react"
import Swal from 'sweetalert2'
import { votersAPI } from '@/lib/api/voters'
import { departmentsAPI } from '@/lib/api/departments'

export default function RegisteredVotersPage() {
  const [voters, setVoters] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [editingVoter, setEditingVoter] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDepartment, setSelectedDepartment] = useState("")
  const [departmentStats, setDepartmentStats] = useState({})
  const [showPasswords, setShowPasswords] = useState({}) // Track password visibility for each voter
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalVoters: 0,
    limit: 20
  })

  // SweetAlert functions
  const showAlert = (type, title, text) => {
    Swal.fire({
      icon: type,
      title: title,
      text: text,
      confirmButtonColor: "#10B981",
    })
  }

  const showConfirm = (title, text, confirmText = "Yes, deactivate!") => {
    return Swal.fire({
      title: title,
      text: text,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#6B7280",
      confirmButtonText: confirmText,
    }).then((result) => result.isConfirmed)
  }

  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([fetchRegisteredVoters(), fetchDepartments()])
    }
    loadInitialData()

    // Load SweetAlert2 CDN
    if (typeof window !== "undefined" && !window.Swal) {
      const script = document.createElement("script")
      script.src = "https://cdn.jsdelivr.net/npm/sweetalert2@11"
      document.head.appendChild(script)
    }
  }, [])

  // Separate useEffect for pagination changes
  useEffect(() => {
    if (departments.length > 0) {
      fetchRegisteredVoters()
    }
  }, [pagination.currentPage, searchTerm, selectedDepartment])

  useEffect(() => {
    calculateDepartmentStats()
  }, [voters, departments])

  const fetchRegisteredVoters = async () => {
    try {
      setLoading(true)
      setError("")
      
      const params = {
        page: pagination.currentPage,
        limit: pagination.limit,
        ...(selectedDepartment && { departmentId: selectedDepartment }),
        ...(searchTerm && { search: searchTerm })
      }
      
      console.log("Fetching registered voters with params:", params)
      const data = await votersAPI.getRegistered(params)
      console.log("Raw registered voters API response:", data)
      
      // Handle different possible response formats
      let votersArray = []
      let totalCount = 0
      let totalPages = 1
      let currentPage = 1
      
      if (data) {
        // Handle paginated response
        if (data.voters && Array.isArray(data.voters)) {
          votersArray = data.voters
          totalCount = data.total || data.voters.length
          totalPages = data.totalPages || 1
          currentPage = data.currentPage || 1
        }
        // Handle direct array response
        else if (Array.isArray(data)) {
          votersArray = data
          totalCount = data.length
          totalPages = Math.ceil(totalCount / pagination.limit)
          currentPage = pagination.currentPage
        }
        // Handle nested data response
        else if (data.data && Array.isArray(data.data)) {
          votersArray = data.data
          totalCount = data.total || data.data.length
          totalPages = data.totalPages || 1
          currentPage = data.currentPage || 1
        }
        // Handle success wrapper response
        else if (data.success && data.data) {
          if (Array.isArray(data.data)) {
            votersArray = data.data
            totalCount = data.total || data.data.length
          } else if (data.data.voters && Array.isArray(data.data.voters)) {
            votersArray = data.data.voters
            totalCount = data.data.total || data.data.voters.length
            totalPages = data.data.totalPages || 1
            currentPage = data.data.currentPage || 1
          }
        }
      }
      
      console.log("Processed registered voters array:", votersArray)
      console.log("Total count:", totalCount)
      
      setVoters(votersArray)
      setPagination(prev => ({
        ...prev,
        totalPages: totalPages,
        totalVoters: totalCount,
        currentPage: currentPage
      }))
      
    } catch (error) {
      console.error("Fetch registered voters error:", error)
      setError(`Failed to fetch registered voters: ${error.message || 'Unknown error'}`)
      setVoters([])
    } finally {
      setLoading(false)
    }
  }

  const fetchDepartments = async () => {
    try {
      console.log("Fetching departments...")
      const data = await departmentsAPI.getAll()
      console.log("Raw departments API response:", data)
      
      // Handle different possible response formats
      let departmentsArray = []
      
      if (data) {
        if (Array.isArray(data)) {
          departmentsArray = data
        } else if (data.departments && Array.isArray(data.departments)) {
          departmentsArray = data.departments
        } else if (data.data && Array.isArray(data.data)) {
          departmentsArray = data.data
        } else if (data.success && data.data) {
          if (Array.isArray(data.data)) {
            departmentsArray = data.data
          } else if (data.data.departments && Array.isArray(data.data.departments)) {
            departmentsArray = data.data.departments
          }
        }
      }
      
      console.log("Processed departments array:", departmentsArray)
      setDepartments(departmentsArray)
      
    } catch (error) {
      console.error("Fetch departments error:", error)
      setDepartments([])
    }
  }

  const calculateDepartmentStats = () => {
    if (!Array.isArray(departments) || departments.length === 0) {
      console.log("Cannot calculate stats - missing departments:", { 
        departmentsCount: departments.length 
      })
      setDepartmentStats({})
      return
    }

    console.log("Calculating department stats with:", { voters: voters.length, departments: departments.length })

    const stats = {}
    
    // Initialize stats for ALL departments (even those with 0 voters)
    departments.forEach(dept => {
      stats[dept._id] = {
        count: 0,
        departmentCode: dept.departmentCode || 'N/A',
        departmentName: dept.departmentName || dept.degreeProgram || 'Unknown Department',
        college: dept.college || ''
      }
    })

    // Count voters by department (only if voters array exists and has data)
    if (Array.isArray(voters) && voters.length > 0) {
      voters.forEach(voter => {
        if (voter.departmentId) {
          // Handle both string ID and populated object
          const deptId = typeof voter.departmentId === 'string' 
            ? voter.departmentId 
            : voter.departmentId._id
          
          if (stats[deptId]) {
            stats[deptId].count++
          } else {
            // If department not in our list, create entry
            const deptInfo = typeof voter.departmentId === 'object' 
              ? voter.departmentId 
              : null
            
            if (deptInfo) {
              stats[deptId] = {
                count: 1,
                departmentCode: deptInfo.departmentCode || 'N/A',
                departmentName: deptInfo.departmentName || deptInfo.degreeProgram || 'Unknown',
                college: deptInfo.college || ''
              }
            }
          }
        }
      })
    }

    console.log("Calculated department stats:", stats)
    setDepartmentStats(stats)
  }

  const handleDepartmentCardClick = (departmentId) => {
    setSelectedDepartment(selectedDepartment === departmentId ? "" : departmentId)
    setPagination(prev => ({ ...prev, currentPage: 1 }))
  }

  const handleBackToAll = () => {
    setSelectedDepartment("")
    setSearchTerm("")
    setPagination(prev => ({ ...prev, currentPage: 1 }))
  }

  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
    setPagination(prev => ({ ...prev, currentPage: 1 }))
  }

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, currentPage: newPage }))
  }

  const handleEdit = (voter) => {
    setEditingVoter(voter)
    setShowEditModal(true)
  }

  const handleDeactivate = async (voterId) => {
    const confirmed = await showConfirm(
      "Are you sure?", 
      "This voter will be deactivated and won't be able to vote.", 
      "Yes, deactivate!"
    )
    
    if (!confirmed) return

    try {
      await votersAPI.deactivate(voterId)
      await fetchRegisteredVoters() // Refresh the list
      showAlert("success", "Deactivated!", "Voter has been deactivated successfully")
    } catch (error) {
      console.error("Deactivate voter error:", error)
      showAlert("error", "Error!", error.message || "Failed to deactivate voter")
    }
  }

  const togglePasswordVisibility = (voterId) => {
    setShowPasswords(prev => ({
      ...prev,
      [voterId]: !prev[voterId]
    }))
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  const isPasswordExpired = (expiresAt) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  const isPasswordExpiringSoon = (expiresAt) => {
    if (!expiresAt) return false
    const expiryDate = new Date(expiresAt)
    const now = new Date()
    const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24))
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0
  }

  const getDepartmentCardColor = (index, hasVoters) => {
    const colors = [
      "bg-green-100 text-green-800 border-green-200 hover:bg-green-200",
      "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200",
      "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200",
      "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200",
      "bg-pink-100 text-pink-800 border-pink-200 hover:bg-pink-200",
      "bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200",
      "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200",
      "bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-200"
    ]
    
    // If department has no voters, make it more muted
    if (!hasVoters) {
      return "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
    }
    
    return colors[index % colors.length]
  }

  // Show all departments sorted by voter count (departments with voters first, then alphabetically)
  const allDepartmentsSorted = Object.entries(departmentStats)
    .sort((a, b) => {
      // First sort by voter count (descending)
      if (b[1].count !== a[1].count) {
        return b[1].count - a[1].count
      }
      // Then sort alphabetically by department code
      return a[1].departmentCode.localeCompare(b[1].departmentCode)
    })

  console.log("Current state:", {
    loading,
    error,
    votersCount: voters.length,
    departmentsCount: departments.length,
    departmentStatsCount: Object.keys(departmentStats).length,
    allDepartmentsSortedCount: allDepartmentsSorted.length
  })

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading registered voters...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto">
          <p className="text-red-600 font-medium">Error Loading Data</p>
          <p className="text-red-500 text-sm mt-1">{error}</p>
          <button 
            onClick={() => {
              setError("")
              setLoading(true)
              fetchRegisteredVoters()
            }}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      {selectedDepartment && (
        <div className="flex items-center">
          <button
            onClick={handleBackToAll}
            className="flex items-center px-4 py-2 text-sm text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to All Registered Voters
          </button>
        </div>
      )}

      {/* Department Cards - Now shows ALL departments */}
      {allDepartmentsSorted.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {allDepartmentsSorted.map(([departmentId, stats], index) => {
            const hasVoters = stats.count > 0
            return (
              <div
                key={departmentId}
                onClick={() => handleDepartmentCardClick(departmentId)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                  selectedDepartment === departmentId
                    ? getDepartmentCardColor(index, hasVoters) + " ring-2 ring-offset-2 ring-green-500"
                    : getDepartmentCardColor(index, hasVoters) + " hover:scale-105"
                }`}
              >
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Users className="w-5 h-5 mr-1" />
                    <h3 className="text-lg font-bold">{stats.departmentCode}</h3>
                  </div>
                  <p className={`text-2xl font-bold ${hasVoters ? '' : 'text-gray-400'}`}>
                    {stats.count}
                  </p>
                  <p className="text-xs opacity-75 mt-1 line-clamp-2">
                    {stats.departmentName}
                  </p>
                  {stats.college && (
                    <p className="text-xs opacity-60 mt-1">{stats.college}</p>
                  )}
                  {!hasVoters && (
                    <p className="text-xs text-gray-400 mt-1 italic">No registered voters</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Summary Stats
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-gray-600">Total Departments</p>
            <p className="text-2xl font-bold text-blue-600">{departments.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Departments with Registered Voters</p>
            <p className="text-2xl font-bold text-green-600">
              {allDepartmentsSorted.filter(([_, stats]) => stats.count > 0).length}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Registered Voters</p>
            <p className="text-2xl font-bold text-purple-600">{pagination.totalVoters}</p>
          </div>
        </div>
      </div> */}

      {/* Main Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <input
                type="text"
                placeholder="Search registered voters by ID, name, department, or email..."
                value={searchTerm}
                onChange={handleSearch}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">
              {selectedDepartment ? 'Filtered' : 'Total'} Registered Voters
            </p>
            <p className="text-2xl font-bold text-green-600">{pagination.totalVoters}</p>
            {selectedDepartment && (
              <p className="text-xs text-gray-500">
                Showing: {departmentStats[selectedDepartment]?.departmentCode}
              </p>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Voter ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  School ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Full Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Year Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Password
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Password Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {voters.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-6 py-12 text-center text-gray-500">
                    <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-lg font-medium">
                      {selectedDepartment ? "No registered voters found in this department" : "No registered voters found"}
                    </p>
                    <p className="text-sm">
                      {selectedDepartment 
                        ? "This department doesn't have any registered voters yet." 
                        : "Try adjusting your search criteria."
                      }
                    </p>
                  </td>
                </tr>
              ) : (
                voters.map((voter) => (
                  <tr key={voter._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                        {voter._id.slice(-6).toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{voter.schoolId || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {`${voter.firstName || ''} ${voter.middleName || ''} ${voter.lastName || ''}`.trim() || 'N/A'}
                      </div>
                      {voter.birthdate && (
                        <div className="text-xs text-gray-500">
                          Born: {formatDate(voter.birthdate)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {voter.email || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {voter.departmentId?.departmentCode || "N/A"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {voter.departmentId?.college || ""}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                      {voter.yearLevel || 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-mono text-gray-900">
                          {showPasswords[voter._id] ? (voter.password || '••••••••') : '••••••••'}
                        </span>
                        <button
                          onClick={() => togglePasswordVisibility(voter._id)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showPasswords[voter._id] ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        voter.isOfficer ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                      }`}>
                        {voter.isOfficer ? "Class Officer" : "Student"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs text-gray-600">
                        <div className="mb-1">
                          <span className="font-medium">Created:</span> {formatDateTime(voter.passwordCreatedAt)}
                        </div>
                        <div className="mb-1">
                          <span className="font-medium">Expires:</span>{' '}
                          <span className={`${
                            isPasswordExpired(voter.passwordExpiresAt) 
                              ? 'text-red-600 font-medium' 
                              : isPasswordExpiringSoon(voter.passwordExpiresAt)
                                ? 'text-yellow-600 font-medium'
                                : 'text-gray-600'
                          }`}>
                            {formatDateTime(voter.passwordExpiresAt)}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Status:</span>{' '}
                          <span className={`inline-flex px-1 py-0.5 text-xs rounded ${
                            voter.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {voter.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEdit(voter)}
                        className="text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 px-2 py-1 rounded transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeactivate(voter._id)}
                        className="text-red-600 hover:text-red-900 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage <= 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage >= pagination.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{' '}
                  <span className="font-medium">
                    {(pagination.currentPage - 1) * pagination.limit + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium">
                    {Math.min(pagination.currentPage * pagination.limit, pagination.totalVoters)}
                  </span>{' '}
                  of{' '}
                  <span className="font-medium">{pagination.totalVoters}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={pagination.currentPage <= 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  
                  {/* Page Numbers */}
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    const page = i + Math.max(1, pagination.currentPage - 2)
                    if (page > pagination.totalPages) return null
                    
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === pagination.currentPage
                            ? "z-10 bg-green-50 border-green-500 text-green-600"
                            : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        {page}
                      </button>
                    )
                  })}
                  
                  <button
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={pagination.currentPage >= pagination.totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && editingVoter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Registered Voter Details</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Voter ID</label>
                  <p className="mt-1 text-sm text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded">
                    {editingVoter._id.slice(-6).toUpperCase()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">School ID</label>
                  <p className="mt-1 text-sm text-gray-900">{editingVoter.schoolId}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name</label>
                  <p className="mt-1 text-sm text-gray-900">{editingVoter.firstName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Middle Name</label>
                  <p className="mt-1 text-sm text-gray-900">{editingVoter.middleName || "-"}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                  <p className="mt-1 text-sm text-gray-900">{editingVoter.lastName}</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="mt-1 text-sm text-gray-900">{editingVoter.email}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Department</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {editingVoter.departmentId?.departmentCode || "N/A"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {editingVoter.departmentId?.departmentName || editingVoter.departmentId?.degreeProgram || ""}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Year Level</label>
                  <p className="mt-1 text-sm text-gray-900">{editingVoter.yearLevel}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Birthdate</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {editingVoter.birthdate ? formatDate(editingVoter.birthdate) : "N/A"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Registration Date</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {formatDate(editingVoter.updatedAt || editingVoter.createdAt)}
                  </p>
                </div>
              </div>

              {/* Password Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-md font-medium text-gray-900 mb-3">Password Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Password</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-sm font-mono text-gray-900 bg-white px-2 py-1 rounded border">
                        {showPasswords[editingVoter._id] ? (editingVoter.password || '••••••••') : '••••••••'}
                      </span>
                      <button
                        onClick={() => togglePasswordVisibility(editingVoter._id)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPasswords[editingVoter._id] ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Password Created At</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {formatDateTime(editingVoter.passwordCreatedAt)}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Password Expires At</label>
                    <p className={`mt-1 text-sm ${
                      isPasswordExpired(editingVoter.passwordExpiresAt) 
                        ? 'text-red-600 font-medium' 
                        : isPasswordExpiringSoon(editingVoter.passwordExpiresAt)
                          ? 'text-yellow-600 font-medium'
                          : 'text-gray-900'
                    }`}>
                      {formatDateTime(editingVoter.passwordExpiresAt)}
                    </p>
                    {isPasswordExpired(editingVoter.passwordExpiresAt) && (
                      <p className="text-xs text-red-500 mt-1">Password has expired</p>
                    )}
                    {isPasswordExpiringSoon(editingVoter.passwordExpiresAt) && !isPasswordExpired(editingVoter.passwordExpiresAt) && (
                      <p className="text-xs text-yellow-600 mt-1">Password expires soon</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Account Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full mt-1 ${
                      editingVoter.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {editingVoter.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Roles & Status</label>
                <div className="flex gap-2">
                  <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Registered
                  </span>
                  {editingVoter.isOfficer && (
                    <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      Class Officer
                    </span>
                  )}
                  {!editingVoter.isOfficer && (
                    <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Student
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-6">
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingVoter(null)
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}