"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { electionParticipationAPI } from "@/lib/api/electionParticipation"
import { departmentalElectionsAPI } from "@/lib/api/departmentalElections"
import { votersAPI } from "@/lib/api/voters"
import DepartmentalLayout from "@/components/DepartmentalLayout"
import Swal from 'sweetalert2'
import { 
  Users,
  Search,
  AlertCircle,
  CheckCircle,
  Building2,
  Loader2,
  Filter,
  UserCheck,
  UserX,
  Clock,
  RefreshCw,
  Download,
  TrendingUp,
  BarChart3,
  Shield,
  Edit3,
  Save,
  X
} from "lucide-react"

export default function DepartmentalVoterTurnoutPage() {
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
  const [editingYearLevel, setEditingYearLevel] = useState(null)
  const [newYearLevel, setNewYearLevel] = useState('')
  
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
      if (parsedUser.userType !== "election_committee" && parsedUser.userType !== "admin" && parsedUser.userType !== "sao") {
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
    }
  }

  const fetchParticipants = async () => {
    try {
      setError('')
      const response = await electionParticipationAPI.getElectionParticipants(
        deptElectionId, 
        'departmental',
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
      const response = await electionParticipationAPI.getElectionStats(deptElectionId, 'departmental')
      console.log('Election stats response:', response)
      setStats(response.data || response)
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }

  const fetchVoterStats = async () => {
    try {
      if (!election?.departmentId?._id) {
        setLoading(false)
        return
      }

      // Get officers count for this specific department
      const response = await departmentalElectionsAPI.getOfficersCount(deptElectionId)
      console.log('Department officers response:', response)
      setVoterStats(response.data || response)
    } catch (error) {
      console.error("Error fetching voter stats:", error)
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

  const handleExport = () => {
    const headers = ['School ID', 'Name', 'Year Level', 'Status', 'Has Voted', 'Participation Date']
    const csvData = filteredParticipants.map(participant => {
      const voter = participant.voterId
      return [
        voter?.schoolId || 'N/A',
        `${voter?.firstName || ''} ${voter?.lastName || ''}`.trim() || 'N/A',
        voter?.yearLevel || 'N/A',
        participant.status || 'N/A',
        participant.hasVoted ? 'Yes' : 'No',
        participant.participationDate ? new Date(participant.participationDate).toLocaleDateString() : 'N/A'
      ]
    })
    
    const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dept_voter_turnout_${deptElectionId}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleEditYearLevel = (participantId, currentYearLevel) => {
    setEditingYearLevel(participantId)
    setNewYearLevel(currentYearLevel?.toString() || '')
  }

  const handleSaveYearLevel = async (participant) => {
    if (!newYearLevel || !['1', '2', '3', '4'].includes(newYearLevel)) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Year Level',
        text: 'Please select a valid year level (1-4)',
        confirmButtonColor: '#001f65'
      })
      return
    }

    try {
      await votersAPI.updateYearLevel(participant.voterId._id, parseInt(newYearLevel))
      
      // Update local state
      setParticipants(prev => prev.map(p => 
        p._id === participant._id 
          ? {
              ...p,
              voterId: {
                ...p.voterId,
                yearLevel: parseInt(newYearLevel)
              }
            }
          : p
      ))

      setEditingYearLevel(null)
      setNewYearLevel('')

      Swal.fire({
        icon: 'success',
        title: 'Year Level Updated',
        text: 'Officer year level has been successfully updated',
        confirmButtonColor: '#001f65',
        timer: 2000,
        showConfirmButton: false
      })
    } catch (error) {
      console.error('Error updating year level:', error)
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: error.message || 'Failed to update year level',
        confirmButtonColor: '#001f65'
      })
    }
  }

  const handleCancelEdit = () => {
    setEditingYearLevel(null)
    setNewYearLevel('')
  }

  // Calculate voter turnout percentage
  const calculateVoterTurnout = () => {
    if (!voterStats || !stats) return 0
    const totalOfficers = voterStats?.totalOfficers || voterStats?.total || 0
    const participantsCount = stats?.totalParticipants || stats?.confirmed || participants.length || 0
    return totalOfficers > 0 ? Math.round((participantsCount / totalOfficers) * 100) : 0
  }

  // Get display values with fallbacks
  const getDisplayStats = () => {
    const totalOfficers = voterStats?.totalOfficers || voterStats?.total || 0
    const registeredOfficers = voterStats?.registeredOfficers || voterStats?.registered || 0
    const participantsCount = stats?.totalParticipants || stats?.confirmed || participants.length || 0
    
    console.log('Display stats:', { totalOfficers, registeredOfficers, participantsCount, voterStats, stats })
    
    return {
      totalOfficers,
      registeredOfficers,
      participants: participantsCount,
      turnout: calculateVoterTurnout()
    }
  }

  if (!deptElectionId) {
    return (
      <DepartmentalLayout
        deptElectionId={null}
        title="Voter Turnout"
        subtitle="Election Participation Analytics"
        activeItem="turnout"
      >
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20">
            <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Election Selected</h3>
            <p className="text-white/80 mb-6">Please select an election to view voter turnout.</p>
            <button
              onClick={() => router.push('/ecommittee/departmental')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Back to Elections
            </button>
          </div>
        </div>
      </DepartmentalLayout>
    )
  }

  return (
    <DepartmentalLayout
      deptElectionId={deptElectionId}
      title="Voter Turnout"
      subtitle="Election Participation Analytics"
      activeItem="turnout"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Election Info */}
        {election && (
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4 mb-6">
            <h2 className="text-lg font-bold text-[#001f65]">{election.title}</h2>
            <p className="text-sm text-gray-600">
              Department: {election.departmentId?.departmentCode} - {election.departmentId?.degreeProgram}
            </p>
          </div>
        )}

        {/* Main Statistics Cards */}
        {(stats || voterStats) && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6">
              <div className="flex items-center">
                <Shield className="w-10 h-10 text-[#001f65] mr-4" />
                <div>
                  <p className="text-sm text-gray-600 mb-1">Officers</p>
                  <p className="text-2xl font-bold text-[#001f65]">{getDisplayStats().totalOfficers}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6">
              <div className="flex items-center">
                <UserCheck className="w-10 h-10 text-green-600 mr-4" />
                <div>
                  <p className="text-sm text-gray-600 mb-1">Registered Officers</p>
                  <p className="text-2xl font-bold text-green-600">{getDisplayStats().registeredOfficers}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6">
              <div className="flex items-center">
                <CheckCircle className="w-10 h-10 text-blue-600 mr-4" />
                <div>
                  <p className="text-sm text-gray-600 mb-1">Confirmed Officers</p>
                  <p className="text-2xl font-bold text-blue-600">{getDisplayStats().participants}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6">
              <div className="flex items-center">
                <TrendingUp className="w-10 h-10 text-orange-600 mr-4" />
                <div>
                  <p className="text-sm text-gray-600 mb-1">Voter Turnout</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {getDisplayStats().turnout}%
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
                  <Filter className="w-5 h-5 text-[#001f65] mr-2" />
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
                  onClick={handleExport}
                  className="flex items-center px-3 py-2 text-[#001f65] hover:bg-[#001f65]/10 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#001f65] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredParticipants.map((participant, index) => {
                    const voter = participant.voterId
                    const isEditing = editingYearLevel === participant._id
                    
                    return (
                      <tr key={participant._id || index} className="hover:bg-[#b0c8fe]/10">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {voter?.schoolId || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {`${voter?.firstName || ''} ${voter?.lastName || ''}`.trim() || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {isEditing ? (
                            <div className="flex items-center space-x-2">
                              <select
                                value={newYearLevel}
                                onChange={(e) => setNewYearLevel(e.target.value)}
                                className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#001f65] focus:border-transparent"
                              >
                                <option value="">Select</option>
                                <option value="1">1st Year</option>
                                <option value="2">2nd Year</option>
                                <option value="3">3rd Year</option>
                                <option value="4">4th Year</option>
                              </select>
                              <button
                                onClick={() => handleSaveYearLevel(participant)}
                                className="text-green-600 hover:text-green-800 p-1"
                                title="Save"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="text-red-600 hover:text-red-800 p-1"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <span>{voter?.yearLevel ? `${voter.yearLevel}${['st', 'nd', 'rd', 'th'][voter.yearLevel - 1]} Year` : 'N/A'}</span>
                              <button
                                onClick={() => handleEditYearLevel(participant._id, voter?.yearLevel)}
                                className="text-[#001f65] hover:text-blue-800 p-1"
                                title="Edit Year Level"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
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
                          {participant.participationDate 
                            ? new Date(participant.participationDate).toLocaleDateString()
                            : 'N/A'
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {!isEditing && (
                            <button
                              onClick={() => handleEditYearLevel(participant._id, voter?.yearLevel)}
                              className="text-[#001f65] hover:text-blue-800 font-medium"
                            >
                              Edit Year Level
                            </button>
                          )}
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
    </DepartmentalLayout>
  )
}