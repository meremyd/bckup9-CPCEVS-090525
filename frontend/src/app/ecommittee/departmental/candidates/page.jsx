"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { candidatesAPI } from "@/lib/api/candidates"
import { positionsAPI } from "@/lib/api/positions"
import { votersAPI } from "@/lib/api/voters"
import DepartmentalLayout from '@/components/DepartmentalLayout'
import Swal from 'sweetalert2'
import { 
  Plus,
  Edit,
  Trash2,
  Save,
  AlertCircle,
  CheckCircle,
  Loader2,
  Search,
  Users,
  UserCheck,
  X,
  Info,
  UserPlus,
  Upload,
  Image,
  FileText,
  Download,
  Eye,
  Shield
} from "lucide-react"

export default function DepartmentalCandidatesPage() {
  const [departmentalCandidates, setDepartmentalCandidates] = useState([])
  const [departmentalPositions, setDepartmentalPositions] = useState([])
  const [classOfficers, setClassOfficers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingCandidate, setEditingCandidate] = useState(null)
  const [formLoading, setFormLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPosition, setFilterPosition] = useState('')
  
  // Position limits states
  const [positionLimits, setPositionLimits] = useState({})
  const [checkingEligibility, setCheckingEligibility] = useState(false)
  
  // Voter lookup states (class officers only)
  const [officerSearchId, setOfficerSearchId] = useState('')
  const [officerSearchResults, setOfficerSearchResults] = useState([])
  const [officerSearchLoading, setOfficerSearchLoading] = useState(false)
  const [selectedOfficer, setSelectedOfficer] = useState(null)
  const [showOfficerDropdown, setShowOfficerDropdown] = useState(false)
  
  const [candidateStats, setCandidateStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    byPosition: {}
  })
  
  const [formData, setFormData] = useState({
    voterId: '',
    positionId: '',
    candidateNumber: '',
    campaignPicture: '',
    isActive: true
  })

  const router = useRouter()
  const searchParams = useSearchParams()
  const deptElectionId = searchParams.get('deptElectionId')

  const getErrorMessage = (error) => {
    if (error.name === 'NetworkError' || error.code === 'NETWORK_ERROR') {
      return "Connection error. Please check your internet connection and try again."
    } else if (error.response?.status === 429) {
      return "Too many requests. Please wait a moment and try again."
    } else if (error.response?.status === 401) {
      return "Your session has expired. Please log in again."
    } else if (error.response?.status === 403) {
      return "You don't have permission to perform this action."
    } else if (error.response?.status === 404) {
      return "Requested resource not found."
    } else if (error.response?.status >= 500) {
      return "Server error. Please try again later or contact support."
    } else if (error.response?.data?.message) {
      return error.response.data.message
    } else if (error.message) {
      return error.message
    }
    return "An unexpected error occurred. Please try again."
  }

  const showErrorAlert = (error) => {
    const errorMessage = getErrorMessage(error)
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: errorMessage,
      confirmButtonColor: '#001f65'
    })
  }

  const showSuccessAlert = (message) => {
    Swal.fire({
      icon: 'success',
      title: 'Success',
      text: message,
      confirmButtonColor: '#001f65',
      timer: 3000,
      timerProgressBar: true
    })
  }

  // Calculate candidate statistics (no partylist)
  const calculateCandidateStats = (candidates, positions) => {
    const stats = {
      total: candidates.length,
      active: 0,
      inactive: 0,
      byPosition: {}
    }

    // Initialize position counts
    positions.forEach(position => {
      stats.byPosition[position._id] = {
        name: position.positionName,
        count: 0,
        maxCandidates: position.maxCandidates || 10
      }
    })

    candidates.forEach(candidate => {
      // Count active/inactive
      if (candidate.isActive !== false) {
        stats.active++
      } else {
        stats.inactive++
      }

      // Count by position
      const positionId = candidate.positionId?._id || candidate.positionId
      if (positionId && stats.byPosition[positionId]) {
        stats.byPosition[positionId].count++
      }
    })

    return stats
  }

  // Calculate position limits based on existing candidates and max limits
  const calculatePositionLimits = (candidates, positions) => {
    const limits = {}
    
    positions.forEach(position => {
      limits[position._id] = {
        maxCandidates: position.maxCandidates || 10,
        currentTotal: 0,
        canAddMore: true
      }
    })
    
    // Count existing candidates
    candidates.forEach(candidate => {
      const positionId = candidate.positionId?._id || candidate.positionId
      
      if (limits[positionId]) {
        limits[positionId].currentTotal++
      }
    })
    
    // Update canAddMore flags
    Object.keys(limits).forEach(positionId => {
      const positionLimit = limits[positionId]
      positionLimit.canAddMore = positionLimit.currentTotal < positionLimit.maxCandidates
    })
    
    return limits
  }

  useEffect(() => {
    if (deptElectionId) {
      fetchData()
    } else {
      router.push('/ecommittee/departmental')
    }
  }, [router, deptElectionId])

  const fetchData = async () => {
    try {
      setLoading(true)
      console.log('Fetching data for Departmental election:', deptElectionId)

      // Use departmental API endpoints
      const [candidatesResponse, positionsResponse, officersResponse] = await Promise.all([
        candidatesAPI.departmental.getByElection(deptElectionId, {}),
        positionsAPI.departmental.getByElection(deptElectionId),
        votersAPI.getOfficers({ limit: 1000 }) // Get ALL class officers
      ])

      console.log('API Responses received:', {
        candidates: !!candidatesResponse,
        positions: !!positionsResponse,
        officers: !!officersResponse
      })

      // Process API responses
      let candidatesData = []
      if (candidatesResponse?.data?.candidates) {
        candidatesData = candidatesResponse.data.candidates
      } else if (Array.isArray(candidatesResponse?.data)) {
        candidatesData = candidatesResponse.data
      }

      let positionsData = []
      if (positionsResponse?.data?.positions) {
        positionsData = positionsResponse.data.positions
      } else if (Array.isArray(positionsResponse?.data)) {
        positionsData = positionsResponse.data
      }

      let officersData = []
      if (officersResponse?.data?.voters) {
        officersData = officersResponse.data.voters
      } else if (Array.isArray(officersResponse?.data)) {
        officersData = officersResponse.data
      }

      console.log('Data counts:', {
        candidates: candidatesData.length,
        positions: positionsData.length,
        officers: officersData.length
      })

      // Process candidates data
      const processedCandidates = candidatesData.map((candidate, index) => {
        const processedCandidate = {
          _id: candidate._id || `candidate-${index}`,
          candidateNumber: candidate.candidateNumber || 'N/A',
          isActive: candidate.isActive !== false,
          
          // Voter information (class officer)
          voterId: candidate.voterId?._id || candidate.voterId,
          voterInfo: candidate.voterId ? {
            _id: candidate.voterId._id || candidate.voterId,
            schoolId: candidate.voterId.schoolId || 'N/A',
            firstName: candidate.voterId.firstName || '',
            middleName: candidate.voterId.middleName || '',
            lastName: candidate.voterId.lastName || '',
            yearLevel: candidate.voterId.yearLevel || 'N/A',
            departmentId: candidate.voterId.departmentId || null,
            isRegistered: candidate.voterId.isRegistered || false,
            isOfficer: candidate.voterId.isOfficer || false
          } : null,
          
          // Position information
          positionId: candidate.positionId?._id || candidate.positionId,
          positionInfo: candidate.positionId ? {
            _id: candidate.positionId._id || candidate.positionId,
            positionName: candidate.positionId.positionName || 'Unknown Position',
            positionOrder: candidate.positionId.positionOrder || 999
          } : null,
          
          // Campaign picture only (no credentials for departmental)
          campaignPicture: candidate.campaignPicture || null,
          hasCampaignPicture: !!candidate.campaignPicture
        }

        // Add computed fields
        processedCandidate.fullName = processedCandidate.voterInfo ? 
          `${processedCandidate.voterInfo.firstName} ${processedCandidate.voterInfo.middleName} ${processedCandidate.voterInfo.lastName}`.replace(/\s+/g, ' ').trim() :
          'Unknown'
        
        processedCandidate.position = processedCandidate.positionInfo?.positionName || 'Unknown Position'
        processedCandidate.positionOrder = processedCandidate.positionInfo?.positionOrder || 999
        processedCandidate.schoolId = processedCandidate.voterInfo?.schoolId || 'N/A'
        processedCandidate.yearLevel = processedCandidate.voterInfo?.yearLevel || 'N/A'
        processedCandidate.department = processedCandidate.voterInfo?.departmentId?.departmentCode || 'Unknown'
        processedCandidate.isRegistered = processedCandidate.voterInfo?.isRegistered || false
        processedCandidate.isOfficer = processedCandidate.voterInfo?.isOfficer || false

        return processedCandidate
      })

      // Process positions
      const processedPositions = positionsData.map((position, index) => ({
        ...position,
        _id: position._id || `position-${index}`,
        positionName: position.positionName || 'Unknown Position',
        positionOrder: position.positionOrder || 999,
        maxCandidates: position.maxCandidates || 10,
        candidateCount: processedCandidates.filter(c => 
          (c.positionId === position._id || c.positionId?._id === position._id)
        ).length
      }))

      // Process class officers
      const processedOfficers = officersData
        .filter(officer => officer.isOfficer) // Only class officers
        .map((officer, index) => ({
          ...officer,
          _id: officer._id || `officer-${index}`,
          fullName: officer.fullName || 
                   `${officer.firstName || ''} ${officer.middleName || ''} ${officer.lastName || ''}`.replace(/\s+/g, ' ').trim(),
          schoolId: officer.schoolId || 'N/A',
          departmentId: officer.departmentId || null,
          yearLevel: officer.yearLevel || 'N/A',
          isRegistered: officer.isRegistered || false,
          isOfficer: officer.isOfficer || false
        }))

      console.log('Processed data:', {
        candidates: processedCandidates.length,
        positions: processedPositions.length,
        officers: processedOfficers.length
      })

      // Update state
      setDepartmentalCandidates(processedCandidates)
      setDepartmentalPositions(processedPositions)
      setClassOfficers(processedOfficers)
      
      // Calculate stats and limits
      setCandidateStats(calculateCandidateStats(processedCandidates, processedPositions))
      setPositionLimits(calculatePositionLimits(processedCandidates, processedPositions))

    } catch (error) {
      console.error("Error in fetchData:", error)
      showErrorAlert(error)
      
      // Reset to empty states on error
      setDepartmentalCandidates([])
      setDepartmentalPositions([])
      setClassOfficers([])
      setCandidateStats({
        total: 0,
        active: 0,
        inactive: 0,
        byPosition: {}
      })
      setPositionLimits({})
    } finally {
      setLoading(false)
    }
  }

  // Search class officers with eligibility checking
  const searchOfficers = async (searchValue) => {
    if (!searchValue.trim()) {
      setOfficerSearchResults([])
      setShowOfficerDropdown(false)
      return
    }

    setOfficerSearchLoading(true)
    
    try {
      const searchTerm = searchValue.toLowerCase()
      
      // Filter class officers only
      const filteredOfficers = classOfficers.filter(officer => {
        const matchesSchoolId = officer.schoolId?.toString().toLowerCase().includes(searchTerm)
        const matchesName = officer.fullName?.toLowerCase().includes(searchTerm) ||
                           officer.firstName?.toLowerCase().includes(searchTerm) ||
                           officer.lastName?.toLowerCase().includes(searchTerm)
        
        return matchesSchoolId || matchesName
      }).filter(officer => {
        // Exclude officers who are already candidates in this election (unless editing)
        if (editingCandidate && editingCandidate.voterId === officer._id) {
          return true // Allow current candidate when editing
        }
        
        return !departmentalCandidates.some(candidate => 
          candidate.voterId === officer._id || candidate.voterId?._id === officer._id
        )
      })
      
      // Sort by name
      const sortedOfficers = filteredOfficers.sort((a, b) => 
        a.fullName.localeCompare(b.fullName)
      )
      
      setOfficerSearchResults(sortedOfficers.slice(0, 15)) // Show top 15 results
      setShowOfficerDropdown(true)
    } catch (error) {
      console.error('Error searching officers:', error)
      setOfficerSearchResults([])
    } finally {
      setOfficerSearchLoading(false)
    }
  }

  const selectOfficer = async (officer) => {
    try {
      setCheckingEligibility(true)
      
      // Check if officer is already a candidate in this election (unless editing)
      if (!editingCandidate || editingCandidate.voterId !== officer._id) {
        const existingCandidate = departmentalCandidates.find(candidate => 
          candidate.voterId === officer._id || candidate.voterId?._id === officer._id
        )
        
        if (existingCandidate) {
          Swal.fire({
            icon: 'error',
            title: 'Officer Already a Candidate',
            text: `${officer.fullName} is already a candidate for ${existingCandidate.position} in this departmental election.`,
            confirmButtonColor: '#001f65'
          })
          return
        }
      }

      setSelectedOfficer(officer)
      setOfficerSearchId(officer.fullName)
      setFormData(prev => ({ ...prev, voterId: officer._id }))
      setShowOfficerDropdown(false)
      setOfficerSearchResults([])
    } catch (error) {
      console.error('Error selecting officer:', error)
      showErrorAlert(error)
    } finally {
      setCheckingEligibility(false)
    }
  }

  // Position Filter Dropdown with candidate counts and limits
  const PositionFilterDropdown = () => {
    return (
      <select
        value={filterPosition}
        onChange={(e) => setFilterPosition(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent"
      >
        <option value="">All Positions ({candidateStats.total})</option>
        {departmentalPositions.map(position => {
          const candidateCount = candidateStats.byPosition[position._id]?.count || 0
          const maxCandidates = position.maxCandidates || 2
          
          return (
            <option key={position._id} value={position._id}>
              {position.positionName} ({candidateCount}/{maxCandidates})
            </option>
          )
        })}
      </select>
    )
  }

  // Handle image upload for campaign picture
  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      Swal.fire({
        icon: 'error',
        title: 'File Too Large',
        text: 'Please select an image smaller than 2MB.',
        confirmButtonColor: '#001f65'
      })
      return
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid File Type',
        text: 'Please select a valid image file (JPEG, PNG, GIF).',
        confirmButtonColor: '#001f65'
      })
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      try {
        // Extract base64 data
        const base64Data = reader.result.split(',')[1]
        if (base64Data) {
          setFormData(prev => ({ ...prev, campaignPicture: base64Data }))
        } else {
          throw new Error('Invalid image data')
        }
      } catch (error) {
        console.error('Error processing image:', error)
        Swal.fire({
          icon: 'error',
          title: 'Image Processing Error',
          text: 'Failed to process the selected image. Please try another image.',
          confirmButtonColor: '#001f65'
        })
      }
    }
    reader.onerror = () => {
      Swal.fire({
        icon: 'error',
        title: 'File Read Error',
        text: 'Failed to read the selected file. Please try again.',
        confirmButtonColor: '#001f65'
      })
    }
    reader.readAsDataURL(file)
  }

  const handleAddCandidate = () => {
    setShowAddForm(true)
    setEditingCandidate(null)
    setFormData({
      voterId: '',
      positionId: '',
      candidateNumber: '',
      campaignPicture: '',
      isActive: true
    })
    setOfficerSearchId('')
    setSelectedOfficer(null)
    setOfficerSearchResults([])
    setShowOfficerDropdown(false)
  }

  const handleEditCandidate = (candidate) => {
    setEditingCandidate(candidate)
    setShowAddForm(true)
    
    setFormData({
      voterId: candidate.voterId?._id || candidate.voterId || '',
      positionId: candidate.positionId?._id || candidate.positionId || '',
      candidateNumber: candidate.candidateNumber || '',
      campaignPicture: candidate.campaignPicture || '',
      isActive: candidate.isActive !== false
    })
    
    // Set officer data for editing
    if (candidate.voterInfo) {
      setOfficerSearchId(candidate.fullName || '')
      setSelectedOfficer({
        _id: candidate.voterInfo._id || candidate.voterId,
        fullName: candidate.fullName || '',
        schoolId: candidate.voterInfo.schoolId || '',
        departmentId: candidate.voterInfo.departmentId || null,
        yearLevel: candidate.voterInfo.yearLevel || '',
        isRegistered: candidate.voterInfo.isRegistered || false,
        isOfficer: candidate.voterInfo.isOfficer || false
      })
    }
    setOfficerSearchResults([])
    setShowOfficerDropdown(false)
  }

  const handleDeleteCandidate = async (candidateId, candidateName) => {
    const result = await Swal.fire({
      title: 'Delete Candidate',
      text: `Are you sure you want to delete ${candidateName}? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    })

    if (result.isConfirmed) {
      try {
        await candidatesAPI.departmental.delete(candidateId)
        await fetchData() // Refresh data
        showSuccessAlert('Candidate deleted successfully!')
      } catch (error) {
        console.error('Error deleting candidate:', error)
        showErrorAlert(error)
      }
    }
  }

  const validateForm = () => {
    const errors = []
    
    if (!selectedOfficer) {
      errors.push('Please select a class officer.')
    } else {
      // Check if officer is not a class officer
      if (!selectedOfficer.isOfficer) {
        errors.push('Only class officers can be departmental candidates.')
      }
      
      // Check if officer is already a candidate (except when editing)
      const existingCandidate = departmentalCandidates.find(candidate => 
        (candidate.voterId === selectedOfficer._id || candidate.voterId?._id === selectedOfficer._id) &&
        (!editingCandidate || candidate._id !== editingCandidate._id)
      )
      
      if (existingCandidate) {
        errors.push(`${selectedOfficer.fullName} is already a candidate for ${existingCandidate.position} in this departmental election.`)
      }
    }

    if (!formData.positionId) {
      errors.push('Please select a position.')
    }

    // Position limit validation
    if (formData.positionId) {
      const positionLimit = positionLimits[formData.positionId]
      
      if (positionLimit) {
        // Check if adding a new candidate or if editing candidate changed position
        let shouldCheckLimit = true
        if (editingCandidate) {
          const currentPositionId = editingCandidate.positionId?._id || editingCandidate.positionId
          
          // Don't check limit if position hasn't changed
          if (currentPositionId === formData.positionId) {
            shouldCheckLimit = false
          }
        }
        
        if (shouldCheckLimit && !positionLimit.canAddMore) {
          const positionName = departmentalPositions.find(p => p._id === formData.positionId)?.positionName || 'this position'
          
          errors.push(`${positionName} already has the maximum number of candidates (${positionLimit.maxCandidates}).`)
        }
      }
    }

    return errors
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    
    // Validation
    const validationErrors = validateForm()
    if (validationErrors.length > 0) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: validationErrors[0], // Show first error
        confirmButtonColor: '#001f65'
      })
      return
    }

    setFormLoading(true)

    try {
      const submitData = {
        ...formData,
        deptElectionId: deptElectionId
      }

      if (editingCandidate) {
        await candidatesAPI.departmental.update(editingCandidate._id, submitData)
        showSuccessAlert('Candidate updated successfully!')
      } else {
        await candidatesAPI.departmental.create(submitData)
        showSuccessAlert('Candidate added successfully!')
      }

      await fetchData() // Refresh data
      setShowAddForm(false)
    } catch (error) {
      console.error('Error saving candidate:', error)
      showErrorAlert(error)
    } finally {
      setFormLoading(false)
    }
  }

  // Enhanced filtering
  const filteredCandidates = departmentalCandidates.filter(candidate => {
    // Search filter
    const matchesSearch = searchTerm === '' || 
      candidate.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.schoolId?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.position?.toLowerCase().includes(searchTerm.toLowerCase())

    // Position filter
    const matchesPosition = filterPosition === '' || 
      candidate.positionId === filterPosition ||
      candidate.positionId?._id === filterPosition

    return matchesSearch && matchesPosition
  })

  // Get position options with availability status
  const getPositionOptions = () => {
    return departmentalPositions.map(position => {
      const positionLimit = positionLimits[position._id]
      
      let isDisabled = false
      let reasonText = ''
      
      if (positionLimit) {
        // Check overall position limit
        if (!positionLimit.canAddMore) {
          isDisabled = true
          reasonText = ` - Position Full (${positionLimit.currentTotal}/${positionLimit.maxCandidates})`
        }
      }
      
      // Don't disable if editing and current position
      if (editingCandidate && (editingCandidate.positionId === position._id || editingCandidate.positionId?._id === position._id)) {
        isDisabled = false
        reasonText = ''
      }
      
      return {
        ...position,
        isDisabled,
        displayText: `${position.positionName}${reasonText}`,
        candidateCount: positionLimit ? positionLimit.currentTotal : 0,
        maxCandidates: position.maxCandidates || 10
      }
    })
  }

  if (loading) {
    return (
      <DepartmentalLayout 
        deptElectionId={deptElectionId}
        title="Candidates"
        subtitle="Loading candidates..."
        activeItem="candidates"
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20">
            <Loader2 className="animate-spin rounded-full h-12 w-12 mx-auto text-white" />
            <p className="mt-4 text-white font-medium">Loading candidates...</p>
          </div>
        </div>
      </DepartmentalLayout>
    )
  }

  return (
    <DepartmentalLayout 
      deptElectionId={deptElectionId}
      title="Candidates Management"
      subtitle={`Managing ${candidateStats.total} candidates in this departmental election`}
      activeItem="candidates"
    >

      {/* Add/Edit Candidate Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">
                  {editingCandidate ? 'Edit Candidate' : 'Add New Candidate'}
                </h3>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Class Officer Search */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search and Select Class Officer *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={officerSearchId}
                        onChange={(e) => {
                          setOfficerSearchId(e.target.value)
                          // Debounce the search call
                          clearTimeout(window.officerSearchTimeout)
                          window.officerSearchTimeout = setTimeout(() => {
                            searchOfficers(e.target.value)
                          }, 300)
                        }}
                        placeholder="Type class officer name or school ID..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                        onFocus={() => {
                          if (officerSearchResults.length > 0) {
                            setShowOfficerDropdown(true)
                          }
                        }}
                      />
                      {(officerSearchLoading || checkingEligibility) && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <Loader2 className="animate-spin h-4 w-4 text-gray-400" />
                        </div>
                      )}
                      
                      {/* Dropdown with officer results */}
                      {showOfficerDropdown && officerSearchResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {officerSearchResults.map((officer) => {
                            // Check if officer is already a candidate
                            const isAlreadyCandidate = departmentalCandidates.some(candidate => 
                              (candidate.voterId === officer._id || candidate.voterId?._id === officer._id) &&
                              (!editingCandidate || candidate._id !== editingCandidate._id)
                            )
                            
                            return (
                              <button
                                key={officer._id}
                                type="button"
                                onClick={() => selectOfficer(officer)}
                                disabled={isAlreadyCandidate}
                                className={`w-full px-3 py-2 text-left border-b border-gray-100 last:border-b-0 ${
                                  isAlreadyCandidate 
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                    : 'hover:bg-blue-50 focus:bg-blue-50'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-medium text-gray-900">{officer.fullName}</div>
                                    <div className="text-sm text-gray-500">
                                      ID: {officer.schoolId} • {officer.departmentId?.departmentCode || 'N/A'}
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full flex items-center">
                                      <Shield className="w-3 h-3 mr-1" />
                                      Officer
                                    </span>
                                    {officer.isRegistered && (
                                      <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                                        Registered
                                      </span>
                                    )}
                                    {isAlreadyCandidate && (
                                      <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded-full">
                                        Already Candidate
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                    
                    {/* Selected officer display */}
                    {selectedOfficer && (
                      <div className="mt-2 p-3 border rounded-lg bg-blue-50 border-blue-200">
                        <div className="flex items-center">
                          <Shield className="w-4 h-4 mr-2 text-blue-600" />
                          <div className="text-sm">
                            <p className="font-medium text-blue-800">
                              {selectedOfficer.fullName}
                            </p>
                            <p className="text-blue-600">
                              ID: {selectedOfficer.schoolId} • {selectedOfficer.departmentId?.departmentCode || 'N/A'} - Year {selectedOfficer.yearLevel}
                            </p>
                            <p className="text-blue-700 text-xs mt-1">
                              ✓ Class Officer {selectedOfficer.isRegistered && '• Registered voter'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Info about class officer requirement */}
                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-start">
                        <Info className="w-4 h-4 text-amber-600 mt-0.5 mr-2 flex-shrink-0" />
                        <div className="text-xs text-amber-800">
                          <p className="font-medium">Class Officer Requirement</p>
                          <p>Only students with class officer status can be departmental candidates.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Position Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Position *
                    </label>
                    <select
                      required
                      value={formData.positionId}
                      onChange={(e) => setFormData(prev => ({ ...prev, positionId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select a position</option>
                      {getPositionOptions().map(position => (
                        <option 
                          key={position._id} 
                          value={position._id}
                          disabled={position.isDisabled}
                          className={position.isDisabled ? 'text-gray-400 bg-gray-100' : ''}
                        >
                          {position.displayText}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Candidate Number
                    </label>
                    <input
                      type="number"
                      value={formData.candidateNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, candidateNumber: e.target.value }))}
                      placeholder="e.g., 1"
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Campaign Picture Upload */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Campaign Picture (Optional)
                    </label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="file"
                        id="campaignPicture"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <label
                        htmlFor="campaignPicture"
                        className="flex items-center px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <Upload className="w-4 h-4 mr-2 text-gray-600" />
                        Choose Image
                      </label>
                      {formData.campaignPicture && (
                        <div className="flex items-center text-sm text-green-600">
                          <Image className="w-4 h-4 mr-1" />
                          Image uploaded
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum file size: 2MB. Supported formats: JPG, PNG, GIF
                    </p>
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                    Active candidate
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading || !selectedOfficer || checkingEligibility}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {(formLoading || checkingEligibility) ? (
                      <Loader2 className="animate-spin rounded-full h-4 w-4" />
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {editingCandidate ? 'Update' : 'Add'} Candidate
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Candidates Table */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
        {/* Table Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-[#001f65]">
                Candidates 
                <span className="text-lg font-normal text-gray-600 ml-2">
                  ({filteredCandidates.length}{searchTerm || filterPosition ? ` of ${candidateStats.total}` : ''})
                </span>
              </h2>
            </div>
            
            <button
              onClick={handleAddCandidate}
              className="flex items-center px-4 py-2 bg-[#001f65] hover:bg-[#003399] text-white rounded-lg transition-colors sm:hidden"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Candidate
            </button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search candidates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent"
              />
            </div>
            
            <PositionFilterDropdown />

            <button
              onClick={handleAddCandidate}
              className="flex items-center px-4 py-2 bg-[#001f65] hover:bg-[#003399] text-white rounded-lg transition-colors whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Candidate
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Profile
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Candidate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Files
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <Users className="w-12 h-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {candidateStats.total === 0 ? 'No candidates found' : 'No matching candidates'}
                      </h3>
                      <p className="text-gray-500 mb-4">
                        {candidateStats.total === 0 ? 
                          'Get started by adding the first candidate for this departmental election.' :
                          searchTerm || filterPosition ? 
                            'Try adjusting your search or filters to see more candidates.' :
                            'All candidates are currently filtered out.'
                        }
                      </p>
                      {candidateStats.total === 0 && (
                        <button
                          onClick={handleAddCandidate}
                          className="flex items-center px-4 py-2 bg-[#001f65] hover:bg-[#003399] text-white rounded-lg transition-colors"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add First Candidate
                        </button>
                      )}
                      {candidateStats.total > 0 && (searchTerm || filterPosition) && (
                        <button
                          onClick={() => {
                            setSearchTerm('')
                            setFilterPosition('')
                          }}
                          className="text-[#001f65] hover:text-[#003399] font-medium"
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((candidate, index) => {
                  const candidateKey = candidate._id || `candidate-${index}`
                  
                  return (
                    <tr key={candidateKey} className="hover:bg-gray-50">
                      {/* Profile Picture Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex-shrink-0 h-12 w-12">
                          {candidate.campaignPicture ? (
                            <img
                              className="h-12 w-12 rounded-full object-cover border-2 border-gray-200"
                              src={`data:image/jpeg;base64,${candidate.campaignPicture}`}
                              alt={candidate.fullName}
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-full bg-[#b0c8fe]/30 flex items-center justify-center border-2 border-gray-200">
                              <UserCheck className="h-6 w-6 text-[#001f65]" />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Candidate Info Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {candidate.fullName}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            ID: {candidate.schoolId}
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <Shield className="w-3 h-3 mr-1" />
                              Officer
                            </span>
                            {candidate.isRegistered && (
                              <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Registered
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Position Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {candidate.position}
                        </div>
                      </td>

                      {/* Department Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {candidate.department}
                        </div>
                        <div className="text-sm text-gray-500">
                          Year {candidate.yearLevel}
                        </div>
                      </td>

                      {/* Number Column */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {candidate.candidateNumber}
                      </td>

                      {/* Files Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {candidate.hasCampaignPicture && (
                            <span className="text-green-600 p-1" title="Has campaign picture">
                              <Image className="w-4 h-4" />
                            </span>
                          )}
                          {!candidate.hasCampaignPicture && (
                            <span className="text-gray-400 text-xs">No files</span>
                          )}
                        </div>
                      </td>

                      {/* Status Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          candidate.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {candidate.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Actions Column */}
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleEditCandidate(candidate)}
                            className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50 transition-colors"
                            title="Edit candidate"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCandidate(
                              candidate._id,
                              candidate.fullName
                            )}
                            className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                            title="Delete candidate"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Position Limits Information Panel */}
        {Object.keys(positionLimits).length > 0 && (
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div>
              <h4 className="text-sm font-semibold text-gray-800 mb-3">Position Limits</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(positionLimits).map(([positionId, limit]) => {
                  const position = departmentalPositions.find(p => p._id === positionId)
                  if (!position) return null
                  
                  const percentage = limit.maxCandidates > 0 ? 
                    Math.round((limit.currentTotal / limit.maxCandidates) * 100) : 0
                  
                  return (
                    <div key={positionId} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <div>
                        <span className="text-sm font-medium text-gray-900">
                          {position.positionName}
                        </span>
                        <span className="text-xs text-gray-500 ml-2">
                          ({limit.currentTotal}/{limit.maxCandidates})
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              percentage >= 100 ? 'bg-red-500' : 
                              percentage >= 80 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          ></div>
                        </div>
                        <span className={`text-xs font-medium ${
                          percentage >= 100 ? 'text-red-600' : 
                          percentage >= 80 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {percentage}%
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </DepartmentalLayout>
  )
}