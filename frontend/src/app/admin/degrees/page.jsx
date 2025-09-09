'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { degreesAPI } from '@/lib/api/degrees'
import Swal from 'sweetalert2'

export default function AdminDegrees() {
  const [degrees, setDegrees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [user, setUser] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedDegree, setSelectedDegree] = useState(null)
  
  // Simple form fields
  const [degreeCode, setDegreeCode] = useState('')
  const [degreeName, setDegreeName] = useState('')
  const [department, setDepartment] = useState('')
  const [major, setMajor] = useState('')
  
  const router = useRouter()

  useEffect(() => {
    fetchDegrees()
  }, [])

  const fetchDegrees = async () => {
    try {
      setLoading(true)
      setError("")
      const response = await degreesAPI.getAll()
      
      let degreesData = []
      if (Array.isArray(response)) {
        degreesData = response
      } else if (response.data && Array.isArray(response.data)) {
        degreesData = response.data
      } else if (response.degrees && Array.isArray(response.degrees)) {
        degreesData = response.degrees
      } else {
        degreesData = []
      }
      
      setDegrees(degreesData)
    } catch (error) {
      console.error('Error fetching degrees:', error)
      setDegrees([])
      setError('Failed to fetch degrees. Please try again.')
      Swal.fire({
        title: 'Error!',
        text: 'Failed to fetch degrees. Please try again.',
        icon: 'error',
        confirmButtonColor: '#3085d6'
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setDegreeCode('')
    setDegreeName('')
    setDepartment('')
    setMajor('')
  }

  const handleAddDegree = () => {
    resetForm()
    setShowAddModal(true)
  }

  const handleEditDegree = (degree) => {
    setSelectedDegree(degree)
    setDegreeCode(degree.degreeCode || '')
    setDegreeName(degree.degreeName || '')
    setDepartment(degree.department || '')
    setMajor(degree.major || '')
    setShowEditModal(true)
  }

  const validateForm = () => {
    if (!degreeCode.trim()) {
      Swal.fire({
        title: 'Validation Error!',
        text: 'Degree Code is required.',
        icon: 'warning',
        confirmButtonColor: '#3085d6'
      })
      return false
    }

    if (!degreeName.trim()) {
      Swal.fire({
        title: 'Validation Error!',
        text: 'Degree Name is required.',
        icon: 'warning',
        confirmButtonColor: '#3085d6'
      })
      return false
    }

    if (!department.trim()) {
      Swal.fire({
        title: 'Validation Error!',
        text: 'Department is required.',
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
        degreeCode: degreeCode.trim().toUpperCase(),
        degreeName: degreeName.trim(),
        department: department.trim(),
        major: major.trim() || null
      }

      await degreesAPI.create(submitData)
      
      Swal.fire({
        title: 'Success!',
        text: 'Degree created successfully.',
        icon: 'success',
        confirmButtonColor: '#10B981'
      })

      setShowAddModal(false)
      resetForm()
      fetchDegrees()
    } catch (error) {
      console.error('Error creating degree:', error)
      const errorMessage = error.response?.data?.message || 'Failed to create degree. Please try again.'
      
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
        degreeCode: degreeCode.trim().toUpperCase(),
        degreeName: degreeName.trim(),
        department: department.trim(),
        major: major.trim() || null
      }

      await degreesAPI.update(selectedDegree._id, submitData)
      
      Swal.fire({
        title: 'Success!',
        text: 'Degree updated successfully.',
        icon: 'success',
        confirmButtonColor: '#10B981'
      })

      setShowEditModal(false)
      setSelectedDegree(null)
      resetForm()
      fetchDegrees()
    } catch (error) {
      console.error('Error updating degree:', error)
      const errorMessage = error.response?.data?.message || 'Failed to update degree. Please try again.'
      
      Swal.fire({
        title: 'Error!',
        text: errorMessage,
        icon: 'error',
        confirmButtonColor: '#EF4444'
      })
    }
  }

  const handleDeleteDegree = async (degree) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to delete "${degree.degreeName}"? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    })

    if (result.isConfirmed) {
      try {
        await degreesAPI.delete(degree._id)
        
        Swal.fire({
          title: 'Deleted!',
          text: 'Degree has been deleted successfully.',
          icon: 'success',
          confirmButtonColor: '#10B981'
        })
        
        fetchDegrees()
      } catch (error) {
        console.error('Error deleting degree:', error)
        const errorMessage = error.response?.data?.message || 'Failed to delete degree. Please try again.'
        
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
    setSelectedDegree(null)
    resetForm()
  }

  return (
    <div className="p-6">
      {/* Header with add button */}
      <div className="flex justify-between items-center mb-6">
        <div className="text-sm text-gray-600">
          Total degrees: {degrees.length}
        </div>
        <button
          onClick={handleAddDegree}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-2"
        >
          <span>+</span>
          Add Degree
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Degrees Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading degrees...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Degree Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Degree Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Major
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {degrees.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                      No degrees available. Click "Add Degree" to create your first degree program.
                    </td>
                  </tr>
                ) : (
                  degrees.map((degree) => (
                    <tr key={degree._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {degree.degreeCode}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {degree.degreeName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {degree.department}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {degree.major || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleEditDegree(degree)}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteDegree(degree)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                          >
                            Delete
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

      {/* Add Degree Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Add New Degree</h3>
              <button
                onClick={closeModals}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleSubmitAdd} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Degree Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={degreeCode}
                    onChange={(e) => setDegreeCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., BSCS, BSED"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Degree Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={degreeName}
                    onChange={(e) => setDegreeName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Bachelor of Science in Computer Science"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Computer Studies, Education"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Major (Optional)
                  </label>
                  <input
                    type="text"
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., English, Science (for BSED majors)"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModals}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Add Degree
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Degree Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Edit Degree</h3>
              <button
                onClick={closeModals}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleSubmitEdit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Degree Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={degreeCode}
                    onChange={(e) => setDegreeCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., BSCS, BSED"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Degree Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={degreeName}
                    onChange={(e) => setDegreeName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Bachelor of Science in Computer Science"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Computer Studies, Education"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Major (Optional)
                  </label>
                  <input
                    type="text"
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., English, Science (for BSED majors)"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModals}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Update Degree
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