"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ssgElectionsAPI } from "@/lib/api/ssgElections"
import SSGLayout from "@/components/SSGLayout"
import Swal from 'sweetalert2'
import { 
  Settings,
  Save,
  AlertCircle,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  Loader2,
  Building2
} from "lucide-react"

export default function SSGStatusPage() {
  const [election, setElection] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formData, setFormData] = useState({
    ssgElectionId: '',
    electionYear: new Date().getFullYear(),
    title: '',
    status: 'upcoming',
    electionDate: ''
  })

  const router = useRouter()
  const searchParams = useSearchParams()
  const ssgElectionId = searchParams.get('ssgElectionId')

  useEffect(() => {
    const token = localStorage.getItem("token")
    const userData = localStorage.getItem("user")

    if (!token || !userData) {
      router.push("/adminlogin")
      return
    }

    try {
      const parsedUser = JSON.parse(userData)
      if (parsedUser.userType !== "election_committee") {
        router.push("/adminlogin")
        return
      }
    } catch (parseError) {
      console.error("Error parsing user data:", parseError)
      router.push("/adminlogin")
      return
    }

    console.log('ssgElectionId from URL:', ssgElectionId)

    if (ssgElectionId) {
      // Try to get from localStorage first
      const storedElection = localStorage.getItem('selectedSSGElection')
      if (storedElection) {
        try {
          const parsed = JSON.parse(storedElection)
          console.log('Stored election:', parsed)
          if (parsed._id === ssgElectionId || parsed.id === ssgElectionId) {
            setElection(parsed)
            setFormData({
              ssgElectionId: parsed.ssgElectionId || '',
              electionYear: parsed.electionYear || new Date().getFullYear(),
              title: parsed.title || '',
              status: parsed.status || 'upcoming',
              electionDate: parsed.electionDate ? 
                new Date(parsed.electionDate).toISOString().slice(0, 16) : ''
            })
            return
          }
        } catch (e) {
          console.warn('Error parsing stored election:', e)
          localStorage.removeItem('selectedSSGElection')
        }
      }
      
      fetchElection()
    } else {
      setError('No election ID provided')
    }
  }, [ssgElectionId, router])

  const fetchElection = async () => {
    try {
      setError('')
      
      const response = await ssgElectionsAPI.getById(ssgElectionId)
      
      // Handle different response structures
      let electionData
      if (response.success && response.data) {
        electionData = response.data
      } else if (response.election) {
        electionData = response.election
      } else if (response._id || response.ssgElectionId) {
        electionData = response
      } else {
        throw new Error('Invalid response structure from API')
      }
      
      setElection(electionData)
      
      // Initialize form data with fetched election data
      setFormData({
        ssgElectionId: electionData.ssgElectionId || '',
        electionYear: electionData.electionYear || new Date().getFullYear(),
        title: electionData.title || '',
        status: electionData.status || 'upcoming',
        electionDate: electionData.electionDate ? 
          new Date(electionData.electionDate).toISOString().slice(0, 16) : ''
      })
      
    } catch (error) {
      console.error("Error fetching election:", error)
      let errorMessage = "Failed to load election data"
      
      if (error.response?.status === 404) {
        errorMessage = "Election not found"
      } else if (error.response?.status === 403) {
        errorMessage = "You don't have permission to view this election"
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
      
      // Show error with SweetAlert
      Swal.fire({
        icon: 'error',
        title: 'Error Loading Election',
        text: errorMessage,
        confirmButtonColor: '#001f65'
      })
    }
  }

  const updateElectionData = (updatedData) => {
    // Update the local state
    setElection(updatedData)
    
    // Update localStorage if it exists
    const storedElection = localStorage.getItem('selectedSSGElection')
    if (storedElection) {
      localStorage.setItem('selectedSSGElection', JSON.stringify(updatedData))
    }
    
    // Broadcast the update to other components/tabs that might be listening
    // This helps with real-time updates across the application
    window.dispatchEvent(new CustomEvent('electionUpdated', { 
      detail: { electionId: ssgElectionId, updatedData } 
    }))
    
    // Update any cached data that might exist
    if (window.ssgElectionCache) {
      window.ssgElectionCache[ssgElectionId] = updatedData
    }
  }

  const handleSave = async () => {
    try {
      setFormLoading(true)
      setError('')
      setSuccess('')

      // Validate form data
      if (!formData.ssgElectionId.trim()) {
        throw new Error('SSG Election ID is required')
      }
      if (!formData.title.trim()) {
        throw new Error('Election title is required')
      }
      if (!formData.electionDate) {
        throw new Error('Election date is required')
      }

      const response = await ssgElectionsAPI.update(ssgElectionId, formData)
      
      // Handle different response structures and get the updated election data
      let updatedElectionData
      if (response.success && response.data) {
        updatedElectionData = response.data
      } else if (response.election) {
        updatedElectionData = response.election
      } else if (response._id || response.ssgElectionId) {
        updatedElectionData = response
      } else {
        // If the response doesn't contain the updated data, fetch it again
        const freshData = await ssgElectionsAPI.getById(ssgElectionId)
        if (freshData.success && freshData.data) {
          updatedElectionData = freshData.data
        } else if (freshData.election) {
          updatedElectionData = freshData.election
        } else {
          updatedElectionData = freshData
        }
      }
      
      // Use the new update function to ensure all references are updated
      if (updatedElectionData) {
        updateElectionData(updatedElectionData)
        
        // Also update formData to reflect the saved changes
        setFormData({
          ssgElectionId: updatedElectionData.ssgElectionId || '',
          electionYear: updatedElectionData.electionYear || new Date().getFullYear(),
          title: updatedElectionData.title || '',
          status: updatedElectionData.status || 'upcoming',
          electionDate: updatedElectionData.electionDate ? 
            new Date(updatedElectionData.electionDate).toISOString().slice(0, 16) : ''
        })
      }
      
      setIsEditing(false)
      setSuccess('Election updated successfully!')
      
      // Show success with SweetAlert
      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'Election updated successfully!',
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      })
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)
      
    } catch (error) {
      console.error("Error updating election:", error)
      let errorMessage = "Failed to update election"
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
      
      // Show error with SweetAlert
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: errorMessage,
        confirmButtonColor: '#001f65'
      })
    } finally {
      setFormLoading(false)
    }
  }

  const handleCancel = () => {
    // Show confirmation dialog
    Swal.fire({
      title: 'Cancel Editing?',
      text: 'Any unsaved changes will be lost.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#001f65',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, cancel',
      cancelButtonText: 'Continue editing'
    }).then((result) => {
      if (result.isConfirmed) {
        // Reset form data to original election data
        if (election) {
          setFormData({
            ssgElectionId: election.ssgElectionId || '',
            electionYear: election.electionYear || new Date().getFullYear(),
            title: election.title || '',
            status: election.status || 'upcoming',
            electionDate: election.electionDate ? 
              new Date(election.electionDate).toISOString().slice(0, 16) : ''
          })
        }
        setIsEditing(false)
        setError('')
      }
    })
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-500/20 text-green-700 border-green-300'
      case 'upcoming':
        return 'bg-yellow-500/20 text-yellow-700 border-yellow-300'
      case 'completed':
        return 'bg-blue-500/20 text-blue-700 border-blue-300'
      case 'draft':
        return 'bg-gray-500/20 text-gray-700 border-gray-300'
      default:
        return 'bg-gray-500/20 text-gray-700 border-gray-300'
    }
  }

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'upcoming':
        return <Clock className="w-5 h-5 text-yellow-600" />
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-blue-600" />
      case 'draft':
        return <Edit className="w-5 h-5 text-gray-600" />
      default:
        return <XCircle className="w-5 h-5 text-gray-600" />
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set'
    
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      return 'Invalid date'
    }
  }

  if (!ssgElectionId) {
    return (
      <SSGLayout
        ssgElectionId={null}
        title="Election Status Management"
        subtitle="Status Configuration"
        activeItem="status"
      >
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20">
            <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Election Selected</h3>
            <p className="text-white/80 mb-6">Please select an election to manage its status.</p>
            <button
              onClick={() => router.push('/ecommittee/ssg')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Back to Elections
            </button>
          </div>
        </div>
      </SSGLayout>
    )
  }

  return (
    <SSGLayout
      ssgElectionId={ssgElectionId}
      title="Election Status Management"
      subtitle="Status Configuration"
      activeItem="status"
    >
      {/* Status Cards and Form */}
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Status Overview Card */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[#001f65] flex items-center">
              <Settings className="w-6 h-6 mr-2" />
              Election Status Overview
            </h2>
            {election && (
              <div className="flex items-center gap-2">
                {getStatusIcon(election.status)}
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(election.status)}`}>
                  {election.status?.toUpperCase() || 'UNKNOWN'}
                </span>
              </div>
            )}
          </div>

          {election && (
            <>
             {/* Election Title Display */}
              <div className="bg-[#b0c8fe]/10 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-semibold text-[#001f65] mb-2">Election Title</h3>
                <p className="text-[#001f65]/80">{election.title || 'No title set'}</p>
              </div>
              
              {/* Quick Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-[#b0c8fe]/20 rounded-lg p-4">
                  <div className="flex items-center text-[#001f65] mb-2">
                    <Building2 className="w-5 h-5 mr-2" />
                    <span className="font-medium">Election ID</span>
                  </div>
                  <p className="text-sm text-[#001f65]/80 font-mono">{election.ssgElectionId || 'N/A'}</p>
                </div>
                
                <div className="bg-[#b0c8fe]/20 rounded-lg p-4">
                  <div className="flex items-center text-[#001f65] mb-2">
                    <Calendar className="w-5 h-5 mr-2" />
                    <span className="font-medium">Election Year</span>
                  </div>
                  <p className="text-sm text-[#001f65]/80">{election.electionYear || 'N/A'}</p>
                </div>

                <div className="bg-[#b0c8fe]/20 rounded-lg p-4">
                  <div className="flex items-center text-[#001f65] mb-2">
                    <Clock className="w-5 h-5 mr-2" />
                    <span className="font-medium">Election Date</span>
                  </div>
                  <p className="text-sm text-[#001f65]/80">
                    {formatDate(election.electionDate)}
                  </p>
                </div>
              </div>

             

              {/* Action Button */}
              <div className="flex justify-end">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center px-4 py-2 bg-[#001f65] hover:bg-[#003399] text-white rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Election Details
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={formLoading}
                      className="flex items-center px-4 py-2 bg-[#001f65] hover:bg-[#003399] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {formLoading ? (
                        <Loader2 className="animate-spin rounded-full h-4 w-4 mr-2" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save Changes
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Alerts - Only show if not using SweetAlert for the same purpose */}
        {error && !isEditing && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
            <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
            <p className="text-green-700">{success}</p>
          </div>
        )}

        {/* Edit Form */}
        {isEditing && election && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
            <h3 className="text-lg font-bold text-[#001f65] mb-6">Edit Election Details</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SSG Election ID *
                </label>
                <input
                  type="text"
                  required
                  value={formData.ssgElectionId}
                  onChange={(e) => setFormData(prev => ({ ...prev, ssgElectionId: e.target.value }))}
                  placeholder="e.g., SSG2024-001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Election Year *
                </label>
                <input
                  type="number"
                  required
                  value={formData.electionYear}
                  onChange={(e) => setFormData(prev => ({ ...prev, electionYear: parseInt(e.target.value) }))}
                  min="2024"
                  max="2030"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Election Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., SSG Election 2024"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status *
                </label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent"
                >
                  <option value="draft">Draft</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Draft: Election is being prepared • Upcoming: Ready but not started • Active: Currently running • Completed: Finished
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Election Date *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.electionDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, electionDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </SSGLayout>
  )
}