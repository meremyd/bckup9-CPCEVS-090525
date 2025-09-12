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
  Info
} from "lucide-react"

export default function SSGCandidatesPage() {
  const [ssgCandidates, setSsgCandidates] = useState([])
  const [ssgPositions, setSsgPositions] = useState([])
  const [ssgPartylists, setSsgPartylists] = useState([])
  const [registeredVoters, setRegisteredVoters] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingCandidate, setEditingCandidate] = useState(null)
  const [formLoading, setFormLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPosition, setFilterPosition] = useState('')
  const [filterPartylist, setFilterPartylist] = useState('')
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
      console.log('Fetching data for SSG Election ID:', ssgElectionId)

      // Fetch candidates using multiple API strategies
      const candidatesData = await fetchCandidatesWithFallback()
      
      // Fetch other data in parallel
      const [positionsResponse, partylistsResponse, votersResponse] = await Promise.allSettled([
        positionsAPI.ssg.getByElection(ssgElectionId),
        partylistsAPI.getBySSGElection(ssgElectionId),
        votersAPI.getRegistered({ limit: 1000 })
      ])

      // Set candidates data and calculate stats
      setSsgCandidates(candidatesData)
      setCandidateStats(calculateCandidateStats(candidatesData))
      console.log('Final candidates set:', candidatesData)
      console.log('Candidate count:', candidatesData.length)

      // Handle positions response
      if (positionsResponse.status === 'fulfilled') {
        const positionsData = positionsResponse.value
        console.log('Positions response:', positionsData)
        setSsgPositions(Array.isArray(positionsData) ? positionsData : 
                       positionsData.positions || positionsData.data || [])
      } else {
        console.error("Error fetching positions:", positionsResponse.reason)
        setSsgPositions([])
      }

      // Handle partylists response
      if (partylistsResponse.status === 'fulfilled') {
        const partylistsData = partylistsResponse.value
        console.log('Partylists response:', partylistsData)
        setSsgPartylists(Array.isArray(partylistsData) ? partylistsData : 
                        partylistsData.partylists || partylistsData.data || [])
      } else {
        console.error("Error fetching partylists:", partylistsResponse.reason)
        setSsgPartylists([])
      }

      // Handle voters response
      if (votersResponse.status === 'fulfilled') {
        const votersData = votersResponse.value
        console.log('Voters response:', votersData)
        setRegisteredVoters(Array.isArray(votersData) ? votersData : 
                           votersData.voters || votersData.data || [])
      } else {
        console.error("Error fetching voters:", votersResponse.reason)
        setRegisteredVoters([])
      }
      
    } catch (error) {
      console.error("Error fetching data:", error)
      showErrorAlert(error)
      // Set empty arrays to prevent undefined errors
      setSsgCandidates([])
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

  const fetchCandidatesWithFallback = async () => {
    const fallbackStrategies = [
      // Strategy 1: SSG specific API
      async () => {
        console.log('Strategy 1: Using candidatesAPI.ssg.getByElection...')
        const result = await candidatesAPI.ssg.getByElection(ssgElectionId)
        return result
      },
      
      // Strategy 2: General candidates API with type filter
      async () => {
        console.log('Strategy 2: Using candidatesAPI.getByElection with SSG type...')
        const result = await candidatesAPI.getByElection(ssgElectionId, 'ssg')
        return result
      },
      
      // Strategy 3: Get all candidates with filters
      async () => {
        console.log('Strategy 3: Using candidatesAPI.getAll with filters...')
        const result = await candidatesAPI.getAll({ 
          electionId: ssgElectionId, 
          type: 'ssg',
          limit: 1000 
        })
        return result
      },
      
      // Strategy 4: SSG getAll with election filter
      async () => {
        console.log('Strategy 4: Using candidatesAPI.ssg.getAll with election filter...')
        const result = await candidatesAPI.ssg.getAll({ 
          electionId: ssgElectionId,
          limit: 1000 
        })
        return result
      }
    ]

    let lastError = null
    
    for (let i = 0; i < fallbackStrategies.length; i++) {
      try {
        const result = await fallbackStrategies[i]()
        console.log(`Strategy ${i + 1} raw result:`, result)
        
        // Normalize the response - handle different response structures
        let candidates = []
        if (Array.isArray(result)) {
          candidates = result
        } else if (result.candidates && Array.isArray(result.candidates)) {
          candidates = result.candidates
        } else if (result.data) {
          if (Array.isArray(result.data)) {
            candidates = result.data
          } else if (result.data.candidates && Array.isArray(result.data.candidates)) {
            candidates = result.data.candidates
          } else if (result.data.data && Array.isArray(result.data.data)) {
            candidates = result.data.data
          }
        }
        
        console.log(`Strategy ${i + 1} normalized candidates:`, candidates)
        
        // Additional filtering to ensure we only get candidates for this election
        const filteredCandidates = candidates.filter(candidate => {
          const matchesElection = candidate.ssgElectionId === ssgElectionId ||
                 candidate.ssgElectionId?._id === ssgElectionId ||
                 candidate.electionId === ssgElectionId ||
                 candidate.electionId?._id === ssgElectionId
          
          // Also ensure it's an SSG candidate
          const isSSGCandidate = candidate.electionType === 'ssg' || 
                               candidate.ssgElectionId || 
                               !candidate.deptElectionId
          
          return matchesElection && isSSGCandidate
        })
        
        console.log(`Strategy ${i + 1} filtered candidates (${filteredCandidates.length}):`, filteredCandidates)
        
        // Return results even if empty (for last strategy) or if we found candidates
        if (filteredCandidates.length > 0 || i === fallbackStrategies.length - 1) {
          return filteredCandidates
        }
        
      } catch (error) {
        console.log(`Strategy ${i + 1} failed:`, error.message)
        lastError = error
        continue
      }
    }
    
    // If all strategies failed, log the error but return empty array
    console.error('All candidate fetching strategies failed. Last error:', lastError)
    return []
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
      isActive: true
    })
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
      isActive: candidate.isActive !== false
    })
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

  // Filter candidates based on search and filters - with safety check
  const filteredCandidates = Array.isArray(ssgCandidates) ? ssgCandidates.filter(candidate => {
    const matchesSearch = searchTerm === '' || 
      candidate.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.voterId?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.voterId?.schoolId?.toString().includes(searchTerm.toLowerCase()) ||
      candidate.platform?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesPosition = filterPosition === '' || candidate.positionId?._id === filterPosition
    const matchesPartylist = filterPartylist === '' || 
      (filterPartylist === 'independent' && !candidate.partylistId) ||
      candidate.partylistId?._id === filterPartylist

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
      headerAction={
        <button
          onClick={handleAddCandidate}
          className="flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/20 backdrop-blur-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Candidate
        </button>
      }
    >
      {/* Candidate Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Candidates</p>
              <p className="text-2xl font-bold text-[#001f65]">{candidateStats.total}</p>
            </div>
            <Users className="w-8 h-8 text-[#001f65]" />
          </div>
        </div>
        
        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-green-600">{candidateStats.active}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Inactive</p>
              <p className="text-2xl font-bold text-red-600">{candidateStats.inactive}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
        </div>
        
        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Positions</p>
              <p className="text-2xl font-bold text-[#001f65]">{Object.keys(candidateStats.byPosition).length}</p>
            </div>
            <Info className="w-8 h-8 text-[#001f65]" />
          </div>
        </div>
      </div>

      {/* Debug Info (Remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-yellow-800 mb-2">Debug Information</h4>
          <div className="text-sm text-yellow-700 space-y-1">
            <p>Election ID: {ssgElectionId}</p>
            <p>Raw candidates array length: {ssgCandidates?.length || 0}</p>
            <p>Filtered candidates length: {filteredCandidates?.length || 0}</p>
            <p>Search term: "{searchTerm}"</p>
            <p>Position filter: {filterPosition || 'None'}</p>
            <p>Partylist filter: {filterPartylist || 'None'}</p>
          </div>
        </div>
      )}

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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Voter *
                    </label>
                    <select
                      required
                      value={formData.voterId}
                      onChange={(e) => setFormData(prev => ({ ...prev, voterId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select a voter</option>
                      {Array.isArray(registeredVoters) && registeredVoters.map(voter => (
                        <option key={voter._id} value={voter._id}>
                          {voter.fullName} - {voter.schoolId}
                        </option>
                      ))}
                    </select>
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
                    disabled={formLoading}
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

      {/* Candidates Table */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
        {/* Table Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-[#001f65]">
                Candidates 
                <span className="text-lg font-normal text-gray-600 ml-2">
                  ({filteredCandidates.length}{searchTerm || filterPosition || filterPartylist ? ` of ${candidateStats.total}` : ''})
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
            
            <select
              value={filterPosition}
              onChange={(e) => setFilterPosition(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent"
            >
              <option value="">All Positions ({Object.keys(candidateStats.byPosition).length})</option>
              {Array.isArray(ssgPositions) && ssgPositions.map(position => {
                const count = candidateStats.byPosition[position.positionName] || 0
                return (
                  <option key={position._id} value={position._id}>
                    {position.positionName} ({count})
                  </option>
                )
              })}
            </select>

            <select
              value={filterPartylist}
              onChange={(e) => setFilterPartylist(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent"
            >
              <option value="">All Partylists ({Object.keys(candidateStats.byPartylist).length})</option>
              <option value="independent">Independent ({candidateStats.byPartylist['Independent'] || 0})</option>
              {Array.isArray(ssgPartylists) && ssgPartylists.map(partylist => {
                const count = candidateStats.byPartylist[partylist.partylistName] || 0
                return (
                  <option key={partylist._id} value={partylist._id}>
                    {partylist.partylistName} ({count})
                  </option>
                )
              })}
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Candidate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Position
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
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <Users className="w-12 h-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {candidateStats.total === 0 ? 'No candidates found' : 'No matching candidates'}
                      </h3>
                      <p className="text-gray-500 mb-4">
                        {candidateStats.total === 0 ? 
                          'Get started by adding the first candidate for this election.' :
                          searchTerm || filterPosition || filterPartylist ? 
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
                      {candidateStats.total > 0 && (searchTerm || filterPosition || filterPartylist) && (
                        <button
                          onClick={() => {
                            setSearchTerm('')
                            setFilterPosition('')
                            setFilterPartylist('')
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
                filteredCandidates.map((candidate) => (
                  <tr key={candidate._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-[#b0c8fe]/30 flex items-center justify-center">
                            <UserCheck className="h-5 w-5 text-[#001f65]" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {candidate.fullName || candidate.voterId?.fullName || 'Unknown Name'}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {candidate.voterId?.schoolId || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {candidate.positionId?.positionName || 'Unknown Position'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        candidate.partylistId 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {candidate.partylistId?.partylistName || 'Independent'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {candidate.candidateNumber || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        candidate.isActive !== false
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {candidate.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
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
                          onClick={() => handleDeleteCandidate(candidate._id, candidate.fullName || candidate.voterId?.fullName)}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                          title="Delete candidate"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </SSGLayout>
  )
}