"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { candidatesAPI } from "@/lib/api/candidates"
import { positionsAPI } from "@/lib/api/positions"
import { votersAPI } from "@/lib/api/voters"
import { departmentalElectionsAPI } from "@/lib/api/departmentalElections"
import SAODepartmentalLayout from '@/components/SAODepartmentalLayout'
import Swal from 'sweetalert2'
import { 
  Loader2,
  Search,
  Users,
  Image,
  Eye,
  UserCheck,
  Info,
  AlertCircle,
  BarChart3,
  Calendar,
  MapPin
} from "lucide-react"

export default function SAODepartmentalCandidatesPage() {
  const [deptCandidates, setDeptCandidates] = useState([])
  const [deptPositions, setDeptPositions] = useState([])
  const [eligibleOfficers, setEligibleOfficers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPosition, setFilterPosition] = useState('')
  const [election, setElection] = useState(null)
  
  const [candidateStats, setCandidateStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    byPosition: {}
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
      router.push('/sao/departmental')
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

      // Get eligible officers for this election (active class officers from the same department)
      let officersData = []
      if (electionData?.departmentId) {
        try {
          const departmentId = electionData.departmentId._id || electionData.departmentId
          console.log('Fetching officers for department:', departmentId)
          
          // Use the correct API method to get active departmental officers
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
            isActive: candidate.voterId.isActive || false,
            isClassOfficer: candidate.voterId.isClassOfficer || false
          } : null,
          
          // Position information
          positionId: candidate.positionId?._id || candidate.positionId,
          positionInfo: candidate.positionId ? {
            _id: candidate.positionId._id || candidate.positionId,
            positionName: candidate.positionId.positionName || 'Unknown Position',
            positionOrder: candidate.positionId.positionOrder || 999
          } : null,
          
          // Campaign picture handling
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
        processedCandidate.isActive = processedCandidate.voterInfo?.isActive || false
        processedCandidate.isClassOfficer = processedCandidate.voterInfo?.isClassOfficer || false

        return processedCandidate
      })

      // Sort candidates by position order and then by name
      processedCandidates.sort((a, b) => {
        if (a.positionOrder !== b.positionOrder) {
          return a.positionOrder - b.positionOrder
        }
        return a.fullName.localeCompare(b.fullName)
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

      // Sort positions by order
      processedPositions.sort((a, b) => a.positionOrder - b.positionOrder)

      // Process officers - only show active class officers
      const processedOfficers = officersData
        .filter(officer => officer.isActive && officer.isClassOfficer)
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

  const handleCampaignPictureView = (candidate) => {
    if (candidate.campaignPicture || candidate.hasCampaignPicture) {
      let imageUrl;
      
      if (candidate.campaignPicture) {
        if (candidate.campaignPicture.startsWith('data:')) {
          // Already a proper data URL
          imageUrl = candidate.campaignPicture;
        } else {
          // Raw base64 data - convert to proper data URL
          imageUrl = `data:image/jpeg;base64,${candidate.campaignPicture}`;
        }
      } else {
        // Use the API endpoint for fetching the image
        imageUrl = candidatesAPI.getCampaignPictureUrl(candidate._id);
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
          const img = document.querySelector('.swal2-image');
          if (img) {
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            img.style.objectFit = 'contain';
          }
        },
        didClose: () => {
          // Clean up if blob URL was created
          if (imageUrl.startsWith('blob:')) {
            URL.revokeObjectURL(imageUrl);
          }
        }
      });
    } else {
      Swal.fire({
        icon: 'info',
        title: 'No Image Available',
        text: `No campaign picture has been uploaded for ${candidate.fullName}.`,
        confirmButtonColor: '#001f65'
      });
    }
  }

  if (loading) {
    return (
      <SAODepartmentalLayout 
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
      </SAODepartmentalLayout>
    )
  }

  return (
    <SAODepartmentalLayout 
      deptElectionId={deptElectionId}
      title="Candidates Overview"
      subtitle={`Monitoring ${candidateStats.total} candidates in this departmental election`}
      activeItem="candidates"
    >


      {/* Statistics Overview */}
      <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 border border-white/20 text-center">
          <div className="flex items-center justify-center mb-2">
            <Users className="w-5 h-5 text-gray-600 mr-2" />
            <div className="text-2xl font-bold text-gray-900">{candidateStats.total}</div>
          </div>
          <div className="text-sm text-gray-600">Total Candidates</div>
        </div>
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 border border-white/20 text-center">
          <div className="flex items-center justify-center mb-2">
            <UserCheck className="w-5 h-5 text-green-600 mr-2" />
            <div className="text-2xl font-bold text-green-700">{candidateStats.active}</div>
          </div>
          <div className="text-sm text-green-600">Active</div>
        </div>
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 border border-white/20 text-center">
          <div className="flex items-center justify-center mb-2">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <div className="text-2xl font-bold text-red-700">{candidateStats.inactive}</div>
          </div>
          <div className="text-sm text-red-600">Inactive</div>
        </div>
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 border border-white/20 text-center">
          <div className="flex items-center justify-center mb-2">
            <BarChart3 className="w-5 h-5 text-blue-600 mr-2" />
            <div className="text-2xl font-bold text-blue-700">{deptPositions.length}</div>
          </div>
          <div className="text-sm text-blue-600">Positions</div>
        </div>
      </div>

      {/* Candidates Table */}
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
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search candidates by name, ID, or position..."
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
                  Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  View
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
                          'No candidates have been registered for this departmental election yet.' :
                          searchTerm || filterPosition ? 
                            'Try adjusting your search or filters to see more candidates.' :
                            'All candidates are currently filtered out.'
                        }
                      </p>
                      {candidateStats.total > 0 && (searchTerm || filterPosition) && (
                        <button
                          onClick={() => {
                            setSearchTerm('')
                            setFilterPosition('')
                          }}
                          className="text-[#001f65] hover:text-[#003399] font-medium transition-colors"
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
                    <tr key={candidateKey} className="hover:bg-gray-50 transition-colors">
                      {/* Campaign Picture Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden shadow-sm">
                          {(candidate.campaignPicture || candidate.hasCampaignPicture) ? (
                            <img
                              src={
                                candidate.campaignPicture ? 
                                  (candidate.campaignPicture.startsWith('data:') ? 
                                    candidate.campaignPicture : 
                                    `data:image/jpeg;base64,${candidate.campaignPicture}`) :
                                  candidatesAPI.getCampaignPictureUrl(candidate._id)
                              }
                              alt={`${candidate.fullName} Campaign Picture`}
                              className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => handleCampaignPictureView(candidate)}
                              title="Click to view campaign picture"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextElementSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <Image 
                            className={`w-5 h-5 text-gray-400 ${(candidate.campaignPicture || candidate.hasCampaignPicture) ? 'hidden' : 'flex'}`} 
                          />
                        </div>
                      </td>

                      {/* Candidate Info Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {candidate.fullName}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center flex-wrap gap-1">
                            <span>ID: {candidate.schoolId}</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Class Officer
                            </span>
                            {candidate.voterInfo?.isActive && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Active Voter
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Position Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {candidate.position}
                        </div>
                        <div className="text-xs text-gray-500">
                          Order: {candidate.positionOrder}
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
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                          candidate.candidateNumber ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {candidate.candidateNumber || 'N/A'}
                        </span>
                      </td>

                      {/* Status Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            candidate.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {candidate.isActive ? 'Active' : 'Inactive'}
                          </span>
                          {candidate.voterInfo?.isActive && (
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                              Voter Active
                            </span>
                          )}
                        </div>
                      </td>

                      {/* View Column */}
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <div className="flex items-center justify-center space-x-2">
                          {(candidate.campaignPicture || candidate.hasCampaignPicture) && (
                            <button
                              onClick={() => handleCampaignPictureView(candidate)}
                              className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50 transition-colors"
                              title="View campaign picture"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          {!(candidate.campaignPicture || candidate.hasCampaignPicture) && (
                            <div className="text-gray-400 p-1" title="No campaign picture">
                              <Eye className="w-4 h-4 opacity-50" />
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Summary */}
        {filteredCandidates.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-gray-600">
              <div>
                Showing {filteredCandidates.length} of {candidateStats.total} candidates
              </div>
              <div className="flex items-center space-x-4">
                <span className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  Active: {candidateStats.active}
                </span>
                <span className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                  Inactive: {candidateStats.inactive}
                </span>
                <span className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                  With Photos: {filteredCandidates.filter(c => c.campaignPicture || c.hasCampaignPicture).length}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </SAODepartmentalLayout>
  )
}