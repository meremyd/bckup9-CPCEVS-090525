"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { candidatesAPI } from "@/lib/api/candidates"
import { positionsAPI } from "@/lib/api/positions"
import { partylistsAPI } from "@/lib/api/partylists"
import SAOSSGLayout from '@/components/SAOSSGLayout'
import Swal from 'sweetalert2'
import { 
  AlertCircle,
  Loader2,
  Search,
  Users,
  Eye,
  Image,
  FileText,
  Download,
  BarChart3,
  Award,
  UserCheck,
  Building,
  Calendar
} from "lucide-react"

export default function SAOSSGCandidatesPage() {
  const [ssgCandidates, setSsgCandidates] = useState([])
  const [ssgPositions, setSsgPositions] = useState([])
  const [ssgPartylists, setSsgPartylists] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPosition, setFilterPosition] = useState('')
  const [selectedPartylist, setSelectedPartylist] = useState('')
  
  const [candidateStats, setCandidateStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    byPosition: {},
    byPartylist: {}
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
      return "You don't have permission to view this data."
    } else if (error.response?.status === 404) {
      return "Election or candidate data not found."
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

  // Calculate candidate statistics
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

      // Count by position
      const positionId = candidate.positionId?._id || candidate.positionId
      if (positionId && stats.byPosition[positionId]) {
        stats.byPosition[positionId].count++
      }

      // Count by partylist
      const partylistId = candidate.partylistId?._id || candidate.partylistId
      if (partylistId && stats.byPartylist[partylistId]) {
        stats.byPartylist[partylistId].count++
      } else {
        stats.byPartylist['independent'].count++
      }
    })

    return stats
  }

  useEffect(() => {
    if (ssgElectionId) {
      fetchData()
    } else {
      router.push('/sao/ssg')
    }
  }, [router, ssgElectionId])

  const fetchData = async () => {
    try {
      setLoading(true)
      console.log('Fetching SAO candidate data for SSG election:', ssgElectionId)

      const [candidatesResponse, positionsResponse, partylistsResponse] = await Promise.all([
        candidatesAPI.ssg.getByElection(ssgElectionId, {}),
        positionsAPI.ssg.getByElection(ssgElectionId),
        partylistsAPI.getBySSGElection(ssgElectionId)
      ])

      console.log('SAO API Responses received:', {
        candidates: !!candidatesResponse,
        positions: !!positionsResponse,
        partylists: !!partylistsResponse
      })

      // Process candidates data
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

      console.log('SAO Data counts:', {
        candidates: candidatesData.length,
        positions: positionsData.length,
        partylists: partylistsData.length
      })

      // Process candidates with full information
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
            isRegistered: candidate.voterId.isRegistered || false
          } : null,
          
          // Position information
          positionId: candidate.positionId?._id || candidate.positionId,
          positionInfo: candidate.positionId ? {
            _id: candidate.positionId._id || candidate.positionId,
            positionName: candidate.positionId.positionName || 'Unknown Position',
            positionOrder: candidate.positionId.positionOrder || 999
          } : null,
          
          // Partylist information
          partylistId: candidate.partylistId?._id || candidate.partylistId || null,
          partylistInfo: candidate.partylistId ? {
            _id: candidate.partylistId._id || candidate.partylistId,
            partylistName: candidate.partylistId.partylistName || 'Independent'
          } : null,
          
          // Files
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

      // Process positions
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

      // Process partylists
      const processedPartylists = partylistsData.map((partylist, index) => ({
        ...partylist,
        _id: partylist._id || `partylist-${index}`,
        partylistName: partylist.partylistName || 'Unknown Partylist',
        description: partylist.description || '',
        candidateCount: processedCandidates.filter(c => 
          (c.partylistId === partylist._id || c.partylistId?._id === partylist._id)
        ).length
      }))

      console.log('SAO Processed data:', {
        candidates: processedCandidates.length,
        positions: processedPositions.length,
        partylists: processedPartylists.length
      })

      // Update state
      setSsgCandidates(processedCandidates)
      setSsgPositions(processedPositions)
      setSsgPartylists(processedPartylists)
      
      // Calculate stats
      setCandidateStats(calculateCandidateStats(processedCandidates, processedPositions, processedPartylists))

    } catch (error) {
      console.error("SAO Error in fetchData:", error)
      showErrorAlert(error)
      
      // Reset to empty states on error
      setSsgCandidates([])
      setSsgPositions([])
      setSsgPartylists([])
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

  // Position Filter Dropdown
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

  // Handle image viewing
  const handleImageView = (candidate, imageType) => {
    const imageData = imageType === 'campaign' ? candidate.campaignPicture : candidate.credentials
    const title = imageType === 'campaign' ? 'Campaign Picture' : 'Credentials'
    
    if (imageData) {
      let imageUrl
      
      if (imageData.startsWith('data:')) {
        imageUrl = imageData
      } else {
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

  // Enhanced filtering
  const filteredCandidates = ssgCandidates.filter(candidate => {
    const matchesSearch = searchTerm === '' || 
      candidate.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.schoolId?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.position?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesPosition = filterPosition === '' || 
      candidate.positionId === filterPosition ||
      candidate.positionId?._id === filterPosition

    const matchesPartylist = selectedPartylist === '' || 
      (selectedPartylist === 'independent' ? 
        (!candidate.partylistId) : 
        (candidate.partylistId === selectedPartylist || 
         candidate.partylistId?._id === selectedPartylist))

    return matchesSearch && matchesPosition && matchesPartylist
  })

  if (loading) {
    return (
      <SAOSSGLayout 
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
      </SAOSSGLayout>
    )
  }

  return (
    <SAOSSGLayout 
      ssgElectionId={ssgElectionId}
      title="SSG Candidates Overview"
      subtitle={`Viewing ${candidateStats.total} candidates in this election`}
      activeItem="candidates"
    >
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#001f65]/70">Total Candidates</p>
              <p className="text-3xl font-bold text-[#001f65]">{candidateStats.total}</p>
            </div>
            <div className="p-3 bg-[#001f65]/10 rounded-lg">
              <Users className="w-6 h-6 text-[#001f65]" />
            </div>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700/70">Active Candidates</p>
              <p className="text-3xl font-bold text-green-700">{candidateStats.active}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <UserCheck className="w-6 h-6 text-green-700" />
            </div>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700/70">Positions Filled</p>
              <p className="text-3xl font-bold text-blue-700">{ssgPositions.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Award className="w-6 h-6 text-blue-700" />
            </div>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700/70">Partylists</p>
              <p className="text-3xl font-bold text-purple-700">{ssgPartylists.length}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Building className="w-6 h-6 text-purple-700" />
            </div>
          </div>
        </div>
      </div>

      {/* Partylist Filter Cards */}
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

            {/* Independent Candidates Card */}
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

            {/* Partylist Cards */}
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

      {/* Candidates Table */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
        {/* Table Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-[#001f65]">
                SSG Candidates 
                <span className="text-lg font-normal text-gray-600 ml-2">
                  ({filteredCandidates.length}{searchTerm || filterPosition || selectedPartylist ? ` of ${candidateStats.total}` : ''})
                </span>
              </h2>
            </div>
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
                          'No candidates have been registered for this SSG election yet.' :
                          searchTerm || filterPosition || selectedPartylist ? 
                            'Try adjusting your search or filters to see more candidates.' :
                            'All candidates are currently filtered out.'
                        }
                      </p>
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
                      {/* Campaign Picture Column */}
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

                      {/* Credentials Column */}
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
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Summary Footer */}
        {candidateStats.total > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex flex-wrap items-center justify-between text-sm text-gray-600">
              <div className="flex flex-wrap items-center gap-4">
                <span>
                  <strong>{filteredCandidates.length}</strong> of <strong>{candidateStats.total}</strong> candidates shown
                </span>
                <span>
                  <strong>{candidateStats.active}</strong> active candidates
                </span>
                <span>
                  <strong>{ssgPositions.length}</strong> positions available
                </span>
              </div>
             
            </div>
          </div>
        )}
      </div>

    </SAOSSGLayout>
  )
}