
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { departmentsAPI } from '@/lib/api/departments'
import Swal from 'sweetalert2'
import { 
  Plus, 
  Edit3, 
  Trash2, 
  X, 
  Loader2, 
  AlertCircle, 
  GraduationCap,
  Search,
  Building2,
  BookOpen,
  Users,
  Database
} from 'lucide-react'

export default function AdminDepartments() {
  const [departments, setDepartments] = useState([])
  const [filteredDepartments, setFilteredDepartments] = useState([])
  const [totalCounts, setTotalCounts] = useState({
    departments: 0,
    colleges: 0,
    degreePrograms: 0,
    departmentCodes: 0
  })
  const [loading, setLoading] = useState(true)
  const [countsLoading, setCountsLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState(null)
  
  // Form fields
  const [departmentCode, setDepartmentCode] = useState('')
  const [college, setCollege] = useState('')
  const [degreeProgram, setDegreeProgram] = useState('')
  
  const router = useRouter()

  useEffect(() => {
    fetchDepartments()
    fetchTotalCounts()
  }, [])

  useEffect(() => {
    // Filter departments based on search query
    if (searchQuery.trim() === '') {
      setFilteredDepartments(departments)
    } else {
      const filtered = departments.filter(department =>
        department.departmentCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        department.college?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        department.degreeProgram?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredDepartments(filtered)
    }
  }, [searchQuery, departments])

  const fetchTotalCounts = async () => {
    try {
      setCountsLoading(true)
      const response = await departmentsAPI.getTotalCounts()
      setTotalCounts(response.totals || {
        departments: 0,
        colleges: 0,
        degreePrograms: 0,
        departmentCodes: 0
      })
    } catch (error) {
      console.error('Error fetching total counts:', error)
      // Don't show error for counts as it's not critical
    } finally {
      setCountsLoading(false)
    }
  }

  const fetchDepartments = async () => {
    try {
      setLoading(true)
      setError("")
      const response = await departmentsAPI.getAll()
      
      let departmentsData = []
      if (Array.isArray(response)) {
        departmentsData = response
      } else if (response.data && Array.isArray(response.data)) {
        departmentsData = response.data
      } else if (response.departments && Array.isArray(response.departments)) {
        departmentsData = response.departments
      } else {
        departmentsData = []
      }
      
      setDepartments(departmentsData)
      setFilteredDepartments(departmentsData)
    } catch (error) {
      console.error('Error fetching departments:', error)
      setDepartments([])
      setFilteredDepartments([])
      setError('Failed to fetch departments. Please try again.')
      Swal.fire({
        title: 'Error!',
        text: 'Failed to fetch departments. Please try again.',
        icon: 'error',
        confirmButtonColor: '#001f65'
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setDepartmentCode('')
    setCollege('')
    setDegreeProgram('')
  }

  const handleAddDepartment = () => {
    resetForm()
    setShowAddModal(true)
  }

  const handleEditDepartment = (department) => {
    setSelectedDepartment(department)
    setDepartmentCode(department.departmentCode || '')
    setCollege(department.college || '')
    setDegreeProgram(department.degreeProgram || '')
    setShowEditModal(true)
  }

  const validateForm = () => {
    if (!departmentCode.trim()) {
      Swal.fire({
        title: 'Validation Error!',
        text: 'Department Code is required.',
        icon: 'warning',
        confirmButtonColor: '#001f65'
      })
      return false
    }

    if (!college.trim()) {
      Swal.fire({
        title: 'Validation Error!',
        text: 'College is required.',
        icon: 'warning',
        confirmButtonColor: '#001f65'
      })
      return false
    }

    if (!degreeProgram.trim()) {
      Swal.fire({
        title: 'Validation Error!',
        text: 'Degree Program is required.',
        icon: 'warning',
        confirmButtonColor: '#001f65'
      })
      return false
    }

    return true
  }

  const handleSubmitAdd = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return

    try {
      const submitData = {
        departmentCode: departmentCode.trim().toUpperCase(),
        college: college.trim(),
        degreeProgram: degreeProgram.trim()
      }

      await departmentsAPI.create(submitData)
      
      Swal.fire({
        title: 'Success!',
        text: 'Department created successfully.',
        icon: 'success',
        confirmButtonColor: '#10B981'
      })

      setShowAddModal(false)
      resetForm()
      fetchDepartments()
      fetchTotalCounts() // Refresh counts
    } catch (error) {
      console.error('Error creating department:', error)
      const errorMessage = error.response?.data?.message || 'Failed to create department. Please try again.'
      
      Swal.fire({
        title: 'Error!',
        text: errorMessage,
        icon: 'error',
        confirmButtonColor: '#EF4444'
      })
    }
  }

  const handleSubmitEdit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return

    try {
      const submitData = {
        departmentCode: departmentCode.trim().toUpperCase(),
        college: college.trim(),
        degreeProgram: degreeProgram.trim()
      }

      await departmentsAPI.update(selectedDepartment._id, submitData)
      
      Swal.fire({
        title: 'Success!',
        text: 'Department updated successfully.',
        icon: 'success',
        confirmButtonColor: '#10B981'
      })

      setShowEditModal(false)
      setSelectedDepartment(null)
      resetForm()
      fetchDepartments()
      fetchTotalCounts() // Refresh counts
    } catch (error) {
      console.error('Error updating department:', error)
      const errorMessage = error.response?.data?.message || 'Failed to update department. Please try again.'
      
      Swal.fire({
        title: 'Error!',
        text: errorMessage,
        icon: 'error',
        confirmButtonColor: '#EF4444'
      })
    }
  }

  const handleDeleteDepartment = async (department) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to delete "${department.departmentCode}"? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    })

    if (result.isConfirmed) {
      try {
        await departmentsAPI.delete(department._id)
        
        Swal.fire({
          title: 'Deleted!',
          text: 'Department has been deleted successfully.',
          icon: 'success',
          confirmButtonColor: '#10B981'
        })
        
        fetchDepartments()
        fetchTotalCounts() // Refresh counts
      } catch (error) {
        console.error('Error deleting department:', error)
        const errorMessage = error.response?.data?.message || 'Failed to delete department. Please try again.'
        
        Swal.fire({
          title: 'Error!',
          text: errorMessage,
          icon: 'error',
          confirmButtonColor: '#EF4444'
        })
      }
    }
  }

  const closeModals = () => {
    setShowAddModal(false)
    setShowEditModal(false)
    setSelectedDepartment(null)
    resetForm()
  }

  return (
    <div className="min-h-screen bg-transparent p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl font-bold text-[#001f65] mb-2">Department Management</h1>
              <p className="text-[#001f65]/80">Manage academic departments and programs</p>
            </div>
          </div>
        </div>

        {/* Statistics Cards - Only 3 cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#001f65]/60">Department</p>
                <p className="text-2xl font-bold text-[#001f65]">
                  {countsLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    totalCounts.departmentCodes
                  )}
                </p>
              </div>
              <div className="p-3 bg-[#b0c8fe]/20 rounded-lg">
                <GraduationCap className="w-6 h-6 text-[#001f65]" />
              </div>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#001f65]/60">Degree Programs</p>
                <p className="text-2xl font-bold text-[#001f65]">
                  {countsLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    totalCounts.degreePrograms
                  )}
                </p>
              </div>
              <div className="p-3 bg-[#b0c8fe]/20 rounded-lg">
                <BookOpen className="w-6 h-6 text-[#001f65]" />
              </div>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#001f65]/60">Colleges</p>
                <p className="text-2xl font-bold text-[#001f65]">
                  {countsLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    totalCounts.colleges
                  )}
                </p>
              </div>
              <div className="p-3 bg-[#b0c8fe]/20 rounded-lg">
                <Building2 className="w-6 h-6 text-[#001f65]" />
              </div>
            </div>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="bg-red-50/90 backdrop-blur-sm border border-red-200 rounded-2xl p-4 flex items-start">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Departments Table */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
          {/* Table Header with Search and Add Button */}
          <div className="p-6 border-b border-gray-200/50">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search departments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent w-full sm:w-64"
                />
              </div>
              <button
                onClick={handleAddDepartment}
                className="w-full sm:w-auto px-4 py-2 bg-[#001f65] hover:bg-[#003399] text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Department
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-[#001f65]" />
              <span className="ml-2 text-[#001f65]">Loading departments...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200/50">
                <thead className="bg-[#b0c8fe]/10">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-[#001f65] uppercase tracking-wider">
                      Code
                    </th>
                    <th className="hidden md:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-[#001f65] uppercase tracking-wider">
                      College
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-[#001f65] uppercase tracking-wider">
                      Degree Program
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-[#001f65] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white/50 divide-y divide-gray-200/50">
                  {filteredDepartments.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-3 sm:px-6 py-8 text-center text-[#001f65]/60">
                        <GraduationCap className="mx-auto h-12 w-12 text-[#001f65]/40 mb-4" />
                        {searchQuery ? (
                          <>
                            No departments found matching "{searchQuery}".
                            <button
                              onClick={() => setSearchQuery('')}
                              className="block mx-auto mt-2 text-[#001f65] hover:underline"
                            >
                              Clear search
                            </button>
                          </>
                        ) : (
                          'No departments available. Click "Add Department" to create your first department.'
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredDepartments.map((department) => (
                      <tr key={department._id} className="hover:bg-[#b0c8fe]/10">
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-[#001f65]">
                          {department.departmentCode}
                        </td>
                        <td className="hidden md:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-[#001f65]">
                          {department.college}
                        </td>
                        <td className="px-3 sm:px-6 py-4 text-sm text-[#001f65]">
                          <div className="md:hidden text-xs text-[#001f65]/60 mb-1">
                            {department.college}
                          </div>
                          {department.degreeProgram || '-'}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
                            <button
                              onClick={() => handleEditDepartment(department)}
                              className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 flex items-center justify-center gap-1 transition-colors"
                            >
                              <Edit3 className="h-3 w-3" />
                              <span className="hidden sm:inline">Edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteDepartment(department)}
                              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500 flex items-center justify-center gap-1 transition-colors"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span className="hidden sm:inline">Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Department Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-white/20">
            <div className="flex justify-between items-center p-6 border-b border-gray-200/50">
              <h3 className="text-lg font-semibold text-[#001f65]">Add New Department</h3>
              <button
                onClick={closeModals}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleSubmitAdd} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#001f65] mb-1">
                    Department Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={departmentCode}
                    onChange={(e) => setDepartmentCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001f65] focus:border-transparent"
                    placeholder="e.g., COCS, EDUC"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#001f65] mb-1">
                    College <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001f65] focus:border-transparent"
                    placeholder="e.g., College of Engineering, College of Education"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#001f65] mb-1">
                    Degree Program <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={degreeProgram}
                    onChange={(e) => setDegreeProgram(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001f65] focus:border-transparent"
                    placeholder="e.g., Bachelor of Science in Computer Science"
                    required
                  />
                </div>

                <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModals}
                    className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-4 py-2 bg-[#001f65] text-white rounded-lg hover:bg-[#003399] focus:outline-none focus:ring-2 focus:ring-[#001f65] transition-colors"
                  >
                    Add Department
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Department Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-white/20">
            <div className="flex justify-between items-center p-6 border-b border-gray-200/50">
              <h3 className="text-lg font-semibold text-[#001f65]">Edit Department</h3>
              <button
                onClick={closeModals}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleSubmitEdit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#001f65] mb-1">
                    Department Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={departmentCode}
                    onChange={(e) => setDepartmentCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001f65] focus:border-transparent"
                    placeholder="e.g., COCS, EDUC"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#001f65] mb-1">
                    College <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001f65] focus:border-transparent"
                    placeholder="e.g., College of Engineering, College of Education"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#001f65] mb-1">
                    Degree Program <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={degreeProgram}
                    onChange={(e) => setDegreeProgram(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001f65] focus:border-transparent"
                    placeholder="e.g., Bachelor of Science in Computer Science"
                    required
                  />
                </div>

                <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModals}
                    className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-4 py-2 bg-[#001f65] text-white rounded-lg hover:bg-[#003399] focus:outline-none focus:ring-2 focus:ring-[#001f65] transition-colors"
                  >
                    Update Department
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}