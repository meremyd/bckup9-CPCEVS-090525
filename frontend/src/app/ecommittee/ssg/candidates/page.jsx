"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { candidatesAPI } from "@/lib/api/candidates"
import { positionsAPI } from "@/lib/api/positions"
import { partylistsAPI } from "@/lib/api/partylists"
import { votersAPI } from "@/lib/api/voters"
import SSGLayout from '@/components/SSGLayout'
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
  Eye
} from "lucide-react"

export default function SSGCandidatesPage() {
  const [ssgCandidates, setSsgCandidates] = useState([])
  const [ssgPositions, setSsgPositions] = useState([])
  const [ssgPartylists, setSsgPartylists] = useState([])
  const [allVoters, setAllVoters] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingCandidate, setEditingCandidate] = useState(null)
  const [formLoading, setFormLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPosition, setFilterPosition] = useState('')
  const [selectedPartylist, setSelectedPartylist] = useState('')
  
  // Position and partylist limits states
  const [positionLimits, setPositionLimits] = useState({})
  const [partylistLimits, setPartylistLimits] = useState({})
  const [checkingEligibility, setCheckingEligibility] = useState(false)
  
  // Voter lookup states
  const [voterSearchId, setVoterSearchId] = useState('')
  const [voterSearchResults, setVoterSearchResults] = useState([])
  const [voterSearchLoading, setVoterSearchLoading] = useState(false)
  const [selectedVoter, setSelectedVoter] = useState(null)
  const [showVoterDropdown, setShowVoterDropdown] = useState(false)
  
  const [candidateStats, setCandidateStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    byPosition: {},
    byPartylist: {}
  })
  
  const [formData, setFormData] = useState({
    voterId: '',
    positionId: '',
    partylistId: '',
    candidateNumber: '',
    credentials: '',
    campaignPicture: '',
    isActive: true
  })

  const router = useRouter()
  const searchParams = useSearchParams()
  const ssgElectionId = searchParams.get('ssgElectionId')

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

  // Calculate candidate statistics with proper counting
  const calculateCandidateStats = (candidates, positions, partylists) => {
    const stats = {
      total: candidates.length,
      active: 0,
      inactive: 0,
      byPosition: {},
      byPartylist: {}
    }

    // Initialize position counts
    positions.forEach(position => {
      stats.byPosition[position._id] = {
        name: position.positionName,
        count: 0,
        maxCandidates: position.maxCandidates || 10,
        maxCandidatesPerPartylist: position.maxCandidatesPerPartylist || 1
      }
    })

    // Initialize partylist counts
    partylists.forEach(partylist => {
      stats.byPartylist[partylist._id] = {
        name: partylist.partylistName,
        count: 0
      }
    })

    // Initialize independent count
    stats.byPartylist['independent'] = {
      name: 'Independent',
      count: 0
    }

    candidates.forEach(candidate => {
      // Count active/inactive
      if (candidate.isActive !== false) {
        stats.active++
      } else {
        stats.inactive++
      }

      // Count by position - use proper ID extraction
      const positionId = candidate.positionId?._id || candidate.positionId
      if (positionId && stats.byPosition[positionId]) {
        stats.byPosition[positionId].count++
      }

      // Count by partylist - handle independents
      const partylistId = candidate.partylistId?._id || candidate.partylistId
      if (partylistId && stats.byPartylist[partylistId]) {
        stats.byPartylist[partylistId].count++
      } else {
        // Independent candidate
        stats.byPartylist['independent'].count++
      }
    })

    return stats
  }

  // Calculate position limits based on existing candidates and max limits
  const calculatePositionLimits = (candidates, positions, partylists) => {
    const limits = {}
    
    positions.forEach(position => {
      limits[position._id] = {
        maxCandidates: position.maxCandidates || 10,
        maxCandidatesPerPartylist: position.maxCandidatesPerPartylist || 1,
        currentTotal: 0,
        byPartylist: {},
        canAddMore: true
      }
      
      // Initialize partylist counts for this position
      partylists.forEach(partylist => {
        limits[position._id].byPartylist[partylist._id] = {
          current: 0,
          max: position.maxCandidatesPerPartylist || 1,
          canAddMore: true
        }
      })
      
      // Initialize independent count
      limits[position._id].byPartylist['independent'] = {
        current: 0,
        max: position.maxCandidatesPerPartylist || 1,
        canAddMore: true
      }
    })
    
    // Count existing candidates
    candidates.forEach(candidate => {
      const positionId = candidate.positionId?._id || candidate.positionId
      const partylistId = candidate.partylistId?._id || candidate.partylistId || 'independent'
      
      if (limits[positionId]) {
        limits[positionId].currentTotal++
        
        if (limits[positionId].byPartylist[partylistId]) {
          limits[positionId].byPartylist[partylistId].current++
        }
      }
    })
    
    // Update canAddMore flags
    Object.keys(limits).forEach(positionId => {
      const positionLimit = limits[positionId]
      
      // Check overall position limit
      positionLimit.canAddMore = positionLimit.currentTotal < positionLimit.maxCandidates
      
      // Check partylist limits
      Object.keys(positionLimit.byPartylist).forEach(partylistId => {
        const partylistLimit = positionLimit.byPartylist[partylistId]
        partylistLimit.canAddMore = partylistLimit.current < partylistLimit.max
      })
    })
    
    return limits
  }

  // Calculate partylist limits across all positions
  const calculatePartylistLimits = (candidates, positions, partylists) => {
    const limits = {}
    
    partylists.forEach(partylist => {
      limits[partylist._id] = {
        totalCandidates: 0,
        byPosition: {},
        canParticipate: true
      }
      
      positions.forEach(position => {
        limits[partylist._id].byPosition[position._id] = {
          current: 0,
          max: position.maxCandidatesPerPartylist || 1,
          canAddMore: true
        }
      })
    })
    
    // Add independent tracking
    limits['independent'] = {
      totalCandidates: 0,
      byPosition: {},
      canParticipate: true
    }
    
    positions.forEach(position => {
      limits['independent'].byPosition[position._id] = {
        current: 0,
        max: position.maxCandidatesPerPartylist || 1,
        canAddMore: true
      }
    })
    
    // Count existing candidates
    candidates.forEach(candidate => {
      const positionId = candidate.positionId?._id || candidate.positionId
      const partylistId = candidate.partylistId?._id || candidate.partylistId || 'independent'
      
      if (limits[partylistId]) {
        limits[partylistId].totalCandidates++
        
        if (limits[partylistId].byPosition[positionId]) {
          limits[partylistId].byPosition[positionId].current++
        }
      }
    })
    
    // Update canAddMore flags
    Object.keys(limits).forEach(partylistId => {
      const partylistLimit = limits[partylistId]
      
      Object.keys(partylistLimit.byPosition).forEach(positionId => {
        const positionLimit = partylistLimit.byPosition[positionId]
        positionLimit.canAddMore = positionLimit.current < positionLimit.max
      })
    })
    
    return limits
  }

  useEffect(() => {
    if (ssgElectionId) {
      fetchData()
    } else {
      router.push('/ecommittee/ssg')
    }
  }, [router, ssgElectionId])

  const fetchData = async () => {
    try {
      setLoading(true)
      console.log('Fetching data for SSG election:', ssgElectionId)

      // Use the correct API endpoints based on your controller
      const [candidatesResponse, positionsResponse, partylistsResponse, votersResponse] = await Promise.all([
        candidatesAPI.ssg.getByElection(ssgElectionId, {}),
        positionsAPI.ssg.getByElection(ssgElectionId),
        partylistsAPI.getBySSGElection(ssgElectionId),
        votersAPI.getAll({ limit: 1000 }) // Get ALL registered voters
      ])

      console.log('API Responses received:', {
        candidates: !!candidatesResponse,
        positions: !!positionsResponse,
        partylists: !!partylistsResponse,
        voters: !!votersResponse
      })

      // Process API responses based on the controller structure
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

      let partylistsData = []
      if (partylistsResponse?.partylists) {
        partylistsData = partylistsResponse.partylists
      } else if (Array.isArray(partylistsResponse?.data)) {
        partylistsData = partylistsResponse.data
      }

      let votersData = []
      if (votersResponse?.data?.voters) {
        votersData = votersResponse.data.voters
      } else if (Array.isArray(votersResponse?.data)) {
        votersData = votersResponse.data
      }

      console.log('Data counts:', {
        candidates: candidatesData.length,
        positions: positionsData.length,
        partylists: partylistsData.length,
        voters: votersData.length
      })

      // Process candidates data with enhanced normalization
      const processedCandidates = candidatesData.map((candidate, index) => {
        const processedCandidate = {
          _id: candidate._id ,
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
            isRegistered: candidate.voterId.isRegistered || false
          } : null,
          
          // Position information
          positionId: candidate.positionId?._id || candidate.positionId,
          positionInfo: candidate.positionId ? {
            _id: candidate.positionId._id || candidate.positionId,
            positionName: candidate.positionId.positionName || 'Unknown Position',
            positionOrder: candidate.positionId.positionOrder || 999
          } : null,
          
          // Partylist information (can be null for independents)
          partylistId: candidate.partylistId?._id || candidate.partylistId || null,
          partylistInfo: candidate.partylistId ? {
            _id: candidate.partylistId._id || candidate.partylistId,
            partylistName: candidate.partylistId.partylistName || 'Independent'
          } : null,
          
          // Campaign picture and credentials (both now images)
          campaignPicture: candidate.campaignPicture || null,
          hasCampaignPicture: !!candidate.campaignPicture,
          credentials: candidate.credentials || null,
          hasCredentials: !!candidate.credentials
        }

        // Add computed fields
        processedCandidate.fullName = processedCandidate.voterInfo ? 
          `${processedCandidate.voterInfo.firstName} ${processedCandidate.voterInfo.middleName} ${processedCandidate.voterInfo.lastName}`.replace(/\s+/g, ' ').trim() :
          'Unknown'
        
        processedCandidate.position = processedCandidate.positionInfo?.positionName || 'Unknown Position'
        processedCandidate.positionOrder = processedCandidate.positionInfo?.positionOrder || 999
        processedCandidate.partylist = processedCandidate.partylistInfo?.partylistName || 'Independent'
        processedCandidate.schoolId = processedCandidate.voterInfo?.schoolId || 'N/A'
        processedCandidate.yearLevel = processedCandidate.voterInfo?.yearLevel || 'N/A'
        processedCandidate.department = processedCandidate.voterInfo?.departmentId?.departmentCode || 'Unknown'
        processedCandidate.isRegistered = processedCandidate.voterInfo?.isRegistered || false

        return processedCandidate
      })

      // Process positions with candidate counts and limits
      const processedPositions = positionsData.map((position, index) => ({
        ...position,
        _id: position._id || `position-${index}`,
        positionName: position.positionName || 'Unknown Position',
        positionOrder: position.positionOrder || 999,
        maxCandidates: position.maxCandidates || 10,
        maxCandidatesPerPartylist: position.maxCandidatesPerPartylist || 1,
        candidateCount: processedCandidates.filter(c => 
          (c.positionId === position._id || c.positionId?._id === position._id)
        ).length
      }))

      // Process partylists with candidate counts
      const processedPartylists = partylistsData.map((partylist, index) => ({
        ...partylist,
        _id: partylist._id || `partylist-${index}`,
        partylistName: partylist.partylistName || 'Unknown Partylist',
        description: partylist.description || '',
        candidateCount: processedCandidates.filter(c => 
          (c.partylistId === partylist._id || c.partylistId?._id === partylist._id)
        ).length
      }))

      // Process voters - filter for registered voters
      const processedVoters = votersData
        .map((voter, index) => ({
          ...voter,
          _id: voter._id || `voter-${index}`,
          fullName: voter.fullName || 
                   `${voter.firstName || ''} ${voter.middleName || ''} ${voter.lastName || ''}`.replace(/\s+/g, ' ').trim(),
          schoolId: voter.schoolId || 'N/A',
          departmentId: voter.departmentId || null,
          yearLevel: voter.yearLevel || 'N/A',
          isRegistered: voter.isRegistered || false
        }))

      console.log('Processed data:', {
        candidates: processedCandidates.length,
        positions: processedPositions.length,
        partylists: processedPartylists.length,
        voters: processedVoters.length
      })

      // Update state
      setSsgCandidates(processedCandidates)
      setSsgPositions(processedPositions)
      setSsgPartylists(processedPartylists)
      setAllVoters(processedVoters)
      
      // Calculate stats and limits with processed data
      setCandidateStats(calculateCandidateStats(processedCandidates, processedPositions, processedPartylists))
      setPositionLimits(calculatePositionLimits(processedCandidates, processedPositions, processedPartylists))
      setPartylistLimits(calculatePartylistLimits(processedCandidates, processedPositions, processedPartylists))

    } catch (error) {
      console.error("Error in fetchData:", error)
      showErrorAlert(error)
      
      // Reset to empty states on error
      setSsgCandidates([])
      setSsgPositions([])
      setSsgPartylists([])
      setAllVoters([])
      setCandidateStats({
        total: 0,
        active: 0,
        inactive: 0,
        byPosition: {},
        byPartylist: {}
      })
      setPositionLimits({})
      setPartylistLimits({})
    } finally {
      setLoading(false)
    }
  }

  // Enhanced voter search with eligibility checking
  const searchVoters = async (searchValue) => {
    if (!searchValue.trim()) {
      setVoterSearchResults([])
      setShowVoterDropdown(false)
      return
    }

    setVoterSearchLoading(true)
    
    try {
      const searchTerm = searchValue.toLowerCase()
      
      // Filter ALL voters (removed isRegistered filter)
      const filteredVoters = allVoters.filter(voter => {
        const matchesSchoolId = voter.schoolId?.toString().toLowerCase().includes(searchTerm)
        const matchesName = voter.fullName?.toLowerCase().includes(searchTerm) ||
                           voter.firstName?.toLowerCase().includes(searchTerm) ||
                           voter.lastName?.toLowerCase().includes(searchTerm)
        
        return matchesSchoolId || matchesName
      }).filter(voter => {
        // Exclude voters who are already candidates in this SSG election (unless editing)
        if (editingCandidate && editingCandidate.voterId === voter._id) {
          return true // Allow current candidate when editing
        }
        
        return !ssgCandidates.some(candidate => 
          candidate.voterId === voter._id || candidate.voterId?._id === voter._id
        )
      })
      
      // Sort by name
      const sortedVoters = filteredVoters.sort((a, b) => 
        a.fullName.localeCompare(b.fullName)
      )
      
      setVoterSearchResults(sortedVoters.slice(0, 15)) // Show top 15 results
      setShowVoterDropdown(true)
    } catch (error) {
      console.error('Error searching voters:', error)
      setVoterSearchResults([])
    } finally {
      setVoterSearchLoading(false)
    }
  }

  const selectVoter = async (voter) => {
    try {
      setCheckingEligibility(true)
      
      // Check if voter is already a candidate in this SSG election (unless editing)
      if (!editingCandidate || editingCandidate.voterId !== voter._id) {
        const existingCandidate = ssgCandidates.find(candidate => 
          candidate.voterId === voter._id || candidate.voterId?._id === voter._id
        )
        
        if (existingCandidate) {
          Swal.fire({
            icon: 'error',
            title: 'Voter Already a Candidate',
            text: `${voter.fullName} is already a candidate for ${existingCandidate.position} in this SSG election.`,
            confirmButtonColor: '#001f65'
          })
          return
        }
      }

      setSelectedVoter(voter)
      setVoterSearchId(voter.fullName)
      setFormData(prev => ({ ...prev, voterId: voter._id }))
      setShowVoterDropdown(false)
      setVoterSearchResults([])
    } catch (error) {
      console.error('Error selecting voter:', error)
      showErrorAlert(error)
    } finally {
      setCheckingEligibility(false)
    }
  }

  // Enhanced Position Filter Dropdown with candidate counts and limits
  const PositionFilterDropdown = () => {
    return (
      <select
        value={filterPosition}
        onChange={(e) => setFilterPosition(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent"
      >
        <option value="">All Positions ({candidateStats.total})</option>
        {ssgPositions.map(position => {
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

  // Handle image upload for both campaign picture and credentials
  const handleImageUpload = (e, fieldName) => {
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

    // Validate file type - allow images for both campaign picture and credentials
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
        setFormData(prev => ({ ...prev, [fieldName]: reader.result }))
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
      partylistId: '',
      candidateNumber: '',
      credentials: '',
      campaignPicture: '',
      isActive: true
    })
    setVoterSearchId('')
    setSelectedVoter(null)
    setVoterSearchResults([])
    setShowVoterDropdown(false)
  }

  const handleEditCandidate = (candidate) => {
    setEditingCandidate(candidate)
    setShowAddForm(true)
    
    // Prepare image data URLs for existing images
    const campaignPictureData = candidate.campaignPicture ? 
      (candidate.campaignPicture.startsWith('data:') ? 
        candidate.campaignPicture : 
        `data:image/jpeg;base64,${candidate.campaignPicture}`) : ''
    
    const credentialsData = candidate.credentials ? 
      (candidate.credentials.startsWith('data:') ? 
        candidate.credentials : 
        `data:image/jpeg;base64,${candidate.credentials}`) : ''
    
    setFormData({
      voterId: candidate.voterId?._id || candidate.voterId || '',
      positionId: candidate.positionId?._id || candidate.positionId || '',
      partylistId: candidate.partylistId?._id || candidate.partylistId || '',
      candidateNumber: candidate.candidateNumber || '',
      credentials: credentialsData,
      campaignPicture: campaignPictureData,
      isActive: candidate.isActive !== false
    })
    
    // Set voter data for editing
    if (candidate.voterInfo) {
      setVoterSearchId(candidate.fullName || '')
      setSelectedVoter({
        _id: candidate.voterInfo._id || candidate.voterId,
        fullName: candidate.fullName || '',
        schoolId: candidate.voterInfo.schoolId || '',
        departmentId: candidate.voterInfo.departmentId || null,
        yearLevel: candidate.voterInfo.yearLevel || '',
        isRegistered: candidate.voterInfo.isRegistered || false
      })
    }
    setVoterSearchResults([])
    setShowVoterDropdown(false)
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
        await candidatesAPI.ssg.delete(candidateId)
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
    
    if (!selectedVoter) {
      errors.push('Please select a voter.')
    } else {
      // Check if voter is already a candidate (except when editing)
      const existingCandidate = ssgCandidates.find(candidate => 
        (candidate.voterId === selectedVoter._id || candidate.voterId?._id === selectedVoter._id) &&
        (!editingCandidate || candidate._id !== editingCandidate._id)
      )
      
      if (existingCandidate) {
        errors.push(`${selectedVoter.fullName} is already a candidate for ${existingCandidate.position} in this SSG election.`)
      }
    }

    if (!formData.positionId) {
      errors.push('Please select a position.')
    }

    // Enhanced position and partylist limit validation
    if (formData.positionId && formData.partylistId) {
      const positionLimit = positionLimits[formData.positionId]
      const partylistKey = formData.partylistId || 'independent'
      
      if (positionLimit && positionLimit.byPartylist[partylistKey]) {
        const partylistLimit = positionLimit.byPartylist[partylistKey]
        
        // Check if adding a new candidate or if editing candidate changed position/partylist
        let shouldCheckLimit = true
        if (editingCandidate) {
          const currentPositionId = editingCandidate.positionId?._id || editingCandidate.positionId
          const currentPartylistId = editingCandidate.partylistId?._id || editingCandidate.partylistId || 'independent'
          
          // Don't check limit if position and partylist haven't changed
          if (currentPositionId === formData.positionId && currentPartylistId === partylistKey) {
            shouldCheckLimit = false
          }
        }
        
        if (shouldCheckLimit && !partylistLimit.canAddMore) {
          const positionName = ssgPositions.find(p => p._id === formData.positionId)?.positionName || 'this position'
          const partylistName = formData.partylistId ? 
            (ssgPartylists.find(p => p._id === formData.partylistId)?.partylistName || 'this partylist') : 
            'independents'
          
          errors.push(`${partylistName} already has the maximum number of candidates (${partylistLimit.max}) for ${positionName}.`)
        }
      }
    }

    // Validate partylist membership across all positions in this election
    if (formData.partylistId && selectedVoter) {
      const existingPartylistCandidate = ssgCandidates.find(candidate => 
        (candidate.voterId === selectedVoter._id || candidate.voterId?._id === selectedVoter._id) &&
        candidate.partylistId && 
        candidate.partylistId !== formData.partylistId &&
        candidate.partylistId?._id !== formData.partylistId &&
        (!editingCandidate || candidate._id !== editingCandidate._id)
      )
      
      if (existingPartylistCandidate) {
        const partylistName = ssgPartylists.find(p => 
          p._id === existingPartylistCandidate.partylistId || 
          p._id === existingPartylistCandidate.partylistId?._id
        )?.partylistName || 'another partylist'
        
        errors.push(`${selectedVoter.fullName} is already a member of ${partylistName} in this SSG election.`)
      }
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
    // Remove campaignPicture from main submission
    const submitData = {
      ...formData,
      ssgElectionId: ssgElectionId
    };
    delete submitData.campaignPicture;

    // Convert credentials (if present) to base64 for API submission
    if (submitData.credentials && submitData.credentials.startsWith('data:')) {
      submitData.credentials = submitData.credentials.split(',')[1];
    }

    // Remove empty partylistId to make candidate independent
    if (!submitData.partylistId) {
      delete submitData.partylistId;
    }

    let candidateId;

    if (editingCandidate) {
      // Update candidate
      await candidatesAPI.ssg.update(editingCandidate._id, submitData);
      candidateId = editingCandidate._id;
      showSuccessAlert('Candidate updated successfully!');
    } else {
      // Create candidate
      const response = await candidatesAPI.ssg.create(submitData);
      // Adjust this according to your API response structure
      candidateId = response?.data?.data?._id || response?.data?._id || response?._id;
      showSuccessAlert('Candidate added successfully!');
    }

    // Upload campaign picture if present and is a data URL
    if (formData.campaignPicture && formData.campaignPicture.startsWith('data:')) {
      await candidatesAPI.uploadCampaignPicture(candidateId, formData.campaignPicture);
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

  // Enhanced filtering with proper ID matching
  const filteredCandidates = ssgCandidates.filter(candidate => {
    // Search filter
    const matchesSearch = searchTerm === '' || 
      candidate.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.schoolId?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.position?.toLowerCase().includes(searchTerm.toLowerCase())

    // Position filter
    const matchesPosition = filterPosition === '' || 
      candidate.positionId === filterPosition ||
      candidate.positionId?._id === filterPosition

    // Partylist filter
    const matchesPartylist = selectedPartylist === '' || 
      (selectedPartylist === 'independent' ? 
        (!candidate.partylistId) : 
        (candidate.partylistId === selectedPartylist || 
         candidate.partylistId?._id === selectedPartylist))

    return matchesSearch && matchesPosition && matchesPartylist
  })

  // Get position options with availability status
  const getPositionOptions = () => {
    return ssgPositions.map(position => {
      const positionLimit = positionLimits[position._id]
      const selectedPartylistKey = formData.partylistId || 'independent'
      
      let isDisabled = false
      let reasonText = ''
      
      if (positionLimit) {
        // Check overall position limit
        if (!positionLimit.canAddMore) {
          isDisabled = true
          reasonText = ` - Position Full (${positionLimit.currentTotal}/${positionLimit.maxCandidates})`
        }
        // Check partylist limit for this position
        else if (formData.partylistId && positionLimit.byPartylist[selectedPartylistKey] && !positionLimit.byPartylist[selectedPartylistKey].canAddMore) {
          isDisabled = true
          const partylistName = formData.partylistId ? 
            (ssgPartylists.find(p => p._id === formData.partylistId)?.partylistName || 'Partylist') :
            'Independent'
          reasonText = ` - ${partylistName} Full (${positionLimit.byPartylist[selectedPartylistKey].current}/${positionLimit.byPartylist[selectedPartylistKey].max})`
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

  // Get partylist options with availability status
  const getPartylistOptions = () => {
    const options = [
      {
        _id: '',
        partylistName: 'Independent',
        isDisabled: false,
        displayText: 'Independent',
        candidateCount: candidateStats.byPartylist['independent']?.count || 0
      }
    ]
    
    ssgPartylists.forEach(partylist => {
      const partylistLimit = partylistLimits[partylist._id]
      let isDisabled = false
      let reasonText = ''
      
      if (formData.positionId && partylistLimit) {
        const positionLimit = partylistLimit.byPosition[formData.positionId]
        
        if (positionLimit && !positionLimit.canAddMore) {
          isDisabled = true
          const positionName = ssgPositions.find(p => p._id === formData.positionId)?.positionName || 'position'
          reasonText = ` - Full for ${positionName} (${positionLimit.current}/${positionLimit.max})`
        }
      }
      
      // Don't disable if editing and current partylist
      if (editingCandidate && (editingCandidate.partylistId === partylist._id || editingCandidate.partylistId?._id === partylist._id)) {
        isDisabled = false
        reasonText = ''
      }
      
      options.push({
        ...partylist,
        isDisabled,
        displayText: `${partylist.partylistName}${reasonText}`,
        candidateCount: candidateStats.byPartylist[partylist._id]?.count || 0
      })
    })
    
    return options
  }

  const handleCampaignPicturePreview = async (candidate) => {
  try {
    const blob = await candidatesAPI.getCampaignPicture(candidate._id);
    console.log('Blob:', blob);
    console.log('Blob type:', blob.type);
    console.log('Blob size:', blob.size);

    // Try to display the blob in a new tab to test
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank'); // This will open the image in a new tab

    Swal.fire({
      title: `${candidate.fullName} - Campaign Picture`,
      imageUrl: url,
      imageAlt: `${candidate.fullName} Campaign Picture`,
      showCloseButton: true,
      showConfirmButton: false,
      width: 'auto',
      customClass: {
        popup: 'max-w-4xl',
        image: 'max-h-96 w-auto object-contain'
      },
      didClose: () => {
        URL.revokeObjectURL(url); // Clean up
      }
    });
  } catch (error) {
    Swal.fire({
      icon: 'info',
      title: 'No Image Available',
      text: `No campaign picture has been uploaded for ${candidate.fullName}.`,
      confirmButtonColor: '#001f65'
    });
  }
};

  // Handle image preview and view - Updated for both campaign picture and credentials
  const handleImageView = (candidate, imageType) => {
  const imageData = imageType === 'campaign' ? candidate.campaignPicture : candidate.credentials
  const title = imageType === 'campaign' ? 'Campaign Picture' : 'Credentials'
  
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
      title: `${candidate.fullName} - ${title}`,
      imageUrl: imageUrl,
      imageAlt: `${candidate.fullName} ${title}`,
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
      text: `No ${title.toLowerCase()} has been uploaded for ${candidate.fullName}.`,
      confirmButtonColor: '#001f65'
    })
  }
}
  if (loading) {
    return (
      <SSGLayout 
        ssgElectionId={ssgElectionId}
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
      </SSGLayout>
    )
  }

  return (
    <SSGLayout 
      ssgElectionId={ssgElectionId}
      title="Candidates Management"
      subtitle={`Managing ${candidateStats.total} candidates in this election`}
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
                  {/* Enhanced Voter Search with Registration Status */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search and Select Voter *
                    </label>
                    <div className="relative">
                      <input
                         type="text"
                         value={voterSearchId}
                         onChange={(e) => {
                            setVoterSearchId(e.target.value)
                            // Debounce the search call
                            clearTimeout(window.voterSearchTimeout)
                            window.voterSearchTimeout = setTimeout(() => {
                              searchVoters(e.target.value)
                            }, 300)
                          }}
                          placeholder="Type student name or school ID (all voters)..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                          onFocus={() => {
                            if (voterSearchResults.length > 0) {
                              setShowVoterDropdown(true)
                            }
                          }}
                        />
                      {(voterSearchLoading || checkingEligibility) && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <Loader2 className="animate-spin h-4 w-4 text-gray-400" />
                        </div>
                      )}
                      
                      {/* Enhanced Dropdown with eligibility indicators */}
                      {showVoterDropdown && voterSearchResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {voterSearchResults.map((voter) => {
                            // Check if voter is already a candidate
                            const isAlreadyCandidate = ssgCandidates.some(candidate => 
                              (candidate.voterId === voter._id || candidate.voterId?._id === voter._id) &&
                              (!editingCandidate || candidate._id !== editingCandidate._id)
                            )
                            
                            return (
                              <button
                                key={voter._id}
                                type="button"
                                onClick={() => selectVoter(voter)}
                                disabled={isAlreadyCandidate}
                                className={`w-full px-3 py-2 text-left border-b border-gray-100 last:border-b-0 ${
                                  isAlreadyCandidate 
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                    : 'hover:bg-blue-50 focus:bg-blue-50'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-medium text-gray-900">{voter.fullName}</div>
                                    <div className="text-sm text-gray-500">
                                      ID: {voter.schoolId} • {voter.departmentId?.departmentCode || 'N/A'}
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    {voter.isRegistered && (
                                      <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                                        Registered
                                      </span>
                                    )}
                                    {!voter.isRegistered && (
                                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                                        Not Registered
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
                    
                    {/* Selected voter display with validation status */}
                    {selectedVoter && (
                      <div className={`mt-2 p-3 border rounded-lg ${
                        selectedVoter.isRegistered ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'
                      }`}>
                        <div className="flex items-center">
                          <UserCheck className={`w-4 h-4 mr-2 ${
                            selectedVoter.isRegistered ? 'text-green-600' : 'text-blue-600'
                          }`} />
                          <div className="text-sm">
                            <p className={`font-medium ${
                              selectedVoter.isRegistered ? 'text-green-800' : 'text-blue-800'
                            }`}>
                              {selectedVoter.fullName}
                            </p>
                            <p className={selectedVoter.isRegistered ? 'text-green-600' : 'text-blue-600'}>
                              ID: {selectedVoter.schoolId} • {selectedVoter.departmentId?.departmentCode || 'N/A'} - Year {selectedVoter.yearLevel}
                            </p>
                            {selectedVoter.isRegistered ? (
                              <p className="text-green-700 text-xs mt-1">
                                ✓ Registered voter
                              </p>
                            ) : (
                              <p className="text-blue-700 text-xs mt-1">
                                ℹ️ Not registered 
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Enhanced Position Selection with Limits */}
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

                  {/* Enhanced Partylist Selection with Limits */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Partylist (Optional)
                    </label>
                    <select
                      value={formData.partylistId}
                      onChange={(e) => setFormData(prev => ({ ...prev, partylistId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {getPartylistOptions().map(partylist => (
                        <option 
                          key={partylist._id || 'independent'} 
                          value={partylist._id}
                          disabled={partylist.isDisabled}
                          className={partylist.isDisabled ? 'text-gray-400 bg-gray-100' : ''}
                        >
                          {partylist.displayText}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
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
                        onChange={(e) => handleImageUpload(e, 'campaignPicture')}
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

                  {/* Credentials Upload - Now Image with Preview */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Credentials Image (Optional)
                    </label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="file"
                        id="credentials"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'credentials')}
                        className="hidden"
                      />
                      <label
                        htmlFor="credentials"
                        className="flex items-center px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <Upload className="w-4 h-4 mr-2 text-gray-600" />
                        Choose Image
                      </label>
                      {formData.credentials && (
                        <div className="flex items-center text-sm text-green-600">
                          <FileText className="w-4 h-4 mr-1" />
                          Image uploaded
                        </div>
                      )}
                      {editingCandidate?.credentials && !formData.credentials && (
                        <div className="flex items-center text-sm text-blue-600">
                          <FileText className="w-4 h-4 mr-1" />
                          Current credentials available
                        </div>
                      )}
                    </div>
                    {formData.credentials && (
                      <div className="mt-2">
                        <img
                          src={formData.credentials}
                          alt="Credentials preview"
                          className="w-20 h-20 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => {
                            Swal.fire({
                              title: 'Credentials Preview',
                              imageUrl: formData.credentials,
                              imageAlt: 'Credentials preview',
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
                      Maximum file size: 2MB. Upload credentials document as image (JPG, PNG, GIF). Click image to preview.
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
                    disabled={formLoading || !selectedVoter || checkingEligibility}
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


      {(ssgPartylists.length > 0 || (candidateStats.byPartylist['independent']?.count > 0)) && (
  <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 mb-6">
    <h3 className="text-lg font-semibold text-[#001f65] mb-4">Filter by Partylist</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {/* All Candidates Card */}
      <div 
        onClick={() => setSelectedPartylist('')}
        className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
          selectedPartylist === '' 
            ? 'border-[#001f65] bg-[#001f65] text-white shadow-lg' 
            : 'border-gray-200 bg-white hover:border-[#001f65] hover:shadow-md'
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h4 className={`font-semibold ${selectedPartylist === '' ? 'text-white' : 'text-gray-800'}`}>
              All Candidates
            </h4>
            <p className={`text-sm ${selectedPartylist === '' ? 'text-blue-100' : 'text-gray-600'}`}>
              View all candidates
            </p>
          </div>
          <div className={`text-2xl font-bold ${selectedPartylist === '' ? 'text-white' : 'text-[#001f65]'}`}>
            {candidateStats.total}
          </div>
        </div>
      </div>

      {/* Independent Candidates Card - Only show if there are independent candidates */}
      {candidateStats.byPartylist['independent']?.count > 0 && (
        <div 
          onClick={() => setSelectedPartylist('independent')}
          className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
            selectedPartylist === 'independent' 
              ? 'border-gray-600 bg-gray-600 text-white shadow-lg' 
              : 'border-gray-200 bg-white hover:border-gray-600 hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className={`font-semibold ${selectedPartylist === 'independent' ? 'text-white' : 'text-gray-800'}`}>
                Independent
              </h4>
              <p className={`text-sm ${selectedPartylist === 'independent' ? 'text-gray-100' : 'text-gray-600'}`}>
                No partylist affiliation
              </p>
            </div>
            <div className={`text-2xl font-bold ${selectedPartylist === 'independent' ? 'text-white' : 'text-gray-600'}`}>
              {candidateStats.byPartylist['independent']?.count || 0}
            </div>
          </div>
        </div>
      )}

      {/* Partylist Cards with accurate candidate counts */}
      {ssgPartylists.map(partylist => {
        const candidateCount = candidateStats.byPartylist[partylist._id]?.count || 0
        
        return (
          <div 
            key={partylist._id}
            onClick={() => setSelectedPartylist(partylist._id)}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
              selectedPartylist === partylist._id 
                ? 'border-blue-500 bg-blue-500 text-white shadow-lg' 
                : 'border-gray-200 bg-white hover:border-blue-500 hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className={`font-semibold ${selectedPartylist === partylist._id ? 'text-white' : 'text-gray-800'}`}>
                  {partylist.partylistName}
                </h4>
                <p className={`text-sm ${selectedPartylist === partylist._id ? 'text-blue-100' : 'text-gray-600'}`}>
                  {partylist.description || 'Political partylist'}
                </p>
              </div>
              <div className={`text-2xl font-bold ${selectedPartylist === partylist._id ? 'text-white' : 'text-blue-500'}`}>
                {candidateCount}
              </div>
            </div>
          </div>
        )
      })}
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
                  ({filteredCandidates.length}{searchTerm || filterPosition || selectedPartylist ? ` of ${candidateStats.total}` : ''})
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
                  Partylist
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Credentials
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
                  <td colSpan="9" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <Users className="w-12 h-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {candidateStats.total === 0 ? 'No candidates found' : 'No matching candidates'}
                      </h3>
                      <p className="text-gray-500 mb-4">
                        {candidateStats.total === 0 ? 
                          'Get started by adding the first candidate for this election.' :
                          searchTerm || filterPosition || selectedPartylist ? 
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
                      {candidateStats.total > 0 && (searchTerm || filterPosition || selectedPartylist) && (
                        <button
                          onClick={() => {
                            setSearchTerm('')
                            setFilterPosition('')
                            setSelectedPartylist('')
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
                      <td className="px-6 py-4 whitespace-nowrap">
  <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
    {candidate.campaignPicture ? (
      <img
        src={candidate.campaignPicture.startsWith('data:') ? 
          candidate.campaignPicture : 
          `data:image/jpeg;base64,${candidate.campaignPicture}`}
        alt={`${candidate.fullName} Campaign Picture`}
        className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => handleImageView(candidate, 'campaign')}
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

                      {/* Candidate Info Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {candidate.fullName}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            ID: {candidate.schoolId}
                            {candidate.isRegistered && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
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

                      {/* Partylist Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          candidate.partylist && candidate.partylist !== 'Independent'
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {candidate.partylist}
                        </span>
                      </td>

                      {/* Number Column */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {candidate.candidateNumber}
                      </td>

                      {/* Credentials Column - Enhanced like Platform */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                          {candidate.credentials ? (
                            <img
                              src={candidate.credentials.startsWith('data:') ? 
                                candidate.credentials : 
                                `data:image/jpeg;base64,${candidate.credentials}`}
                              alt={`${candidate.fullName} Credentials`}
                              className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => handleImageView(candidate, 'credentials')}
                              title="Click to view credentials"
                            />
                          ) : (
                            <FileText className="w-5 h-5 text-gray-400" />
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
      </div>
    </SSGLayout>
  )
}