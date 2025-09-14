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
  Image
} from "lucide-react"

export default function SSGCandidatesPage() {
  const [ssgCandidates, setSsgCandidates] = useState([])
  const [ssgPositions, setSsgPositions] = useState([])
  const [ssgPartylists, setSsgPartylists] = useState([])
  const [allVoters, setAllVoters] = useState([]) // Changed from registeredVoters to allVoters
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingCandidate, setEditingCandidate] = useState(null)
  const [formLoading, setFormLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPosition, setFilterPosition] = useState('')
  const [selectedPartylist, setSelectedPartylist] = useState('')
  
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
    platform: '',
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

  // Calculate candidate statistics
  const calculateCandidateStats = (candidates) => {
    const stats = {
      total: candidates.length,
      active: 0,
      inactive: 0,
      byPosition: {},
      byPartylist: {}
    }

    candidates.forEach(candidate => {
      // Count active/inactive
      if (candidate.isActive !== false) {
        stats.active++
      } else {
        stats.inactive++
      }

      // Count by position
      const positionName = candidate.positionId?.positionName || 'Unknown Position'
      stats.byPosition[positionName] = (stats.byPosition[positionName] || 0) + 1

      // Count by partylist
      const partylistName = candidate.partylistId?.partylistName || 'Independent'
      stats.byPartylist[partylistName] = (stats.byPartylist[partylistName] || 0) + 1
    })

    return stats
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

      const [candidatesResponse, positionsResponse, partylistsResponse, votersResponse] = await Promise.all([
        candidatesAPI.ssg.getByElection(ssgElectionId, {}),
        positionsAPI.ssg.getByElection(ssgElectionId),
        partylistsAPI.getBySSGElection(ssgElectionId),
        votersAPI.getAll({ limit: 1000 }) // Changed from getRegistered to getAll
      ])

      console.log('Raw API Responses:')
      console.log('Candidates Response:', candidatesResponse)
      console.log('Positions Response:', positionsResponse)
      console.log('Partylists Response:', partylistsResponse)

      // Extract data based on actual controller response structures
      const candidatesData = candidatesResponse?.data?.candidates || []
      
      // Positions Controller returns: { success: true, data: positions }
      const positionsData = positionsResponse?.data?.data || positionsResponse?.data || []
      
      // Partylists Controller returns: { ssgElection: {...}, partylists: [...] }
      const partylistsData = partylistsResponse?.partylists || []
      
      const votersData = votersResponse?.data?.voters || votersResponse?.data?.data || votersResponse?.data || []

      console.log('Extracted Data Counts:')
      console.log('Candidates:', candidatesData.length)
      console.log('Positions:', positionsData.length)
      console.log('Partylists:', partylistsData.length)
      console.log('All Voters:', votersData.length)

      // Process candidates
      const processedCandidates = candidatesData.map((candidate, index) => {
        const processed = {
          ...candidate,
          _id: candidate._id || candidate.id || `candidate-${ssgElectionId}-${index}`,
          
          fullName: candidate.fullName || 
                   candidate.displayName || 
                   candidate.name || 
                   (candidate.voterId ? `${candidate.voterId.firstName || ''} ${candidate.voterId.middleName || ''} ${candidate.voterId.lastName || ''}`.replace(/\s+/g, ' ').trim() : '') ||
                   'Unknown',
                   
          position: candidate.position || 
                   candidate.positionId?.positionName || 
                   'Unknown Position',
                   
          positionOrder: candidate.positionOrder || 
                        candidate.positionId?.positionOrder || 
                        999,
                        
          partylist: candidate.partylist || 
                    candidate.partylistId?.partylistName || 
                    'Independent',
                    
          department: candidate.department || 
                     candidate.voterId?.departmentId?.departmentCode || 
                     'Unknown',
                     
          schoolId: candidate.schoolId || 
                   candidate.voterId?.schoolId || 
                   'N/A',
                   
          yearLevel: candidate.yearLevel || 
                    candidate.voterId?.yearLevel || 
                    'N/A',
          
          electionType: 'ssg',
          isActive: candidate.isActive !== false,
          candidateNumber: candidate.candidateNumber || 'N/A',
          platform: candidate.platform || 'No platform provided',
          hasCampaignPicture: !!candidate.campaignPicture
        }
        
        return processed
      })

      // Process positions WITH candidate counts
      const processedPositions = positionsData.map((position, index) => ({
        ...position,
        _id: position._id || position.id || `position-${ssgElectionId}-${index}`,
        // Include candidate counts from aggregation
        candidateCount: position.candidateCount || 0,
        activeCandidateCount: position.activeCandidateCount || 0
      }))

      // Process SSG-specific partylists
      const processedPartylists = partylistsData.map((partylist, index) => ({
        ...partylist,
        _id: partylist._id || partylist.id || `partylist-${ssgElectionId}-${index}`,
        // Include candidate counts if they exist
        candidateCount: partylist.candidateCount || 0,
        totalVotes: partylist.totalVotes || 0
      }))

      const processedVoters = votersData.map((voter, index) => ({
        ...voter,
        _id: voter._id || voter.id || `voter-${index}`,
        fullName: voter.fullName || `${voter.firstName || ''} ${voter.middleName || ''} ${voter.lastName || ''}`.replace(/\s+/g, ' ').trim() || 'Unknown'
      }))

      console.log('Final Processed Data:')
      console.log('Candidates:', processedCandidates.length, 'items')
      console.log('SSG Positions with counts:', processedPositions.map(p => ({
        name: p.positionName,
        candidateCount: p.candidateCount,
        activeCandidateCount: p.activeCandidateCount
      })))
      console.log('SSG Partylists:', processedPartylists.map(p => ({
        name: p.partylistName,
        candidateCount: p.candidateCount
      })))

      // Update state
      setSsgCandidates(processedCandidates)
      setSsgPositions(processedPositions)
      setSsgPartylists(processedPartylists)
      setAllVoters(processedVoters) // Changed from setRegisteredVoters to setAllVoters
      setCandidateStats(calculateCandidateStats(processedCandidates))
      
      console.log('State updated successfully')
      
    } catch (error) {
      console.error("Detailed error in fetchData:", error)
      console.error("Error response:", error.response?.data)
      console.error("Error status:", error.response?.status)
      showErrorAlert(error)
      
      setSsgCandidates([])
      setSsgPositions([])
      setSsgPartylists([])
      setAllVoters([]) // Changed from setRegisteredVoters
      setCandidateStats({
        total: 0,
        active: 0,
        inactive: 0,
        byPosition: {},
        byPartylist: {}
      })
    } finally {
      setLoading(false)
    }
  }

  // Search voters by school ID or name with debouncing
  const searchVoters = async (searchValue) => {
    if (!searchValue.trim()) {
      setVoterSearchResults([])
      setShowVoterDropdown(false)
      return
    }

    setVoterSearchLoading(true)
    
    try {
      const filteredVoters = allVoters.filter(voter => 
        voter.schoolId?.toString().includes(searchValue.toLowerCase()) ||
        voter.fullName?.toLowerCase().includes(searchValue.toLowerCase())
      )
      
      setVoterSearchResults(filteredVoters.slice(0, 10)) // Limit to 10 results
      setShowVoterDropdown(true)
    } catch (error) {
      console.error('Error searching voters:', error)
      setVoterSearchResults([])
    } finally {
      setVoterSearchLoading(false)
    }
  }

  // Handle voter selection
  const selectVoter = (voter) => {
    setSelectedVoter(voter)
    setVoterSearchId(voter.fullName)
    setFormData(prev => ({ ...prev, voterId: voter._id }))
    setShowVoterDropdown(false)
    setVoterSearchResults([])
  }

  // Updated Position Filter Dropdown - only shows positions for the selected SSG election
  const PositionFilterDropdown = () => (
    <select
      value={filterPosition}
      onChange={(e) => setFilterPosition(e.target.value)}
      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent"
    >
      <option value="">All Positions ({ssgPositions.length})</option>
      {Array.isArray(ssgPositions) && ssgPositions.map(position => {
        // Get the count of candidates for this position in the current election
        const count = ssgCandidates.filter(candidate => 
          candidate.positionId?._id === position._id || candidate.positionId === position._id
        ).length
        return (
          <option key={position._id} value={position._id}>
            {position.positionName} ({count})
          </option>
        )
      })}
    </select>
  )

  // Handle image upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        Swal.fire({
          icon: 'error',
          title: 'File Too Large',
          text: 'Please select an image smaller than 2MB.',
          confirmButtonColor: '#001f65'
        })
        return
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        Swal.fire({
          icon: 'error',
          title: 'Invalid File Type',
          text: 'Please select a valid image file.',
          confirmButtonColor: '#001f65'
        })
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData(prev => ({ 
          ...prev, 
          campaignPicture: reader.result.split(',')[1] // Remove data:image/jpeg;base64, prefix
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAddCandidate = () => {
    setShowAddForm(true)
    setEditingCandidate(null)
    setFormData({
      voterId: '',
      positionId: '',
      partylistId: '',
      candidateNumber: '',
      platform: '',
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
    setFormData({
      voterId: candidate.voterId?._id || '',
      positionId: candidate.positionId?._id || '',
      partylistId: candidate.partylistId?._id || '',
      candidateNumber: candidate.candidateNumber || '',
      platform: candidate.platform || '',
      campaignPicture: candidate.campaignPicture || '',
      isActive: candidate.isActive !== false
    })
    
    // Set voter search data for editing
    if (candidate.voterId) {
      setVoterSearchId(candidate.voterId.fullName || '')
      setSelectedVoter(candidate.voterId)
    } else {
      setVoterSearchId('')
      setSelectedVoter(null)
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
        await fetchData()
        showSuccessAlert('Candidate deleted successfully!')
      } catch (error) {
        console.error('Error deleting candidate:', error)
        showErrorAlert(error)
      }
    }
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    setFormLoading(true)

    try {
      const submitData = {
        ...formData,
        ssgElectionId: ssgElectionId,
        electionType: 'ssg'
      }

      // Remove empty partylistId to make candidate independent
      if (!submitData.partylistId) {
        delete submitData.partylistId
      }

      if (editingCandidate) {
        await candidatesAPI.ssg.update(editingCandidate._id, submitData)
        showSuccessAlert('Candidate updated successfully!')
      } else {
        await candidatesAPI.ssg.create(submitData)
        showSuccessAlert('Candidate added successfully!')
      }

      await fetchData()
      setShowAddForm(false)
    } catch (error) {
      console.error('Error saving candidate:', error)
      showErrorAlert(error)
    } finally {
      setFormLoading(false)
    }
  }

  // Filter candidates based on search, position, and partylist - only for current election
  const filteredCandidates = Array.isArray(ssgCandidates) ? ssgCandidates.filter(candidate => {
    const matchesSearch = searchTerm === '' || 
      candidate.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.voterId?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.voterId?.schoolId?.toString().includes(searchTerm.toLowerCase()) ||
      candidate.platform?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesPosition = filterPosition === '' || 
      candidate.positionId?._id === filterPosition || candidate.positionId === filterPosition

    const matchesPartylist = selectedPartylist === '' || 
      (selectedPartylist === 'independent' ? 
        !candidate.partylistId : 
        (candidate.partylistId?._id === selectedPartylist || candidate.partylistId === selectedPartylist))

    return matchesSearch && matchesPosition && matchesPartylist
  }) : []

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
                  {/* Voter Search with Dropdown */}
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
                        placeholder="Type student name or school ID..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                        onFocus={() => {
                          if (voterSearchResults.length > 0) {
                            setShowVoterDropdown(true)
                          }
                        }}
                      />
                      {voterSearchLoading && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <Loader2 className="animate-spin h-4 w-4 text-gray-400" />
                        </div>
                      )}
                      
                      {/* Dropdown with search results */}
                      {showVoterDropdown && voterSearchResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {voterSearchResults.map((voter) => (
                            <button
                              key={voter._id}
                              type="button"
                              onClick={() => selectVoter(voter)}
                              className="w-full px-3 py-2 text-left hover:bg-blue-50 focus:bg-blue-50 border-b border-gray-100 last:border-b-0"
                            >
                              <div className="font-medium text-gray-900">{voter.fullName}</div>
                              <div className="text-sm text-gray-500">
                                ID: {voter.schoolId} • {voter.departmentId?.departmentCode || 'N/A'}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Selected voter display */}
                    {selectedVoter && (
                      <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center">
                          <UserCheck className="w-4 h-4 text-green-600 mr-2" />
                          <div className="text-sm">
                            <p className="font-medium text-green-800">{selectedVoter.fullName}</p>
                            <p className="text-green-600">
                              ID: {selectedVoter.schoolId} • {selectedVoter.departmentId?.departmentCode || 'N/A'} - Year {selectedVoter.yearLevel}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

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
                      {Array.isArray(ssgPositions) && ssgPositions.map(position => (
                        <option key={position._id} value={position._id}>
                          {position.positionName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Partylist (Optional)
                    </label>
                    <select
                      value={formData.partylistId}
                      onChange={(e) => setFormData(prev => ({ ...prev, partylistId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Independent</option>
                      {Array.isArray(ssgPartylists) && ssgPartylists.map(partylist => (
                        <option key={partylist._id} value={partylist._id}>
                          {partylist.partylistName}
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Platform
                  </label>
                  <textarea
                    value={formData.platform}
                    onChange={(e) => setFormData(prev => ({ ...prev, platform: e.target.value }))}
                    placeholder="Enter candidate's platform..."
                    rows="4"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
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
                    disabled={formLoading || !selectedVoter}
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

      {/* Partylist Filter Cards - Only for current SSG election */}
      {ssgPartylists.length > 0 && (
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

            {/* Independent Candidates Card */}
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
                  {candidateStats.byPartylist['Independent'] || 0}
                </div>
              </div>
            </div>

            {/* Partylist Cards - Only for current election */}
            {ssgPartylists.map(partylist => {
              const candidateCount = ssgCandidates.filter(candidate => 
                candidate.partylistId?._id === partylist._id || candidate.partylistId === partylist._id
              ).length
              
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
                        {partylist.partylistDescription || 'Political partylist'}
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

      {/* Candidates Table */}
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
                  Partylist
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
                  <td colSpan="8" className="px-6 py-12 text-center">
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
                  // Generate a reliable key - use multiple fallbacks
                  const candidateKey = candidate._id || 
                                      candidate.id || 
                                      `${candidate.voterId?._id || candidate.voterId}-${candidate.positionId?._id || candidate.positionId}-${index}` ||
                                      `candidate-${index}`
                  
                  return (
                    <tr key={candidateKey} className="hover:bg-gray-50">
                      {/* Profile Picture Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex-shrink-0 h-12 w-12">
                          {candidate.campaignPicture ? (
                            <img
                              className="h-12 w-12 rounded-full object-cover border-2 border-gray-200"
                              src={`data:image/jpeg;base64,${candidate.campaignPicture}`}
                              alt={candidate.fullName || candidate.voterId?.fullName || 'Candidate'}
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
                            {candidate.fullName || 
                             candidate.displayName || 
                             candidate.voterId?.fullName || 
                             (candidate.voterId ? `${candidate.voterId.firstName || ''} ${candidate.voterId.lastName || ''}`.trim() : '') ||
                             'Unknown Name'}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {candidate.voterId?.schoolId || candidate.schoolId || 'N/A'}
                          </div>
                        </div>
                      </td>

                      {/* Position Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {candidate.positionId?.positionName || candidate.position || 'Unknown Position'}
                        </div>
                      </td>

                      {/* Department Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {candidate.voterId?.departmentId?.departmentCode || 
                           candidate.department || 
                           'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          Year {candidate.voterId?.yearLevel || candidate.yearLevel || 'N/A'}
                        </div>
                      </td>

                      {/* Partylist Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          candidate.partylistId || candidate.partylist 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {candidate.partylistId?.partylistName || 
                           candidate.partylist || 
                           'Independent'}
                        </span>
                      </td>

                      {/* Number Column */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {candidate.candidateNumber || 'N/A'}
                      </td>

                      {/* Status Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          candidate.isActive !== false
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {candidate.isActive !== false ? 'Active' : 'Inactive'}
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
                              candidate._id || candidate.id,
                              candidate.fullName || candidate.displayName || candidate.voterId?.fullName || 'this candidate'
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