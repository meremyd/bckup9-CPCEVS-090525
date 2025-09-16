"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, Search, Plus, Edit, Trash2, Users, UserCheck, UserX, Eye, EyeOff } from "lucide-react"
import Swal from 'sweetalert2'
import { votersAPI } from '@/lib/api/voters'
import { departmentsAPI } from '@/lib/api/departments'

export default function VotersPage() {
  const [voters, setVoters] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingVoter, setEditingVoter] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDepartment, setSelectedDepartment] = useState("")
  const [activeTab, setActiveTab] = useState("active") // 'active' or 'inactive'
  const [departmentStats, setDepartmentStats] = useState({})
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalVoters: 0,
    limit: 20
  })

  // SweetAlert function
  const showAlert = (type, title, text) => {
    Swal.fire({
      icon: type,
      title: title,
      text: text,
      confirmButtonColor: "#3B82F6",
    })
  }

  const showConfirm = (title, text, confirmText = "Yes, delete it!") => {
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

  // Form state
  const [formData, setFormData] = useState({
    schoolId: "",
    firstName: "",
    middleName: "",
    lastName: "",
    birthdate: "",
    departmentId: "",
    email: "",
    yearLevel: 1,
  })

  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([fetchVoters(), fetchDepartments()])
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
      fetchVoters()
    }
  }, [pagination.currentPage, searchTerm, selectedDepartment, activeTab])

  useEffect(() => {
    calculateDepartmentStats()
  }, [voters, departments])

  const fetchVoters = async () => {
    try {
      setLoading(true)
      setError("")
      
      const params = {
        page: pagination.currentPage,
        limit: pagination.limit,
        ...(selectedDepartment && { departmentId: selectedDepartment }),
        ...(searchTerm && { search: searchTerm }),
        ...(activeTab === 'inactive' && { isActive: false }),
        ...(activeTab === 'active' && { isActive: true })
      }
      
      console.log("Fetching voters with params:", params)
      const data = await votersAPI.getAll(params)
      console.log("Raw voters API response:", data)
      
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
      
      console.log("Processed voters array:", votersArray)
      console.log("Total count:", totalCount)
      
      setVoters(votersArray)
      setPagination(prev => ({
        ...prev,
        totalPages: totalPages,
        totalVoters: totalCount,
        currentPage: currentPage
      }))
      
    } catch (error) {
      console.error("Fetch voters error:", error)
      setError(`Failed to fetch voters: ${error.message || 'Unknown error'}`)
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
      // Don't show error for departments as it's not critical for basic functionality
    }
  }

  const calculateDepartmentStats = () => {
    if (!Array.isArray(voters) || !Array.isArray(departments) || departments.length === 0) {
      console.log("Cannot calculate stats - missing data:", { 
        votersCount: voters.length, 
        departmentsCount: departments.length 
      })
      setDepartmentStats({})
      return
    }

    console.log("Calculating department stats with:", { voters: voters.length, departments: departments.length })

    const stats = {}
    
    // Initialize stats for all departments
    departments.forEach(dept => {
      stats[dept._id] = {
        count: 0,
        departmentCode: dept.departmentCode || 'N/A',
        departmentName: dept.departmentName || dept.degreeProgram || 'Unknown Department',
        college: dept.college || ''
      }
    })

    // Count voters by department (filter by active tab)
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

    console.log("Calculated department stats:", stats)
    setDepartmentStats(stats)
  }

  const resetForm = () => {
    setFormData({
      schoolId: "",
      firstName: "",
      middleName: "",
      lastName: "",
      birthdate: "",
      departmentId: "",
      email: "",
      yearLevel: 1,
    })
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleAddVoter = async (e) => {
    e.preventDefault()
    try {
      const newVoter = await votersAPI.create(formData)
      setShowAddModal(false)
      resetForm()
      await fetchVoters() // Refresh the list
      showAlert("success", "Success!", "Voter added successfully")
    } catch (error) {
      console.error("Add voter error:", error)
      showAlert("error", "Error!", error.message || "Failed to add voter")
    }
  }

  const handleEditVoter = async (e) => {
    e.preventDefault()
    try {
      await votersAPI.update(editingVoter._id, formData)
      setShowEditModal(false)
      setEditingVoter(null)
      resetForm()
      await fetchVoters() // Refresh the list
      showAlert("success", "Success!", "Voter updated successfully")
    } catch (error) {
      console.error("Update voter error:", error)
      showAlert("error", "Error!", error.message || "Failed to update voter")
    }
  }

  const handleEdit = (voter) => {
    setEditingVoter(voter)
    setFormData({
      schoolId: voter.schoolId || "",
      firstName: voter.firstName || "",
      middleName: voter.middleName || "",
      lastName: voter.lastName || "",
      birthdate: voter.birthdate ? voter.birthdate.split("T")[0] : "",
      departmentId: (voter.departmentId?._id || voter.departmentId) || "",
      email: voter.email || "",
      yearLevel: voter.yearLevel || 1,
    })
    setShowEditModal(true)
  }

  const handleDelete = async (voterId) => {
    const confirmed = await showConfirm(
      "Are you sure?", 
      "You won't be able to revert this!", 
      "Yes, delete it!"
    )
    
    if (!confirmed) return

    try {
      await votersAPI.delete(voterId)
      await fetchVoters() // Refresh the list
      showAlert("success", "Deleted!", "Voter has been deleted successfully")
    } catch (error) {
      console.error("Delete voter error:", error)
      showAlert("error", "Error!", error.message || "Failed to delete voter")
    }
  }

  const handleToggleStatus = async (voterId, currentStatus) => {
    const action = currentStatus ? 'deactivate' : 'activate'
    const confirmed = await showConfirm(
      `${action.charAt(0).toUpperCase() + action.slice(1)} voter?`,
      `This will ${action} the voter.`,
      `Yes, ${action} it!`
    )
    
    if (!confirmed) return

    try {
      if (currentStatus) {
        await votersAPI.deactivate(voterId)
      } else {
        await votersAPI.activate(voterId)
      }
      await fetchVoters() // Refresh the list
      showAlert("success", "Success!", `Voter has been ${action}d successfully`)
    } catch (error) {
      console.error(`${action} voter error:`, error)
      showAlert("error", "Error!", error.message || `Failed to ${action} voter`)
    }
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

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setSelectedDepartment("")
    setSearchTerm("")
    setPagination(prev => ({ ...prev, currentPage: 1 }))
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

  // Filter departments that have voters
  const departmentsWithVoters = Object.entries(departmentStats)
    .filter(([_, stats]) => stats.count > 0)
    .sort((a, b) => b[1].count - a[1].count) // Sort by count descending

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading voters...</p>
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
              fetchVoters()
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
            className="flex items-center px-4 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to All Voters
          </button>
        </div>
      )}

      {/* Status Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => handleTabChange('active')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'active'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <UserCheck className="w-4 h-4 inline mr-2" />
          Active Voters
        </button>
        <button
          onClick={() => handleTabChange('inactive')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'inactive'
              ? 'bg-white text-red-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <UserX className="w-4 h-4 inline mr-2" />
          Inactive Voters
        </button>
      </div>

      {/* Department Cards */}
      {departmentsWithVoters.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {departmentsWithVoters.map(([departmentId, stats], index) => (
            <div
              key={departmentId}
              onClick={() => handleDepartmentCardClick(departmentId)}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                selectedDepartment === departmentId
                  ? getDepartmentCardColor(index) + " ring-2 ring-offset-2 ring-blue-500"
                  : getDepartmentCardColor(index) + " hover:scale-105"
              }`}
            >
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Users className="w-5 h-5 mr-1" />
                  <h3 className="text-lg font-bold">{stats.departmentCode}</h3>
                </div>
                <p className="text-2xl font-bold">{stats.count}</p>
                <p className="text-xs opacity-75 mt-1 line-clamp-2">
                  {stats.departmentName}
                </p>
                {stats.college && (
                  <p className="text-xs opacity-60 mt-1">{stats.college}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <input
                type="text"
                placeholder="Search voters by ID, name, department, or email..."
                value={searchTerm}
                onChange={handleSearch}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>
          <button
            onClick={() => {
              resetForm()
              setShowAddModal(true)
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Voter
          </button>
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
                  Birthdate
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
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {voters.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                    <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-lg font-medium">No voters found</p>
                    <p className="text-sm">Try adjusting your search criteria or add a new voter.</p>
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
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {voter.birthdate ? new Date(voter.birthdate).toLocaleDateString() : 'N/A'}
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
                      <button
                        onClick={() => handleToggleStatus(voter._id, voter.isActive)}
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full transition-colors ${
                          voter.isActive 
                            ? "bg-green-100 text-green-800 hover:bg-green-200" 
                            : "bg-red-100 text-red-800 hover:bg-red-200"
                        }`}
                      >
                        {voter.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEdit(voter)}
                        className="text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 px-2 py-1 rounded transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(voter._id)}
                        className="text-red-600 hover:text-red-900 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
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
                            ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
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

      {/* Add Voter Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Voter</h3>
            <form onSubmit={handleAddVoter} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">School ID *</label>
                  <input
                    type="text"
                    name="schoolId"
                    value={formData.schoolId}
                    onChange={handleInputChange}
                    required
                    maxLength="8"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter school ID"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Year Level *</label>
                  <select
                    name="yearLevel"
                    value={formData.yearLevel}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={1}>1st Year</option>
                    <option value={2}>2nd Year</option>
                    <option value={3}>3rd Year</option>
                    <option value={4}>4th Year</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Email </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter email address"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name *</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Middle Name</label>
                  <input
                    type="text"
                    name="middleName"
                    value={formData.middleName}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Middle name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name *</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Last name"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Birthdate *</label>
                <input
                  type="date"
                  name="birthdate"
                  value={formData.birthdate}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Department *</label>
                <select
                  name="departmentId"
                  value={formData.departmentId}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a department</option>
                  {departments.map((department) => (
                    <option key={department._id} value={department._id}>
                      {department.departmentCode} - {department.departmentName || department.degreeProgram}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    resetForm()
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                >
                  Add Voter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Voter Modal */}
      {showEditModal && editingVoter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Voter</h3>
            <form onSubmit={handleEditVoter} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">School ID *</label>
                  <input
                    type="text"
                    name="schoolId"
                    value={formData.schoolId}
                    onChange={handleInputChange}
                    required
                    maxLength="8"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Year Level *</label>
                  <select
                    name="yearLevel"
                    value={formData.yearLevel}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={1}>1st Year</option>
                    <option value={2}>2nd Year</option>
                    <option value={3}>3rd Year</option>
                    <option value={4}>4th Year</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Email </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name *</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Middle Name</label>
                  <input
                    type="text"
                    name="middleName"
                    value={formData.middleName}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name *</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Birthdate *</label>
                <input
                  type="date"
                  name="birthdate"
                  value={formData.birthdate}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Department *</label>
                <select
                  name="departmentId"
                  value={formData.departmentId}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a department</option>
                  {departments.map((department) => (
                    <option key={department._id} value={department._id}>
                      {department.departmentCode} - {department.departmentName || department.degreeProgram}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingVoter(null)
                    resetForm()
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                >
                  Update Voter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}