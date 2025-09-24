"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { candidatesAPI } from "@/lib/api/candidates"
import { positionsAPI } from "@/lib/api/positions"
import { votersAPI } from "@/lib/api/voters"
import { departmentalElectionsAPI } from "@/lib/api/departmentalElections"
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
  Download,
  Eye
} from "lucide-react"

export default function DepartmentalCandidatesPage() {
  const [deptCandidates, setDeptCandidates] = useState([])
  const [deptPositions, setDeptPositions] = useState([])
  const [eligibleOfficers, setEligibleOfficers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingCandidate, setEditingCandidate] = useState(null)
  const [formLoading, setFormLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPosition, setFilterPosition] = useState('')
  const [election, setElection] = useState(null)
  
  // Officer search states
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

  // Calculate candidate statistics
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
      console.log('Fetching data for departmental election:', deptElectionId)

      // Fetch election details first
      const electionResponse = await departmentalElectionsAPI.getById(deptElectionId)
      const electionData = electionResponse.election || electionResponse.data
      setElection(electionData)

      // Use the correct API endpoints
      const [candidatesResponse, positionsResponse] = await Promise.all([
        candidatesAPI.departmental.getByElection(deptElectionId, {}),
        positionsAPI.departmental.getByElection(deptElectionId),
      ])

      // FIXED: Get eligible officers for this election (active class officers from the same department)
      let officersData = []
      if (electionData?.departmentId) {
        try {
          const departmentId = electionData.departmentId._id || electionData.departmentId
          console.log('Fetching officers for department:', departmentId)
          
          // UPDATED: Use the correct API method to get active departmental officers
          const officersResponse = await votersAPI.getActiveOfficers({
            department: departmentId,
            limit: 1000 // Get all officers
          })
          
          // Filter to only include officers from this specific department
          officersData = (officersResponse.data || []).filter(officer => {
            const officerDeptId = officer.departmentId?._id || officer.departmentId
            const electionDeptId = electionData.departmentId._id || electionData.departmentId
            return officerDeptId && officerDeptId.toString() === electionDeptId.toString()
          })
          
          console.log('Officers fetched and filtered:', officersData.length)
        } catch (error) {
          console.error('Error fetching eligible officers:', error)
          console.log('Trying alternative method...')
          
          // Alternative: Try getting by department code if available
          if (electionData.departmentId?.departmentCode) {
            try {
              const officersResponse = await votersAPI.getActiveOfficersByDepartmentCode(electionData.departmentId.departmentCode)
              officersData = officersResponse.data || []
              console.log('Officers fetched by department code:', officersData.length)
            } catch (altError) {
              console.error('Alternative method also failed:', altError)
            }
          }
        }
      }

      console.log('API Responses received:', {
        candidates: !!candidatesResponse,
        positions: !!positionsResponse,
        officers: officersData.length
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

      console.log('Data counts:', {
        candidates: candidatesData.length,
        positions: positionsData.length,
        officers: officersData.length
      })

      // Process candidates data with proper campaign picture handling
      const processedCandidates = candidatesData.map((candidate, index) => {
        const processedCandidate = {
          _id: candidate._id,
          candidateNumber: candidate.candidateNumber || 'N/A',
          isActive: candidate.isActive !== false,
          
          // Voter information
          voterId: candidate.voterId?._id || candidate.voterId,
          voterInfo: candidate.voterId ? {
            _id: candidate.voterId._id || candidate.voterId,
            schoolId: candidate.voterId.schoolId || 'N/A',
            firstName: candidate.voterId.firstName || '',
            middleName: candidate.voterId.middleName || '',
            lastName: candidate.voterId.lastName || '',
            yearLevel: candidate.voterId.yearLevel || 'N/A',
            departmentId: candidate.voterId.departmentId || null,
            isActive: candidate.voterId.isActive || false, // UPDATED: Check isActive instead of isRegistered
            isClassOfficer: candidate.voterId.isClassOfficer || false
          } : null,
          
          // Position information
          positionId: candidate.positionId?._id || candidate.positionId,
          positionInfo: candidate.positionId ? {
            _id: candidate.positionId._id || candidate.positionId,
            positionName: candidate.positionId.positionName || 'Unknown Position',
            positionOrder: candidate.positionId.positionOrder || 999
          } : null,
          
          // FIXED: Campaign picture handling
          campaignPicture: candidate.campaignPicture || null,
          hasCampaignPicture: !!candidate.campaignPicture,
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
        processedCandidate.isActive = processedCandidate.voterInfo?.isActive || false // UPDATED
        processedCandidate.isClassOfficer = processedCandidate.voterInfo?.isClassOfficer || false

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

      // UPDATED: Process officers - only show active class officers
      const processedOfficers = officersData
        .filter(officer => officer.isActive && officer.isClassOfficer) // UPDATED: Removed isRegistered check
        .map((officer, index) => ({
          ...officer,
          _id: officer._id || `officer-${index}`,
          fullName: officer.fullName || 
                   `${officer.firstName || ''} ${officer.middleName || ''} ${officer.lastName || ''}`.replace(/\s+/g, ' ').trim(),
          schoolId: officer.schoolId || 'N/A',
          departmentId: officer.departmentId || null,
          yearLevel: officer.yearLevel || 'N/A'
        }))

      console.log('Processed data:', {
        candidates: processedCandidates.length,
        positions: processedPositions.length,
        officers: processedOfficers.length
      })

      // Update state
      setDeptCandidates(processedCandidates)
      setDeptPositions(processedPositions)
      setEligibleOfficers(processedOfficers)
      
      // Calculate stats
      setCandidateStats(calculateCandidateStats(processedCandidates, processedPositions))

    } catch (error) {
      console.error("Error in fetchData:", error)
      showErrorAlert(error)
      
      // Reset to empty states on error
      setDeptCandidates([])
      setDeptPositions([])
      setEligibleOfficers([])
      setCandidateStats({
        total: 0,
        active: 0,
        inactive: 0,
        byPosition: {}
      })
    } finally {
      setLoading(false)
    }
  }

  // UPDATED: Enhanced officer search - now uses eligibleOfficers correctly
  const searchOfficers = async (searchValue) => {
    if (!searchValue.trim()) {
      setOfficerSearchResults([])
      setShowOfficerDropdown(false)
      return
    }

    setOfficerSearchLoading(true)
    
    try {
      const searchTerm = searchValue.toLowerCase()
      
      // UPDATED: Filter from eligibleOfficers (which are already filtered by department)
      const filteredOfficers = eligibleOfficers.filter(officer => {
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
        
        return !deptCandidates.some(candidate => 
          candidate.voterId === officer._id || candidate.voterId?._id === officer._id
        )
      })
      
      // Sort by name
      const sortedOfficers = filteredOfficers.sort((a, b) => 
        a.fullName.localeCompare(b.fullName)
      )
      
      console.log('Search results for "' + searchTerm + '":', sortedOfficers.length)
      
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
      // Check if officer is already a candidate in this election (unless editing)
      if (!editingCandidate || editingCandidate.voterId !== officer._id) {
        const existingCandidate = deptCandidates.find(candidate => 
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
    }
  }

  // Position Filter Dropdown
  const PositionFilterDropdown = () => {
    return (
      <select
        value={filterPosition}
        onChange={(e) => setFilterPosition(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent"
      >
        <option value="">All Positions ({candidateStats.total})</option>
        {deptPositions.map(position => {
          const candidateCount = candidateStats.byPosition[position._id]?.count || 0
          const maxCandidates = position.maxCandidates || 10
          
          return (
            <option key={position._id} value={position._id}>
              {position.positionName} ({candidateCount}/{maxCandidates})
            </option>
          )
        })}
      </select>
    )
  }

  // UPDATED: Handle image upload for campaign picture with proper base64 conversion
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
        // Store the complete data URL for preview
        setFormData(prev => ({ ...prev, campaignPicture: reader.result }))
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
    
    // FIXED: Prepare image data URL for existing campaign picture with proper preview
    const campaignPictureData = candidate.campaignPicture ? 
      (candidate.campaignPicture.startsWith('data:') ? 
        candidate.campaignPicture : 
        `data:image/jpeg;base64,${candidate.campaignPicture}`) : ''
    
    setFormData({
      voterId: candidate.voterId?._id || candidate.voterId || '',
      positionId: candidate.positionId?._id || candidate.positionId || '',
      candidateNumber: candidate.candidateNumber || '',
      campaignPicture: campaignPictureData,
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
        isActive: candidate.voterInfo.isActive || false, // UPDATED: Use isActive
        isClassOfficer: candidate.voterInfo.isClassOfficer || false
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

  // UPDATED: Enhanced validation - removed registered voter requirement
  const validateForm = () => {
    const errors = []
    
    if (!selectedOfficer) {
      errors.push('Please select an officer.')
    } else {
      // UPDATED: Check if officer is active and class officer
      if (!selectedOfficer.isActive) {
        errors.push('Selected voter must be an active voter.')
      }
      
      if (!selectedOfficer.isClassOfficer) {
        errors.push('Selected voter must be a class officer.')
      }
      
      // Check department match
      if (election && selectedOfficer.departmentId) {
        const officerDeptId = selectedOfficer.departmentId._id || selectedOfficer.departmentId
        const electionDeptId = election.departmentId._id || election.departmentId
        
        if (officerDeptId.toString() !== electionDeptId.toString()) {
          errors.push('Selected officer must belong to the same department as the election.')
        }
      }
      
      // Check if officer is already a candidate (except when editing)
      const existingCandidate = deptCandidates.find(candidate => 
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

    return errors
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    // Enhanced validation
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: validationErrors[0], // Show first error
        confirmButtonColor: '#001f65'
      });
      return;
    }

    setFormLoading(true);

    try {
      // UPDATED: Prepare submit data without campaign picture initially
      const submitData = {
        voterId: formData.voterId,
        positionId: formData.positionId,
        candidateNumber: formData.candidateNumber,
        isActive: formData.isActive,
        deptElectionId: deptElectionId
      };

      // Don't include campaign picture in main submission - handle separately
      let candidateId;

      if (editingCandidate) {
        // Update candidate
        const response = await candidatesAPI.departmental.update(editingCandidate._id, submitData);
        candidateId = editingCandidate._id;
        showSuccessAlert('Candidate updated successfully!');
      } else {
        // Create candidate
        const response = await candidatesAPI.departmental.create(submitData);
        candidateId = response?.data?.data?._id || response?.data?._id || response?._id;
        showSuccessAlert('Candidate added successfully!');
      }

      // UPDATED: Upload campaign picture separately if present and is a data URL
      if (formData.campaignPicture && formData.campaignPicture.startsWith('data:') && candidateId) {
        try {
          await candidatesAPI.uploadCampaignPicture(candidateId, formData.campaignPicture);
          console.log('Campaign picture uploaded successfully');
        } catch (pictureError) {
          console.error('Error uploading campaign picture:', pictureError);
          // Don't fail the whole operation if picture upload fails
        }
      }

      await fetchData(); // Refresh data
      setShowAddForm(false);
    } catch (error) {
      console.error('Error saving candidate:', error);
      showErrorAlert(error);
    } finally {
      setFormLoading(false);
    }
  };

  // Enhanced filtering
  const filteredCandidates = deptCandidates.filter(candidate => {
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

  // FIXED: Handle campaign picture view with proper image URL handling
  const handleCampaignPictureView = (candidate) => {
    const imageData = candidate.campaignPicture
    
    if (imageData) {
      let imageUrl
      
      if (imageData.startsWith('data:')) {
        // Already a proper data URL
        imageUrl = imageData
      } else {
        // Raw base64 data - convert to proper data URL
        imageUrl = `data:image/jpeg;base64,${imageData}`
      }
      
      Swal.fire({
        title: `${candidate.fullName} - Campaign Picture`,
        imageUrl: imageUrl,
        imageAlt: `${candidate.fullName} Campaign Picture`,
        showCloseButton: true,
        showConfirmButton: false,
        width: 'auto',
        customClass: {
          popup: 'max-w-4xl',
          image: 'max-h-96 w-auto object-contain'
        },
        didOpen: () => {
          // Ensure proper image sizing
          const img = document.querySelector('.swal2-image')
          if (img) {
            img.style.maxWidth = '100%'
            img.style.height = 'auto'
            img.style.objectFit = 'contain'
          }
        }
      })
    } else {
      Swal.fire({
        icon: 'info',
        title: 'No Image Available',
        text: `No campaign picture has been uploaded for ${candidate.fullName}.`,
        confirmButtonColor: '#001f65'
      })
    }
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
                  {/* UPDATED: Enhanced Officer Search - removed registration requirement */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search and Select Officer *
                      {eligibleOfficers.length === 0 && (
                        <span className="text-red-500 text-xs ml-2">
                          (No eligible officers found for this department)
                        </span>
                      )}
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
                        placeholder="Type officer name or school ID (active class officers only)..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                        onFocus={() => {
                          if (officerSearchResults.length > 0) {
                            setShowOfficerDropdown(true)
                          }
                        }}
                        disabled={eligibleOfficers.length === 0}
                      />
                      {officerSearchLoading && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <Loader2 className="animate-spin h-4 w-4 text-gray-400" />
                        </div>
                      )}
                      
                      {/* Enhanced Dropdown */}
                      {showOfficerDropdown && officerSearchResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {officerSearchResults.map((officer) => {
                            // Check if officer is already a candidate
                            const isAlreadyCandidate = deptCandidates.some(candidate => 
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
                                      ID: {officer.schoolId} • {officer.departmentId?.departmentCode || 'N/A'} • Year {officer.yearLevel}
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                                      Officer
                                    </span>
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
                    
                    {/* UPDATED: Selected officer display - removed registration requirement */}
                    {selectedOfficer && (
                      <div className="mt-2 p-3 border rounded-lg bg-blue-50 border-blue-200">
                        <div className="flex items-center">
                          <UserCheck className="w-4 h-4 mr-2 text-blue-600" />
                          <div className="text-sm">
                            <p className="font-medium text-blue-800">
                              {selectedOfficer.fullName}
                            </p>
                            <p className="text-blue-600">
                              ID: {selectedOfficer.schoolId} • {selectedOfficer.departmentId?.departmentCode || 'N/A'} - Year {selectedOfficer.yearLevel}
                            </p>
                            <p className="text-blue-700 text-xs mt-1">
                              ✓ Active Class Officer
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Show message when no officers available */}
                    {eligibleOfficers.length === 0 && (
                      <div className="mt-2 p-3 border rounded-lg bg-yellow-50 border-yellow-200">
                        <div className="flex items-center">
                          <AlertCircle className="w-4 h-4 mr-2 text-yellow-600" />
                          <p className="text-sm text-yellow-800">
                            No eligible class officers found for this department. 
                            Make sure officers are active and marked as class officers.
                          </p>
                        </div>
                      </div>
                    )}
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
                      {deptPositions.map(position => (
                        <option key={position._id} value={position._id}>
                          {position.positionName}
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

                  {/* FIXED: Campaign Picture Upload with proper preview */}
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
                      {editingCandidate?.campaignPicture && !formData.campaignPicture && (
                        <div className="flex items-center text-sm text-blue-600">
                          <Image className="w-4 h-4 mr-1" />
                          Current image available
                        </div>
                      )}
                    </div>
                    {/* FIXED: Campaign Picture Preview with proper click handler */}
                    {formData.campaignPicture && (
                      <div className="mt-2">
                        <img
                          src={formData.campaignPicture}
                          alt="Campaign picture preview"
                          className="w-20 h-20 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => {
                            Swal.fire({
                              title: 'Campaign Picture Preview',
                              imageUrl: formData.campaignPicture,
                              imageAlt: 'Campaign picture preview',
                              showCloseButton: true,
                              showConfirmButton: false,
                              width: 'auto',
                              customClass: {
                                popup: 'max-w-4xl',
                                image: 'max-h-96 object-contain'
                              }
                            })
                          }}
                        />
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum file size: 2MB. Supported formats: JPG, PNG, GIF. Click image to preview.
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
                    disabled={formLoading || !selectedOfficer}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {formLoading ? (
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
                Departmental Candidates 
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

          {/* Election Info */}
          {election && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm text-blue-800">
                <strong>Election:</strong> {election.title} • 
                <strong> Department:</strong> {election.departmentId?.departmentCode} - {election.departmentId?.degreeProgram} • 
                <strong> Date:</strong> {new Date(election.electionDate).toLocaleDateString()}
              </div>
            </div>
          )}
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Campaign Picture
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
                  <td colSpan="7" className="px-6 py-12 text-center">
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
                      {/* FIXED: Campaign Picture Column with proper preview */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                          {candidate.campaignPicture ? (
                            <img
                              src={candidate.campaignPicture.startsWith('data:') ? 
                                candidate.campaignPicture : 
                                candidatesAPI.getCampaignPictureUrl(candidate._id)}
                              alt={`${candidate.fullName} Campaign Picture`}
                              className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => handleCampaignPictureView(candidate)}
                              title="Click to view campaign picture"
                              onError={(e) => {
                                // Hide broken image and show placeholder
                                e.target.style.display = 'none'
                                e.target.nextElementSibling.style.display = 'flex'
                              }}
                            />
                          ) : null}
                          <Image 
                            className={`w-5 h-5 text-gray-400 ${candidate.campaignPicture ? 'hidden' : 'flex'}`} 
                          />
                        </div>
                      </td>

                      {/* Candidate Info Column - UPDATED to show officer status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {candidate.fullName}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            ID: {candidate.schoolId}
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Officer
                            </span>
                            {candidate.isActive && (
                              <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Active
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
      </div>
    </DepartmentalLayout>
  )
}