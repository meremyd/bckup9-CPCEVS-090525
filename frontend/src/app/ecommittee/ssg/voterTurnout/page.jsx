"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ssgElectionsAPI } from "@/lib/api/ssgElections"
import { electionParticipationAPI } from "@/lib/api/electionParticipation"
import { departmentsAPI } from "@/lib/api/departments"
import { votersAPI } from "@/lib/api/voters"
import SSGLayout from "@/components/SSGLayout"
import Swal from 'sweetalert2'
import { 
  Users,
  Vote,
  UserCheck,
  Building,
  AlertCircle,
  Loader2,
  Search,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Percent,
  Clock,
  CheckCircle2
} from "lucide-react"

export default function VoterTurnoutPage() {
  const [ssgElectionData, setSSGElectionData] = useState(null)
  const [departments, setDepartments] = useState([])
  const [participationStats, setParticipationStats] = useState(null)
  const [turnoutData, setTurnoutData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [totalStats, setTotalStats] = useState({
    totalRegisteredVoters: 0,
    totalParticipants: 0,
    totalVoted: 0,
    turnoutRate: 0
  })

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
      if (parsedUser.userType !== "election_committee") {
        router.push("/adminlogin")
        return
      }
    } catch (parseError) {
      console.error("Error parsing user data:", parseError)
      router.push("/adminlogin")
      return
    }

    if (ssgElectionId) {
      fetchData()
    }
  }, [ssgElectionId, router])

  const fetchData = async () => {
    setLoading(true)
    setError('')
    
    try {
      await Promise.all([
        fetchElectionData(),
        fetchDepartments(),
        fetchParticipationStats(),
        fetchTurnoutData()
      ])
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchElectionData = async () => {
    try {
      const response = await ssgElectionsAPI.getById(ssgElectionId)
      setSSGElectionData(response.data)
    } catch (error) {
      console.error("Error fetching election data:", error)
      handleAPIError(error, 'Failed to load election data')
    }
  }

  const fetchDepartments = async () => {
    try {
      const response = await departmentsAPI.getAll()
      setDepartments(response.data || [])
    } catch (error) {
      console.error("Error fetching departments:", error)
      handleAPIError(error, 'Failed to load departments')
    }
  }

  const fetchParticipationStats = async () => {
    try {
      const response = await electionParticipationAPI.ssg.getStats(ssgElectionId)
      setParticipationStats(response.data)
      
      // Calculate total stats
      const totalRegistered = response.data?.totalEligibleVoters || 0
      const totalParticipants = response.data?.totalParticipants || 0
      const totalVoted = response.data?.totalVoted || 0
      const turnoutRate = totalRegistered > 0 ? ((totalVoted / totalRegistered) * 100) : 0
      
      setTotalStats({
        totalRegisteredVoters: totalRegistered,
        totalParticipants: totalParticipants,
        totalVoted: totalVoted,
        turnoutRate: parseFloat(turnoutRate.toFixed(2))
      })
    } catch (error) {
      console.error("Error fetching participation stats:", error)
      handleAPIError(error, 'Failed to load participation statistics')
    }
  }

  const fetchTurnoutData = async () => {
    try {
      const response = await ssgElectionsAPI.getTurnout(ssgElectionId)
      setTurnoutData(response.data?.byDepartment || [])
    } catch (error) {
      console.error("Error fetching turnout data:", error)
      handleAPIError(error, 'Failed to load turnout data')
    }
  }

  const handleAPIError = (error, defaultMessage) => {
    let errorMessage = defaultMessage

    if (error.response?.status === 429) {
      errorMessage = "Too many requests. Please try again in a moment."
    } else if (error.response?.status >= 500) {
      errorMessage = "Server error. Please try again later."
    } else if (error.code === 'NETWORK_ERROR' || !navigator.onLine) {
      errorMessage = "Network error. Please check your connection."
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message
    } else if (error.message) {
      errorMessage = error.message
    }

    setError(errorMessage)
    
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: errorMessage,
      confirmButtonColor: '#001f65'
    })
  }

  const refreshData = async () => {
    await fetchData()
    
    Swal.fire({
      icon: 'success',
      title: 'Refreshed!',
      text: 'Data has been updated successfully.',
      timer: 2000,
      showConfirmButton: false,
      toast: true,
      position: 'top-end'
    })
  }

  const getTurnoutColor = (rate) => {
    if (rate >= 80) return 'text-green-600 bg-green-100'
    if (rate >= 60) return 'text-yellow-600 bg-yellow-100'
    if (rate >= 40) return 'text-orange-600 bg-orange-100'
    return 'text-red-600 bg-red-100'
  }

  const getTurnoutIcon = (rate) => {
    if (rate >= 60) return <TrendingUp className="w-4 h-4" />
    return <TrendingDown className="w-4 h-4" />
  }

  const filteredTurnoutData = turnoutData.filter(dept => {
    const matchesSearch = dept.departmentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         dept.departmentCode?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  if (!ssgElectionId) {
    return (
      <SSGLayout
        ssgElectionId={null}
        title="Voter Turnout"
        subtitle="Election Participation Analysis"
        activeItem="turnout"
      >
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20">
            <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Election Selected</h3>
            <p className="text-white/80 mb-6">Please select an election to view voter turnout data.</p>
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
      title="Voter Turnout"
      subtitle="Election Participation Analysis"
      activeItem="turnout"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">Registered Voters</h3>
                <p className="text-2xl font-bold text-[#001f65]">{totalStats.totalRegisteredVoters.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">Eligible to participate</p>
              </div>
              <Users className="w-10 h-10 text-[#001f65]/20" />
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">Participants</h3>
                <p className="text-2xl font-bold text-blue-600">{totalStats.totalParticipants.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">Confirmed participation</p>
              </div>
              <UserCheck className="w-10 h-10 text-blue-600/20" />
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">Votes Cast</h3>
                <p className="text-2xl font-bold text-green-600">{totalStats.totalVoted.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">Successfully voted</p>
              </div>
              <Vote className="w-10 h-10 text-green-600/20" />
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">Turnout Rate</h3>
                <p className="text-2xl font-bold text-purple-600">{totalStats.turnoutRate}%</p>
                <div className="flex items-center mt-1">
                  {getTurnoutIcon(totalStats.turnoutRate)}
                  <span className="text-xs text-gray-500 ml-1">Overall participation</span>
                </div>
              </div>
              <BarChart3 className="w-10 h-10 text-purple-600/20" />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#001f65] flex items-center">
                <Building className="w-6 h-6 mr-2" />
                Department Turnout Analysis
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Voter participation breakdown by department
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search departments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent text-sm"
                />
              </div>
              
              <button
                onClick={refreshData}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-[#001f65] hover:bg-[#003399] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                {loading ? (
                  <Loader2 className="animate-spin rounded-full h-4 w-4 mr-2" />
                ) : (
                  <BarChart3 className="w-4 h-4 mr-2" />
                )}
                Refresh Data
              </button>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin rounded-full h-8 w-8 text-[#001f65]" />
              <span className="ml-3 text-[#001f65]">Loading turnout data...</span>
            </div>
          )}

          {/* Department Cards Grid */}
          {!loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTurnoutData.map((dept) => {
                const turnoutRate = dept.registeredVoters > 0 
                  ? ((dept.voted / dept.registeredVoters) * 100) 
                  : 0
                const participationRate = dept.registeredVoters > 0 
                  ? ((dept.participants / dept.registeredVoters) * 100) 
                  : 0

                return (
                  <div
                    key={dept._id || dept.departmentCode}
                    className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-all duration-200"
                  >
                    {/* Department Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-[#001f65] text-lg truncate">
                          {dept.departmentName || dept.name}
                        </h3>
                        <p className="text-sm text-gray-600 font-mono">
                          {dept.departmentCode || dept.code}
                        </p>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${getTurnoutColor(turnoutRate)}`}>
                        {turnoutRate.toFixed(1)}%
                      </div>
                    </div>

                    {/* Statistics */}
                    <div className="space-y-3">
                      {/* Registered Voters */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Users className="w-4 h-4 text-gray-500 mr-2" />
                          <span className="text-sm text-gray-600">Registered</span>
                        </div>
                        <span className="font-medium text-gray-900">
                          {(dept.registeredVoters || 0).toLocaleString()}
                        </span>
                      </div>

                      {/* Participants */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <UserCheck className="w-4 h-4 text-blue-500 mr-2" />
                          <span className="text-sm text-gray-600">Participants</span>
                        </div>
                        <div className="flex items-center">
                          <span className="font-medium text-gray-900 mr-2">
                            {(dept.participants || 0).toLocaleString()}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({participationRate.toFixed(1)}%)
                          </span>
                        </div>
                      </div>

                      {/* Voted */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <CheckCircle2 className="w-4 h-4 text-green-500 mr-2" />
                          <span className="text-sm text-gray-600">Voted</span>
                        </div>
                        <div className="flex items-center">
                          <span className="font-medium text-gray-900 mr-2">
                            {(dept.voted || 0).toLocaleString()}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({turnoutRate.toFixed(1)}%)
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-4">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Turnout Progress</span>
                          <span>{turnoutRate.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              turnoutRate >= 80 ? 'bg-green-500' :
                              turnoutRate >= 60 ? 'bg-yellow-500' :
                              turnoutRate >= 40 ? 'bg-orange-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(turnoutRate, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredTurnoutData.length === 0 && (
            <div className="text-center py-12">
              <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No departments match your search' : 'No turnout data available'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm 
                  ? 'Try adjusting your search terms.'
                  : 'Turnout data will appear here once voting begins.'
                }
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-[#001f65] hover:text-[#003399] font-medium"
                >
                  Clear search
                </button>
              )}
            </div>
          )}
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
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Election Info */}
        {ssgElectionData && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <Clock className="w-5 h-5 text-blue-500 mr-3 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-blue-900">
                  {ssgElectionData.title} - {ssgElectionData.electionYear}
                </h4>
                <p className="text-blue-700 text-sm">
                  Status: <span className="font-medium capitalize">{ssgElectionData.status}</span>
                  {ssgElectionData.startDate && (
                    <span className="ml-2">
                      • Starts: {new Date(ssgElectionData.startDate).toLocaleDateString()}
                    </span>
                  )}
                  {ssgElectionData.endDate && (
                    <span className="ml-2">
                      • Ends: {new Date(ssgElectionData.endDate).toLocaleDateString()}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </SSGLayout>
  )
}