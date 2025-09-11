'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { departmentsAPI } from '@/lib/api/departments'
import Swal from 'sweetalert2'
import { Plus, Edit3, Trash2, X, Loader2, AlertCircle, GraduationCap } from 'lucide-react'

export default function AdminDepartments() {
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [user, setUser] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState(null)
  
  // Simplified form fields (removed departmentName)
  const [departmentCode, setDepartmentCode] = useState('')
  const [college, setCollege] = useState('')
  const [degreeProgram, setDegreeProgram] = useState('')
  
  const router = useRouter()

  useEffect(() => {
    fetchDepartments()
  }, [])

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
    } catch (error) {
      console.error('Error fetching departments:', error)
      setDepartments([])
      setError('Failed to fetch departments. Please try again.')
      Swal.fire({
        title: 'Error!',
        text: 'Failed to fetch departments. Please try again.',
        icon: 'error',
        confirmButtonColor: '#3085d6'
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
        confirmButtonColor: '#3085d6'
      })
      return false
    }

    if (!college.trim()) {
      Swal.fire({
        title: 'Validation Error!',
        text: 'College is required.',
        icon: 'warning',
        confirmButtonColor: '#3085d6'
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
        degreeProgram: degreeProgram.trim() || null
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
        degreeProgram: degreeProgram.trim() || null
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
    <div className="p-4 sm:p-6">
      {/* Header with add button */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
        <div className="text-sm text-gray-600">
          Total departments: {departments.length}
        </div>
        <button
          onClick={handleAddDepartment}
          className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Department
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-start">
          <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Departments Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading departments...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="hidden md:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    College
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Degree Program
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {departments.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-3 sm:px-6 py-8 text-center text-gray-500">
                      <GraduationCap className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      No departments available. Click "Add Department" to create your first department.
                    </td>
                  </tr>
                ) : (
                  departments.map((department) => (
                    <tr key={department._id} className="hover:bg-gray-50">
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {department.departmentCode}
                      </td>
                      <td className="hidden md:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {department.college}
                      </td>
                      <td className="px-3 sm:px-6 py-4 text-sm text-gray-900">
                        <div className="md:hidden text-xs text-gray-500 mb-1">
                          {department.college}
                        </div>
                        {department.degreeProgram || '-'}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
                          <button
                            onClick={() => handleEditDepartment(department)}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 flex items-center justify-center gap-1"
                          >
                            <Edit3 className="h-3 w-3" />
                            <span className="hidden sm:inline">Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteDepartment(department)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500 flex items-center justify-center gap-1"
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

      {/* Add Department Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Add New Department</h3>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={departmentCode}
                    onChange={(e) => setDepartmentCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., COCS, EDUC"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    College <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., College of Engineering, College of Education"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Degree Program <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={degreeProgram}
                    onChange={(e) => setDegreeProgram(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Bachelor of Science in Computer Science"
                    required
                  />
                </div>

                <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModals}
                    className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Edit Department</h3>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={departmentCode}
                    onChange={(e) => setDepartmentCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., COCS, EDUC"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    College <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., College of Engineering, College of Education"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Degree Program <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={degreeProgram}
                    onChange={(e) => setDegreeProgram(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Bachelor of Science in Computer Science"
                    required
                  />
                </div>

                <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModals}
                    className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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