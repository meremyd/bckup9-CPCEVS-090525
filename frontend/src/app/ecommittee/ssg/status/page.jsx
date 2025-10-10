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
  Building2,
  Vote,
  Info
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
    electionDate: '',
    ballotOpenTime: '',
    ballotCloseTime: ''
  })

  const router = useRouter()
  const searchParams = useSearchParams()
  const ssgElectionId = searchParams.get('ssgElectionId')

  // Helper function to calculate automatic status based on dates and times
  const calculateAutomaticStatus = (electionDate, ballotOpenTime, ballotCloseTime) => {
    if (!electionDate) return 'upcoming'
    
    const now = new Date()
    const elecDate = new Date(electionDate)
    
    // Set times to start/end of day for comparison
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const elecDateStart = new Date(elecDate.getFullYear(), elecDate.getMonth(), elecDate.getDate())
    
    // Before election date
    if (todayStart < elecDateStart) {
      return 'upcoming'
    }
    
    // On election date
    if (todayStart.getTime() === elecDateStart.getTime()) {
      // If ballot times are set, check if voting has closed
      if (ballotCloseTime) {
        const [closeHours, closeMinutes] = ballotCloseTime.split(':').map(Number)
        const closeDateTime = new Date(elecDate)
        closeDateTime.setHours(closeHours, closeMinutes, 0, 0)
        
        // If current time is past close time, mark as completed
        if (now > closeDateTime) {
          return 'completed'
        }
      }
      
      // Otherwise, it's active on election day
      return 'active'
    }
    
    // After election date
    return 'completed'
  }

  // Helper function to format time for display (24-hour to 12-hour)
  const formatTimeDisplay = (time24) => {
    if (!time24) return 'Not set'
    
    try {
      const [hours, minutes] = time24.split(':').map(Number)
      const period = hours >= 12 ? 'PM' : 'AM'
      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
      
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
    } catch (error) {
      return 'Invalid time'
    }
  }

  // Helper function to validate time format and relationship
  const validateBallotTimes = (openTime, closeTime) => {
    if (!openTime || !closeTime) return { isValid: true }

    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    
    if (!timeRegex.test(openTime)) {
      return { isValid: false, error: 'Ballot open time must be in HH:MM format (e.g., 08:00)' }
    }
    
    if (!timeRegex.test(closeTime)) {
      return { isValid: false, error: 'Ballot close time must be in HH:MM format (e.g., 17:00)' }
    }

    const [openHours, openMinutes] = openTime.split(':').map(Number)
    const [closeHours, closeMinutes] = closeTime.split(':').map(Number)
    
    const openTimeInMinutes = openHours * 60 + openMinutes
    const closeTimeInMinutes = closeHours * 60 + closeMinutes
    
    if (closeTimeInMinutes <= openTimeInMinutes) {
      return { isValid: false, error: 'Ballot close time must be after ballot open time' }
    }

    return { isValid: true }
  }

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

    if (ssgElectionId) {
      const storedElection = localStorage.getItem('selectedSSGElection')
      if (storedElection) {
        try {
          const parsed = JSON.parse(storedElection)
          if (parsed._id === ssgElectionId || parsed.id === ssgElectionId) {
            setElection(parsed)
            setFormData({
              ssgElectionId: parsed.ssgElectionId || '',
              electionYear: parsed.electionYear || new Date().getFullYear(),
              title: parsed.title || '',
              electionDate: parsed.electionDate ? 
                new Date(parsed.electionDate).toISOString().slice(0, 10) : '',
              ballotOpenTime: parsed.ballotOpenTime || '',
              ballotCloseTime: parsed.ballotCloseTime || ''
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
      
      setFormData({
        ssgElectionId: electionData.ssgElectionId || '',
        electionYear: electionData.electionYear || new Date().getFullYear(),
        title: electionData.title || '',
        electionDate: electionData.electionDate ? 
          new Date(electionData.electionDate).toISOString().slice(0, 10) : '',
        ballotOpenTime: electionData.ballotOpenTime || '',
        ballotCloseTime: electionData.ballotCloseTime || ''
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
      
      Swal.fire({
        icon: 'error',
        title: 'Error Loading Election',
        text: errorMessage,
        confirmButtonColor: '#001f65'
      })
    }
  }

  const updateElectionData = (updatedData) => {
    setElection(updatedData)
    
    const storedElection = localStorage.getItem('selectedSSGElection')
    if (storedElection) {
      localStorage.setItem('selectedSSGElection', JSON.stringify(updatedData))
    }
    
    window.dispatchEvent(new CustomEvent('electionUpdated', { 
      detail: { electionId: ssgElectionId, updatedData } 
    }))
    
    if (window.ssgElectionCache) {
      window.ssgElectionCache[ssgElectionId] = updatedData
    }
  }

  const handleSave = async () => {
    try {
      setFormLoading(true)
      setError('')
      setSuccess('')

      // Validation
      if (!formData.ssgElectionId.trim()) {
        throw new Error('SSG Election ID is required')
      }
      if (!formData.title.trim()) {
        throw new Error('Election title is required')
      }
      if (!formData.electionDate) {
        throw new Error('Election date is required')
      }

      // Validate ballot times
      const timeValidation = validateBallotTimes(formData.ballotOpenTime, formData.ballotCloseTime)
      if (!timeValidation.isValid) {
        throw new Error(timeValidation.error)
      }

      // Prepare update data - NO STATUS FIELD (will be calculated automatically by backend)
      const updatePayload = {
        ssgElectionId: formData.ssgElectionId,
        electionYear: formData.electionYear,
        title: formData.title,
        electionDate: formData.electionDate,
        ballotOpenTime: formData.ballotOpenTime || null,
        ballotCloseTime: formData.ballotCloseTime || null
      }

      const response = await ssgElectionsAPI.update(ssgElectionId, updatePayload)
      
      let updatedElectionData
      if (response.success && response.data) {
        updatedElectionData = response.data
      } else if (response.election) {
        updatedElectionData = response.election
      } else if (response._id || response.ssgElectionId) {
        updatedElectionData = response
      } else {
        const freshData = await ssgElectionsAPI.getById(ssgElectionId)
        if (freshData.success && freshData.data) {
          updatedElectionData = freshData.data
        } else if (freshData.election) {
          updatedElectionData = freshData.election
        } else {
          updatedElectionData = freshData
        }
      }
      
      if (updatedElectionData) {
        updateElectionData(updatedElectionData)
        
        setFormData({
          ssgElectionId: updatedElectionData.ssgElectionId || '',
          electionYear: updatedElectionData.electionYear || new Date().getFullYear(),
          title: updatedElectionData.title || '',
          electionDate: updatedElectionData.electionDate ? 
            new Date(updatedElectionData.electionDate).toISOString().slice(0, 10) : '',
          ballotOpenTime: updatedElectionData.ballotOpenTime || '',
          ballotCloseTime: updatedElectionData.ballotCloseTime || ''
        })
      }
      
      setIsEditing(false)
      setSuccess('Election updated successfully! Status is automatically managed based on dates.')
      
      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'Election updated successfully! Status is automatically managed.',
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      })
      
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
        if (election) {
          setFormData({
            ssgElectionId: election.ssgElectionId || '',
            electionYear: election.electionYear || new Date().getFullYear(),
            title: election.title || '',
            electionDate: election.electionDate ? 
              new Date(election.electionDate).toISOString().slice(0, 10) : '',
            ballotOpenTime: election.ballotOpenTime || '',
            ballotCloseTime: election.ballotCloseTime || ''
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
      case 'cancelled':
        return 'bg-red-500/20 text-red-700 border-red-300'
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
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-600" />
      default:
        return <XCircle className="w-5 h-5 text-gray-600" />
    }
  }

  const getBallotStatusColor = (ballotStatus) => {
    switch (ballotStatus?.toLowerCase()) {
      case 'open':
        return 'bg-green-500/20 text-green-700 border-green-300'
      case 'scheduled':
        return 'bg-yellow-500/20 text-yellow-700 border-yellow-300'
      case 'closed':
        return 'bg-red-500/20 text-red-700 border-red-300'
      case 'not_scheduled':
        return 'bg-gray-500/20 text-gray-700 border-gray-300'
      default:
        return 'bg-gray-500/20 text-gray-700 border-gray-300'
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set'
    
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch (error) {
      return 'Invalid date'
    }
  }

  const formatBallotDateTime = (date, time) => {
    if (!date || !time) return 'Not set'
    
    try {
      const dateStr = formatDate(date)
      const timeStr = formatTimeDisplay(time)
      return `${dateStr} at ${timeStr}`
    } catch (error) {
      return 'Invalid date/time'
    }
  }

  // Calculate what the current automatic status should be
  const currentAutomaticStatus = election ? 
    calculateAutomaticStatus(election.electionDate, election.ballotOpenTime, election.ballotCloseTime) : 
    'upcoming'

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
              <div className="bg-[#b0c8fe]/10 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-semibold text-[#001f65] mb-2">Election Title</h3>
                <p className="text-[#001f65]/80">{election.title || 'No title set'}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
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
                    <Calendar className="w-5 h-5 mr-2" />
                    <span className="font-medium">Election Date</span>
                  </div>
                  <p className="text-sm text-[#001f65]/80">
                    {formatDate(election.electionDate)}
                  </p>
                </div>

                <div className="bg-[#b0c8fe]/20 rounded-lg p-4">
                  <div className="flex items-center text-[#001f65] mb-2">
                    <Clock className="w-5 h-5 mr-2" />
                    <span className="font-medium">Ballot Opens</span>
                  </div>
                  <p className="text-sm text-[#001f65]/80">
                    {election.ballotOpenTime ? 
                      formatBallotDateTime(election.electionDate, election.ballotOpenTime) : 
                      'Not scheduled'
                    }
                  </p>
                </div>

                <div className="bg-[#b0c8fe]/20 rounded-lg p-4">
                  <div className="flex items-center text-[#001f65] mb-2">
                    <Clock className="w-5 h-5 mr-2" />
                    <span className="font-medium">Ballot Closes</span>
                  </div>
                  <p className="text-sm text-[#001f65]/80">
                    {election.ballotCloseTime ? 
                      formatBallotDateTime(election.electionDate, election.ballotCloseTime) : 
                      'Not scheduled'
                    }
                  </p>
                </div>

                <div className="bg-[#b0c8fe]/20 rounded-lg p-4">
                  <div className="flex items-center text-[#001f65] mb-2">
                    <Vote className="w-5 h-5 mr-2" />
                    <span className="font-medium">Ballot Status</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getBallotStatusColor(election.ballotStatus)}`}>
                      {election.ballotStatus?.replace('_', ' ').toUpperCase() || 'NOT SCHEDULED'}
                    </span>
                  </div>
                </div>
              </div>

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

        {/* Alerts */}
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
                  Election Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.electionDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, electionDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Status is automatically set: Upcoming (before), Active (on date), Completed (after close time)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ballot Open Time
                </label>
                <input
                  type="time"
                  value={formData.ballotOpenTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, ballotOpenTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  What time voting opens on the election date (24-hour format, e.g., 08:00)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ballot Close Time
                </label>
                <input
                  type="time"
                  value={formData.ballotCloseTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, ballotCloseTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  What time voting ends on the election date (24-hour format, e.g., 17:00). Can be extended even after voting starts.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </SSGLayout>
  )
}