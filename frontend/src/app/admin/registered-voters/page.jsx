"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronLeft, Search, Eye, UserX, Users, Loader2, UserMinus } from "lucide-react"
import Swal from 'sweetalert2'
import { votersAPI } from '@/lib/api/voters'
import { departmentsAPI } from '@/lib/api/departments'

export default function RegisteredVotersPage() {
  const [voters, setVoters] = useState([])
  const [allRegisteredVoters, setAllRegisteredVoters] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [viewingVoter, setViewingVoter] = useState(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDepartment, setSelectedDepartment] = useState("")
  const [departmentStats, setDepartmentStats] = useState({})
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalVoters: 0,
    limit: 20
  })

  const showAlert = (type, title, text) => {
    Swal.fire({
      icon: type,
      title: title,
      text: text,
      confirmButtonColor: "#001f65",
    })
  }

  const showConfirm = (title, text, confirmText = "Yes, proceed!") => {
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

  const debounceTimeout = useRef(null)
  useEffect(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current)
    debounceTimeout.current = setTimeout(() => {
      setPagination(prev => ({ ...prev, currentPage: 1 }))
    }, 400)
    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current)
    }
  }, [searchTerm])

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true)
      await Promise.all([fetchDepartments(), fetchAllRegisteredVotersForStats()])
      await fetchRegisteredVoters()
      setLoading(false)
    }
    loadInitialData()
  }, [])

  useEffect(() => {
    if (departments.length > 0) fetchRegisteredVoters()
  }, [pagination.currentPage, selectedDepartment, searchTerm])

  useEffect(() => {
    calculateDepartmentStats()
  }, [allRegisteredVoters, departments])

  const fetchAllRegisteredVotersForStats = async () => {
    try {
      const params = { page: 1, limit: 10000 }
      const data = await votersAPI.getRegistered(params)
      let votersArray = []
      if (data && data.data) {
        votersArray = Array.isArray(data.data) ? data.data : (data.data.voters || [])
      }
      setAllRegisteredVoters(votersArray)
    } catch (error) {
      console.error('Error fetching all registered voters:', error)
    }
  }

  const fetchRegisteredVoters = async () => {
    try {
      setLoading(true)
      setError("")

      const params = {
        page: pagination.currentPage,
        limit: pagination.limit,
        ...(selectedDepartment && { department: selectedDepartment }),
        ...(searchTerm && { search: searchTerm })
      }
      const data = await votersAPI.getRegistered(params)

      let votersArray = []
      let totalCount = 0
      let totalPages = 1
      let currentPage = 1

      if (data && data.data) {
        votersArray = Array.isArray(data.data) ? data.data : (data.data.voters || [])
        totalCount = data.pagination?.totalRecords || votersArray.length
        totalPages = data.pagination?.total || 1
        currentPage = data.pagination?.current || 1
      }

      setVoters(votersArray)
      setPagination(prev => ({
        ...prev,
        totalPages: totalPages,
        totalVoters: totalCount,
        currentPage: currentPage
      }))
    } catch (error) {
      setError(`Failed to fetch registered voters: ${error.message || 'Unknown error'}`)
      setVoters([])
    } finally {
      setLoading(false)
    }
  }

  const fetchDepartments = async () => {
    try {
      const data = await departmentsAPI.getAll()
      let departmentsArray = []
      if (data) {
        if (Array.isArray(data)) {
          departmentsArray = data
        } else if (data.departments && Array.isArray(data.departments)) {
          departmentsArray = data.departments
        } else if (data.data && Array.isArray(data.data)) {
          departmentsArray = data.data
        }
      }
      setDepartments(departmentsArray)
    } catch (error) {
      setDepartments([])
    }
  }

  const calculateDepartmentStats = () => {
    if (!Array.isArray(departments) || departments.length === 0) {
      setDepartmentStats({})
      return
    }
    const stats = {}
    departments.forEach(dept => {
      stats[dept._id] = {
        count: 0,
        departmentCode: dept.departmentCode || 'N/A',
        departmentName: dept.departmentName || dept.degreeProgram || 'Unknown Department',
        college: dept.college || ''
      }
    })
    if (Array.isArray(allRegisteredVoters) && allRegisteredVoters.length > 0) {
      allRegisteredVoters.forEach(voter => {
        if (voter.departmentId) {
          const deptId = typeof voter.departmentId === 'string'
            ? voter.departmentId
            : voter.departmentId._id
          if (stats[deptId]) stats[deptId].count++
        }
      })
    }
    setDepartmentStats(stats)
  }

  const refreshData = async () => {
    await Promise.all([fetchRegisteredVoters(), fetchAllRegisteredVotersForStats()])
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
  }

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, currentPage: newPage }))
  }

  const handleView = (voter) => {
    setViewingVoter(voter)
    setShowViewModal(true)
  }

  const handleDeactivate = async (voterId) => {
    const confirmed = await showConfirm(
      "Deactivate Voter?",
      "This voter will be deactivated and won't be able to vote. They will remain registered but inactive.",
      "Yes, deactivate!"
    )
    if (!confirmed) return
    try {
      setLoading(true)
      await votersAPI.deactivate(voterId)
      await refreshData()
      showAlert("success", "Deactivated!", "Voter has been deactivated successfully")
    } catch (error) {
      showAlert("error", "Error!", error.message || "Failed to deactivate voter")
    } finally {
      setLoading(false)
    }
  }

  const handleUnregister = async (voterId, voterName) => {
    const confirmed = await showConfirm(
      "Unregister Voter?",
      `This will remove ${voterName}'s registration and delete their email. They will need to register again to vote.`,
      "Yes, unregister!"
    )
    if (!confirmed) return
    try {
      setLoading(true)
      await votersAPI.unregister(voterId)
      await refreshData()
      showAlert("success", "Unregistered!", "Voter has been unregistered successfully")
    } catch (error) {
      showAlert("error", "Error!", error.message || "Failed to unregister voter")
    } finally {
      setLoading(false)
    }
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

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }

  const getDepartmentCardColor = (index) => {
    const colors = [
      "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200",
      "bg-green-100 text-green-800 border-green-200 hover:bg-green-200", 
      "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200",
      "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200",
      "bg-pink-100 text-pink-800 border-pink-200 hover:bg-pink-200",
      "bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200",
      "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200",
      "bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-200"
    ]
    return colors[index % colors.length]
  }

  const departmentsWithVoters = Object.entries(departmentStats)
    .filter(([_, stats]) => stats.count > 0)
    .sort((a, b) => b[1].count - a[1].count)

  if (loading && voters.length === 0) {
    return (
      <div className="min-h-screen bg-transparent p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-[#001f65]" />
            <span className="ml-2 text-[#001f65]">Loading registered voters...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-transparent p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50/90 backdrop-blur-sm border border-red-200 rounded-2xl p-4 flex items-start">
            <div>
              <p className="text-red-600 text-sm font-medium">Error Loading Data</p>
              <p className="text-red-500 text-sm mt-1">{error}</p>
              <button
                onClick={() => {
                  setError("")
                  setLoading(true)
                  fetchRegisteredVoters()
                }}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-transparent p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl font-bold text-[#001f65] mb-2">Registered Voters</h1>
              <p className="text-[#001f65]/80">Manage registered and active student voters</p>
            </div>
          </div>
        </div>

        {/* Back Button */}
        {selectedDepartment && (
          <div className="flex items-center">
            <button
              onClick={handleBackToAll}
              className="flex items-center px-4 py-2 text-sm text-[#001f65] hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to All Registered Voters
            </button>
          </div>
        )}

        {/* Department Cards */}
        {departmentsWithVoters.length > 0 && (
          <div className="flex justify-center">
            <div className={`grid gap-4 ${
              departmentsWithVoters.length === 1 ? 'grid-cols-1 max-w-sm' :
              departmentsWithVoters.length === 2 ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl' :
              departmentsWithVoters.length === 3 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl' :
              departmentsWithVoters.length === 4 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl' :
              'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 max-w-7xl'
            }`}>
              {departmentsWithVoters.map(([departmentId, stats], index) => (
                <div
                  key={departmentId}
                  onClick={() => handleDepartmentCardClick(departmentId)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md min-w-[200px] ${
                    selectedDepartment === departmentId
                      ? getDepartmentCardColor(index) + " ring-2 ring-offset-2 ring-[#001f65] scale-105"
                      : getDepartmentCardColor(index) + " hover:scale-105"
                  }`}
                >
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-3">
                      <Users className="w-6 h-6 mr-2" />
                      <h3 className="text-xl font-bold">{stats.departmentCode}</h3>
                    </div>
                    <p className="text-3xl font-bold mb-2">{stats.count}</p>
                    <p className="text-sm opacity-75 mb-2 line-clamp-2 min-h-[2.5rem] flex items-center justify-center">
                      {stats.departmentName}
                    </p>
                    {stats.college && (
                      <p className="text-xs opacity-60 border-t pt-2 mt-2">{stats.college}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Table */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
          {/* Table Header with Search */}
          <div className="p-6 border-b border-gray-200/50 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search registered voters..."
                value={searchTerm}
                onChange={handleSearch}
                onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent w-full lg:w-96"
              />
            </div>
            <div className="text-right">
              <p className="text-sm text-[#001f65]/80">
                {selectedDepartment ? 'Filtered' : 'Total'} Registered Voters
              </p>
              <p className="text-2xl font-bold text-[#001f65]">{pagination.totalVoters}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200/50">
              <thead className="bg-[#b0c8fe]/10">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-[#001f65] uppercase tracking-wider">
                    School ID
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-[#001f65] uppercase tracking-wider">
                    Full Name
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-[#001f65] uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-[#001f65] uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-[#001f65] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-[#001f65] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white/50 divide-y divide-gray-200/50">
                {voters.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-3 sm:px-6 py-12 text-center text-[#001f65]/60">
                      <Users className="mx-auto h-12 w-12 text-[#001f65]/40 mb-4" />
                      <p className="text-lg font-medium">No registered voters found</p>
                    </td>
                  </tr>
                ) : (
                  voters.map((voter) => (
                    <tr key={voter._id} className="hover:bg-[#b0c8fe]/10">
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-[#001f65]">
                        {voter.schoolId || 'N/A'}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-[#001f65]">
                        {`${voter.firstName || ''} ${voter.middleName || ''} ${voter.lastName || ''}`.trim() || 'N/A'}
                      </td>
                      <td className="px-3 sm:px-6 py-4 text-sm text-[#001f65]">
                        <div className="font-medium">{voter.departmentId?.departmentCode || "N/A"}</div>
                        <div className="text-xs text-[#001f65]/60">{voter.departmentId?.college || ""}</div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          voter.isClassOfficer ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                        }`}>
                          {voter.isClassOfficer ? "Class Officer" : "Student"}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          isPasswordExpired(voter.passwordExpiresAt)
                            ? "bg-red-100 text-red-800"
                            : isPasswordExpiringSoon(voter.passwordExpiresAt)
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-green-100 text-green-800"
                        }`}>
                          {isPasswordExpired(voter.passwordExpiresAt)
                            ? "Password Expired"
                            : isPasswordExpiringSoon(voter.passwordExpiresAt)
                              ? "Expiring Soon"
                              : "Active"
                          }
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleView(voter)}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1 transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeactivate(voter._id)}
                            className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1 transition-colors"
                            title="Deactivate Voter"
                          >
                            <UserX className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleUnregister(voter._id, `${voter.firstName} ${voter.lastName}`)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1 transition-colors"
                            title="Unregister Voter"
                          >
                            <UserMinus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-3 border-t border-gray-200/50 flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage <= 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-[#001f65] bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage >= pagination.totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-[#001f65] bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-[#001f65]">
                    Showing <span className="font-medium">{(pagination.currentPage - 1) * pagination.limit + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(pagination.currentPage * pagination.limit, pagination.totalVoters)}</span> of{' '}
                    <span className="font-medium">{pagination.totalVoters}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      disabled={pagination.currentPage <= 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-[#001f65] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      const page = i + Math.max(1, pagination.currentPage - 2)
                      if (page > pagination.totalPages) return null
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            page === pagination.currentPage
                              ? "z-10 bg-[#001f65] border-[#001f65] text-white"
                              : "bg-white border-gray-300 text-[#001f65] hover:bg-gray-50"
                          }`}
                        >
                          {page}
                        </button>
                      )
                    })}
                    <button
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      disabled={pagination.currentPage >= pagination.totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-[#001f65] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* View Modal */}
        {showViewModal && viewingVoter && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/20">
              <div className="flex justify-between items-center p-6 border-b border-gray-200/50">
                <h3 className="text-lg font-semibold text-[#001f65]">Registered Voter Information</h3>
                <button
                  onClick={() => {
                    setShowViewModal(false)
                    setViewingVoter(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-[#001f65]/60 mb-1">School ID</p>
                    <p className="text-sm font-semibold text-[#001f65]">{viewingVoter.schoolId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#001f65]/60 mb-1">Year Level</p>
                    <p className="text-sm font-semibold text-[#001f65]">{viewingVoter.yearLevel || 1}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-[#001f65]/60 mb-1">Full Name</p>
                  <p className="text-sm font-semibold text-[#001f65]">
                    {`${viewingVoter.firstName} ${viewingVoter.middleName || ''} ${viewingVoter.lastName}`.trim()}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-[#001f65]/60 mb-1">Sex</p>
                    <p className="text-sm font-semibold text-[#001f65]">{viewingVoter.sex || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#001f65]/60 mb-1">Role</p>
                    <p className="text-sm font-semibold text-[#001f65]">
                      {viewingVoter.isClassOfficer ? 'Class Officer' : 'Student'}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-[#001f65]/60 mb-1">Email</p>
                  <p className="text-sm font-semibold text-[#001f65]">{viewingVoter.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-[#001f65]/60 mb-1">Department</p>
                  <p className="text-sm font-semibold text-[#001f65]">
                    {viewingVoter.departmentId?.departmentCode} - {viewingVoter.departmentId?.degreeProgram}
                  </p>
                  <p className="text-xs text-[#001f65]/60">{viewingVoter.departmentId?.college}</p>
                </div>
                <div className="border-t pt-4">
                  <p className="text-xs text-[#001f65]/60 mb-3 font-semibold">Password Information</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-[#001f65]/60 mb-1">Created At</p>
                      <p className="text-sm text-[#001f65]">{formatDateTime(viewingVoter.passwordCreatedAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#001f65]/60 mb-1">Expires At</p>
                      <p className={`text-sm ${
                        isPasswordExpired(viewingVoter.passwordExpiresAt)
                          ? 'text-red-600 font-semibold'
                          : isPasswordExpiringSoon(viewingVoter.passwordExpiresAt)
                            ? 'text-yellow-600 font-semibold'
                            : 'text-[#001f65]'
                      }`}>
                        {formatDateTime(viewingVoter.passwordExpiresAt)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-xs text-[#001f65]/60 mb-1">Status</p>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      isPasswordExpired(viewingVoter.passwordExpiresAt)
                        ? "bg-red-100 text-red-800"
                        : isPasswordExpiringSoon(viewingVoter.passwordExpiresAt)
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-green-100 text-green-800"
                    }`}>
                      {isPasswordExpired(viewingVoter.passwordExpiresAt)
                        ? "Password Expired"
                        : isPasswordExpiringSoon(viewingVoter.passwordExpiresAt)
                          ? "Expiring Soon"
                          : "Active"
                      }
                    </span>
                  </div>
                </div>
                {viewingVoter.birthdate && (
                  <div>
                    <p className="text-xs text-[#001f65]/60 mb-1">Birthdate</p>
                    <p className="text-sm font-semibold text-[#001f65]">{formatDate(viewingVoter.birthdate)}</p>
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-gray-200/50 flex justify-end">
                <button
                  onClick={() => {
                    setShowViewModal(false)
                    setViewingVoter(null)
                  }}
                  className="px-4 py-2 bg-[#001f65] text-white rounded-lg hover:bg-[#003399] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}