"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { electionParticipationAPI } from "@/lib/api/electionParticipation"
import { departmentsAPI } from "@/lib/api/departments"
import { votersAPI } from "@/lib/api/voters"
import SSGLayout from "@/components/SSGLayout"
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
  Download
} from "lucide-react"

export default function SSGVoterParticipantsPage() {
  const [participants, setParticipants] = useState([])
  const [departments, setDepartments] = useState([])
  const [filteredParticipants, setFilteredParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('all')
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
  const ssgElectionId = searchParams.get('ssgElectionId')

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

    if (ssgElectionId) {
      Promise.all([
        fetchParticipants(),
        fetchDepartments(),
        fetchStats(),
        fetchVoterStats()
      ])
    } else {
      setError('No election ID provided')
      setLoading(false)
    }
  }, [ssgElectionId, router, currentPage])

  useEffect(() => {
    applyFilters()
  }, [participants, searchTerm, selectedDepartment, statusFilter])

  const fetchParticipants = async () => {
    try {
      setError('')
      const response = await electionParticipationAPI.getElectionParticipants(
        ssgElectionId, 
        'ssg',
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

  const fetchDepartments = async () => {
    try {
      const response = await departmentsAPI.getAll()
      setDepartments(response.departments || [])
    } catch (error) {
      console.error("Error fetching departments:", error)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await electionParticipationAPI.getElectionStats(ssgElectionId, 'ssg')
      setStats(response)
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }

  const fetchVoterStats = async () => {
    try {
      const response = await votersAPI.getStatistics()
      setVoterStats(response)
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

    if (selectedDepartment !== 'all') {
      filtered = filtered.filter(participant => 
        participant.voterId?.departmentId?._id === selectedDepartment ||
        participant.voterId?.departmentId?.departmentCode === selectedDepartment
      )
    }

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
        const departmentCode = voter.departmentId?.departmentCode?.toLowerCase() || ''
        const departmentName = voter.departmentId?.degreeProgram?.toLowerCase() || ''
        
        return fullName.includes(term) || 
               schoolId.includes(term) || 
               departmentCode.includes(term) ||
               departmentName.includes(term)
      })
    }

    setFilteredParticipants(filtered)
    setTimeout(() => setSearchLoading(false), 300)
  }

  const handleRefresh = async () => {
    setLoading(true)
    setError('')
    await Promise.all([
      fetchParticipants(),
      fetchStats(),
      fetchVoterStats()
    ])
  }

  const handleExport = () => {
    const headers = ['School ID', 'Name', 'Department', 'Year Level', 'Status', 'Has Voted', 'Participation Date']
    const csvData = filteredParticipants.map(participant => {
      const voter = participant.voterId
      return [
        voter?.schoolId || 'N/A',
        `${voter?.firstName || ''} ${voter?.lastName || ''}`.trim() || 'N/A',
        voter?.departmentId?.departmentCode || 'N/A',
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
    a.download = `ssg_participants_${ssgElectionId}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getDepartmentColor = (index) => {
    const colors = [
      'bg-blue-500/20 text-blue-700 border-blue-300 hover:bg-blue-500/30',
      'bg-green-500/20 text-green-700 border-green-300 hover:bg-green-500/30',
      'bg-purple-500/20 text-purple-700 border-purple-300 hover:bg-purple-500/30',
      'bg-orange-500/20 text-orange-700 border-orange-300 hover:bg-orange-500/30',
      'bg-pink-500/20 text-pink-700 border-pink-300 hover:bg-pink-500/30',
      'bg-indigo-500/20 text-indigo-700 border-indigo-300 hover:bg-indigo-500/30'
    ]
    return colors[index % colors.length]
  }

  // Calculate voter turnout percentage
  const calculateVoterTurnout = () => {
    if (!voterStats || !stats) return 0
    const totalVoters = voterStats.total || 0
    const participantsCount = stats.totalParticipants || 0
    return totalVoters > 0 ? Math.round((participantsCount / totalVoters) * 100) : 0
  }

  if (!ssgElectionId) {
    return (
      <SSGLayout
        ssgElectionId={null}
        title="Voter Participants"
        subtitle="Election Participation Management"
        activeItem="participants"
      >
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20">
            <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Election Selected</h3>
            <p className="text-white/80 mb-6">Please select an election to view participants.</p>
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
      title="Voter Participants"
      subtitle="Election Participation Management"
      activeItem="participants"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Statistics Cards - Only 4 cards */}
        {(stats || voterStats) && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-[#001f65] mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Total Voters</p>
                  <p className="text-xl font-bold text-[#001f65]">{voterStats?.total || 0}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4">
              <div className="flex items-center">
                <UserCheck className="w-8 h-8 text-green-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Registered Voters</p>
                  <p className="text-xl font-bold text-green-600">{voterStats?.registered || 0}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4">
              <div className="flex items-center">
                <CheckCircle className="w-8 h-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Participants</p>
                  <p className="text-xl font-bold text-blue-600">{stats?.totalParticipants || 0}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4">
              <div className="flex items-center">
                <Clock className="w-8 h-8 text-orange-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Voter Turnout</p>
                  <p className="text-xl font-bold text-orange-600">
                    {calculateVoterTurnout()}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Department Filter Cards */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <h3 className="text-lg font-bold text-[#001f65] mb-4">Filter by Department</h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSelectedDepartment('all')}
              className={`px-4 py-2 rounded-full border font-medium transition-colors ${
                selectedDepartment === 'all'
                  ? 'bg-[#001f65] text-white border-[#001f65]'
                  : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
              }`}
            >
              All Departments
            </button>
            {departments.map((dept, index) => {
              const participantCount = participants.filter(p => 
                p.voterId?.departmentId?._id === dept._id
              ).length
              
              return (
                <button
                  key={dept._id}
                  onClick={() => setSelectedDepartment(dept._id)}
                  className={`px-4 py-2 rounded-full border font-medium transition-colors relative ${
                    selectedDepartment === dept._id
                      ? 'bg-[#001f65] text-white border-[#001f65]'
                      : getDepartmentColor(index)
                  }`}
                >
                  <Building2 className="w-4 h-4 inline mr-2" />
                  {dept.departmentCode}
                  {participantCount > 0 && (
                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                      selectedDepartment === dept._id
                        ? 'bg-white text-[#001f65]'
                        : 'bg-white/80 text-gray-700'
                    }`}>
                      {participantCount}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

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
              <p className="text-gray-600">Loading participants...</p>
            </div>
          ) : filteredParticipants.length === 0 ? (
            <div className="p-12 text-center">
              <UserX className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Participants Found</h3>
              <p className="text-gray-500">
                {searchTerm || selectedDepartment !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your filters or search term.'
                  : 'No voters have confirmed their participation yet.'
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
                      Department
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
                          <div>
                            <div className="font-medium">{voter?.departmentId?.departmentCode || 'N/A'}</div>
                            <div className="text-xs text-gray-500">{voter?.departmentId?.degreeProgram || ''}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {voter?.yearLevel || 'N/A'}
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
    </SSGLayout>
  )
}