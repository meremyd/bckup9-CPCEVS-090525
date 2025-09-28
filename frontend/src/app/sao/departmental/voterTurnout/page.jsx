"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { electionParticipationAPI } from "@/lib/api/electionParticipation"
import { departmentalElectionsAPI } from "@/lib/api/departmentalElections"
import SAODepartmentalLayout from "@/components/SAODepartmentalLayout"
import Swal from 'sweetalert2'
import { 
  Users,
  Search,
  AlertCircle,
  CheckCircle,
  Building2,
  Loader2,
  UserCheck,
  UserX,
  Clock,
  RefreshCw,
  Download,
  TrendingUp,
  BarChart3,
  Shield
} from "lucide-react"

export default function SAODepartmentalVoterTurnoutPage() {
  const [participants, setParticipants] = useState([])
  const [election, setElection] = useState(null)
  const [filteredParticipants, setFilteredParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [stats, setStats] = useState(null)
  const [voterStats, setVoterStats] = useState(null)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalParticipants, setTotalParticipants] = useState(0)
  const itemsPerPage = 20

  const router = useRouter()
  const searchParams = useSearchParams()
  const deptElectionId = searchParams.get('deptElectionId')

  useEffect(() => {
    const token = localStorage.getItem("token")
    const userData = localStorage.getItem("user")

    if (!token || !userData) {
      router.push("/adminlogin")
      return
    }

    try {
      const parsedUser = JSON.parse(userData)
      const userType = parsedUser.userType || parsedUser.role
      
      if (!["sao"].includes(userType)) {
        router.push("/adminlogin")
        return
      }
    } catch (parseError) {
      console.error("Error parsing user data:", parseError)
      router.push("/adminlogin")
      return
    }    

    if (deptElectionId) {
      Promise.all([
        fetchElection(),
        fetchParticipants(),
        fetchStats(),
        fetchVoterStats()
      ])
    } else {
      setError('No election ID provided')
      setLoading(false)
    }
  }, [deptElectionId, router, currentPage])

  useEffect(() => {
    applyFilters()
  }, [participants, searchTerm, statusFilter])

  const fetchElection = async () => {
    try {
      const response = await departmentalElectionsAPI.getById(deptElectionId)
      setElection(response.election || response)
    } catch (error) {
      console.error("Error fetching election:", error)
      // Don't set error here as this is not critical for the page to function
    }
  }

  const fetchParticipants = async () => {
    try {
      setError('')
      const response = await electionParticipationAPI.getDepartmentalParticipants(
        deptElectionId,
        {
          page: currentPage,
          limit: itemsPerPage
        }
      )
      
      setParticipants(response.participants || [])
      setTotalPages(Math.ceil((response.total || 0) / itemsPerPage))
      setTotalParticipants(response.total || 0)
      
    } catch (error) {
      console.error("Error fetching participants:", error)
      handleApiError(error, "Failed to load voter participants")
    }
  }

  const fetchStats = async () => {
    try {
      const response = await electionParticipationAPI.getDepartmentalStatistics(deptElectionId)
      console.log('Election stats response:', response)
      setStats(response)
    } catch (error) {
      console.error("Error fetching stats:", error)
      // Set default stats if API fails
      setStats({
        totalEligibleVoters: 0,
        totalParticipants: participants.length || 0,
        totalVoted: 0,
        participationRate: 0,
        voterTurnoutRate: 0
      })
    }
  }

  const fetchVoterStats = async () => {
    try {
      if (!deptElectionId) {
        setLoading(false)
        return
      }

      // Try to get officers count for this specific department election
      const response = await departmentalElectionsAPI.getOfficersCount(deptElectionId)
      console.log('Department officers response:', response)
      setVoterStats(response.data || response)
    } catch (error) {
      console.error("Error fetching voter stats:", error)
      // Set default voter stats if API fails
      setVoterStats({ totalOfficers: 0 })
    } finally {
      setLoading(false)
    }
  }

  const handleApiError = (error, defaultMessage) => {
    let errorMessage = defaultMessage

    if (error.response) {
      const status = error.response.status
      const message = error.response.data?.message || error.message

      switch (status) {
        case 429:
          errorMessage = message.includes('login attempts') 
            ? 'Too many login attempts. Please wait 15 minutes before trying again.'
            : 'Too many requests. Please wait a moment and try again.'
          break
        case 403:
          errorMessage = "You don't have permission to view this data."
          break
        case 404:
          errorMessage = "Election or data not found."
          break
        case 500:
          errorMessage = "Server error. Please try again later."
          break
        case 0:
        case undefined:
          errorMessage = "Network error. Please check your connection and try again."
          break
        default:
          errorMessage = message || defaultMessage
      }
    } else if (error.code === 'NETWORK_ERROR' || !navigator.onLine) {
      errorMessage = "Network error. Please check your connection and try again."
    } else {
      errorMessage = error.message || defaultMessage
    }

    setError(errorMessage)
    
    if (error.response?.status === 403 || error.response?.status === 404) {
      Swal.fire({
        icon: 'error',
        title: 'Access Error',
        text: errorMessage,
        confirmButtonColor: '#001f65'
      })
    }
  }

  const applyFilters = () => {
    setSearchLoading(true)
    
    let filtered = [...participants]

    if (statusFilter !== 'all') {
      switch (statusFilter) {
        case 'confirmed':
          filtered = filtered.filter(p => p.status === 'confirmed')
          break
        case 'voted':
          filtered = filtered.filter(p => p.hasVoted === true)
          break
        case 'not_voted':
          filtered = filtered.filter(p => p.hasVoted === false)
          break
      }
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(participant => {
        const voter = participant.voterId
        if (!voter) return false
        
        const fullName = `${voter.firstName} ${voter.lastName}`.toLowerCase()
        const schoolId = voter.schoolId?.toString().toLowerCase() || ''
        
        return fullName.includes(term) || schoolId.includes(term)
      })
    }

    setFilteredParticipants(filtered)
    setTimeout(() => setSearchLoading(false), 300)
  }

  const handleRefresh = async () => {
    setLoading(true)
    setError('')
    await Promise.all([
      fetchElection(),
      fetchParticipants(),
      fetchStats(),
      fetchVoterStats()
    ])
  }

  const handleExportPDF = async () => {
    try {
      const blob = await electionParticipationAPI.exportDepartmentalParticipantsPDF(deptElectionId, {
        hasVoted: statusFilter === 'voted' ? true : statusFilter === 'not_voted' ? false : undefined
      })
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Departmental_Participants_${election?.title?.replace(/[^a-zA-Z0-9]/g, '_') || deptElectionId}_${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      Swal.fire({
        icon: 'success',
        title: 'Export Successful',
        text: 'Departmental participants PDF has been downloaded',
        confirmButtonColor: '#001f65',
        timer: 2000,
        showConfirmButton: false
      })
    } catch (error) {
      console.error('Error exporting PDF:', error)
      Swal.fire({
        icon: 'error',
        title: 'Export Failed',
        text: 'Failed to export participants to PDF',
        confirmButtonColor: '#001f65'
      })
    }
  }

  // Get display values with fallbacks using the new stats structure
  const getDisplayStats = () => {
    const totalEligibleOfficers = stats?.totalEligibleVoters || 0
    const participantsCount = stats?.totalParticipants || participants.length || 0
    const votedCount = stats?.totalVoted || 0
    const participationRate = stats?.participationRate || 0
    const voterTurnoutRate = stats?.voterTurnoutRate || 0
    
    console.log('Display stats:', { totalEligibleOfficers, participantsCount, votedCount, participationRate, voterTurnoutRate, stats })
    
    return {
      totalEligibleOfficers,
      participants: participantsCount,
      voted: votedCount,
      participationRate,
      voterTurnoutRate
    }
  }

  if (!deptElectionId) {
    return (
      <SAODepartmentalLayout
        deptElectionId={null}
        title="Voter Turnout"
        subtitle="Election Participation Analytics"
        activeItem="voterTurnout"
      >
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20">
            <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Election Selected</h3>
            <p className="text-white/80 mb-6">Please select an election to view voter turnout.</p>
            <button
              onClick={() => router.push('/sao/departmental')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Back to Elections
            </button>
          </div>
        </div>
      </SAODepartmentalLayout>
    )
  }

  return (
    <SAODepartmentalLayout
      deptElectionId={deptElectionId}
      title="Voter Turnout"
      subtitle="Election Participation Analytics"
      activeItem="voterTurnout"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Main Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6">
              <div className="flex items-center">
                <Shield className="w-10 h-10 text-[#001f65] mr-4" />
                <div>
                  <p className="text-sm text-gray-600 mb-1">Eligible Officers</p>
                  <p className="text-2xl font-bold text-[#001f65]">{getDisplayStats().totalEligibleOfficers}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6">
              <div className="flex items-center">
                <UserCheck className="w-10 h-10 text-green-600 mr-4" />
                <div>
                  <p className="text-sm text-gray-600 mb-1">Participants</p>
                  <p className="text-2xl font-bold text-green-600">{getDisplayStats().participants}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6">
              <div className="flex items-center">
                <CheckCircle className="w-10 h-10 text-blue-600 mr-4" />
                <div>
                  <p className="text-sm text-gray-600 mb-1">Voted</p>
                  <p className="text-2xl font-bold text-blue-600">{getDisplayStats().voted}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6">
              <div className="flex items-center">
                <TrendingUp className="w-10 h-10 text-orange-600 mr-4" />
                <div>
                  <p className="text-sm text-gray-600 mb-1">Participation Rate</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {getDisplayStats().participationRate}%
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6">
              <div className="flex items-center">
                <BarChart3 className="w-10 h-10 text-purple-600 mr-4" />
                <div>
                  <p className="text-sm text-gray-600 mb-1">Voter Turnout</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {getDisplayStats().voterTurnoutRate}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => setError('')}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        )}

        {/* Participants Table with integrated search and filters */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
          {/* Table Header with Search and Filters */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Left side - Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search participants..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent w-full md:w-64"
                />
                {searchLoading && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 animate-spin w-4 h-4 text-gray-400" />
                )}
              </div>

              {/* Right side - Filters and Actions */}
              <div className="flex items-center gap-4">
                <div className="flex items-center">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent"
                  >
                    <option value="all">All Status</option>
                    <option value="confirmed">Confirmed Only</option>
                    <option value="voted">Voted</option>
                    <option value="not_voted">Not Voted</option>
                  </select>
                </div>
                
                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  className="flex items-center px-3 py-2 text-[#001f65] hover:bg-[#001f65]/10 rounded-lg transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>

                <button
                  onClick={handleExportPDF}
                  className="flex items-center px-3 py-2 text-[#001f65] hover:bg-[#001f65]/10 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[#001f65]" />
              <p className="text-gray-600">Loading voter turnout data...</p>
            </div>
          ) : filteredParticipants.length === 0 ? (
            <div className="p-12 text-center">
              <UserX className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Participants Found</h3>
              <p className="text-gray-500">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your filters or search term.'
                  : 'No officers have confirmed their participation yet.'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#b0c8fe]/20">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#001f65] uppercase tracking-wider">
                      School ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#001f65] uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#001f65] uppercase tracking-wider">
                      Year Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#001f65] uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#001f65] uppercase tracking-wider">
                      Voted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#001f65] uppercase tracking-wider">
                      Participation Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredParticipants.map((participant, index) => {
                    const voter = participant.voterId
                    
                    return (
                      <tr key={participant._id || index} className="hover:bg-[#b0c8fe]/10">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {voter?.schoolId || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {`${voter?.firstName || ''} ${voter?.lastName || ''}`.trim() || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {voter?.yearLevel ? `${voter.yearLevel}${['st', 'nd', 'rd', 'th'][voter.yearLevel - 1]} Year` : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                            participant.status === 'confirmed'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {participant.status?.toUpperCase() || 'UNKNOWN'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {participant.hasVoted ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <Clock className="w-5 h-5 text-gray-400" />
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {participant.confirmedAt 
                            ? new Date(participant.confirmedAt).toLocaleDateString()
                            : 'N/A'
                          }
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing page {currentPage} of {totalPages} ({totalParticipants} total participants)
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SAODepartmentalLayout>
  )
}