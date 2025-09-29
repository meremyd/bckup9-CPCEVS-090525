"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { departmentalElectionsAPI } from "@/lib/api/departmentalElections"
import { ballotAPI } from "@/lib/api/ballots"
import { electionParticipationAPI } from "@/lib/api/electionParticipation"
import { candidatesAPI } from "@/lib/api/candidates"
import DepartmentalLayout from "@/components/DepartmentalLayout"
import Swal from 'sweetalert2'
import { 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts'
import { 
  BarChart3,
  TrendingUp,
  Users,
  Award,
  AlertCircle,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  Trophy,
  Medal,
  Crown,
  CheckCircle2,
  RefreshCw,
  Building,
  GraduationCap,
  UserCheck
} from "lucide-react"

export default function DepartmentalStatisticsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [authError, setAuthError] = useState('')
  const [departmentalElectionData, setDepartmentalElectionData] = useState(null)
  const [participationStats, setParticipationStats] = useState(null)
  const [ballotStats, setBallotStats] = useState(null)
  const [candidatesData, setCandidatesData] = useState(null)
  const [resultsData, setResultsData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const router = useRouter()
  const searchParams = useSearchParams()
  const deptElectionId = searchParams.get('deptElectionId')

  // Color schemes for charts
  const COLORS = {
    primary: ['#001f65', '#003399', '#0052cc', '#0066ff', '#3385ff', '#66a3ff', '#99c2ff'],
    success: ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'],
    warning: ['#d97706', '#f59e0b', '#fbbf24', '#fcd34d', '#fde68a'],
    info: ['#0ea5e9', '#38bdf8', '#7dd3fc', '#bae6fd', '#e0f2fe']
  }

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
  }, [router])

  useEffect(() => {
    if (isAuthenticated && deptElectionId) {
      fetchData()
    }
  }, [isAuthenticated, deptElectionId])

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setAuthError('')

    if (password === 'P@ssword') {
      setIsAuthenticated(true)
      setPassword('')
    } else {
      setAuthError('Invalid password. Access denied.')
      Swal.fire({
        icon: 'error',
        title: 'Access Denied',
        text: 'Invalid password. Please try again.',
        confirmButtonColor: '#dc2626'
      })
    }
  }

  const fetchData = async () => {
    setLoading(true)
    setError('')
    
    try {
      await Promise.all([
        fetchElectionData(),
        fetchParticipationStats(),
        fetchCandidatesData(),
        fetchResultsData()
      ])
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchElectionData = async () => {
    try {
      const response = await departmentalElectionsAPI.getById(deptElectionId)
      setDepartmentalElectionData(response.data)
    } catch (error) {
      console.error("Error fetching election data:", error)
      handleAPIError(error, 'Failed to load election data')
    }
  }

  const fetchParticipationStats = async () => {
    try {
      const response = await electionParticipationAPI.getDepartmentalStatistics(deptElectionId)
      setParticipationStats(response.data)
    } catch (error) {
      console.error("Error fetching participation statistics:", error)
      handleAPIError(error, 'Failed to load participation statistics')
    }
  }

  const fetchCandidatesData = async () => {
    try {
      const response = await candidatesAPI.departmental.getByElection(deptElectionId)
      setCandidatesData(response.data)
    } catch (error) {
      console.error("Error fetching candidates data:", error)
      handleAPIError(error, 'Failed to load candidates data')
    }
  }

  const fetchResultsData = async () => {
    try {
      const response = await departmentalElectionsAPI.getResults(deptElectionId)
      setResultsData(response.data)
    } catch (error) {
      console.error("Error fetching results:", error)
      // Don't show error for results as they might not be available yet
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

  const showResultsSummary = () => {
    if (!resultsData || !resultsData.positionResults) {
      Swal.fire({
        icon: 'info',
        title: 'No Results Available',
        text: 'Results will be available once the election is completed.',
        confirmButtonColor: '#001f65'
      })
      return
    }

    let summaryHTML = '<div class="text-left space-y-4">'
    
    resultsData.positionResults.forEach((position) => {
      if (position.candidates && position.candidates.length > 0) {
        const winner = position.candidates[0] // Assuming sorted by votes
        summaryHTML += `
          <div class="border-b pb-3 mb-3 last:border-b-0">
            <h4 class="font-bold text-[#001f65] text-lg">${position.positionName}</h4>
            <div class="mt-2">
              <div class="flex items-center">
                <span class="inline-block w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
                <span class="font-semibold text-gray-900">${winner.candidateName}</span>
              </div>
              <div class="text-sm text-gray-600 ml-5">
                ${winner.departmentName ? `${winner.departmentName} • ` : ''}
                ${winner.voteCount?.toLocaleString() || 0} votes
                ${winner.votePercentage ? ` (${winner.votePercentage.toFixed(1)}%)` : ''}
              </div>
            </div>
          </div>
        `
      }
    })
    
    summaryHTML += '</div>'

    Swal.fire({
      title: `${departmentalElectionData?.title || 'Departmental Election'} Results Summary`,
      html: summaryHTML,
      width: '600px',
      confirmButtonText: 'Close',
      confirmButtonColor: '#001f65',
      customClass: {
        popup: 'rounded-xl'
      }
    })
  }

  // Calculate statistics from available data
  const getStatistics = () => {
    const stats = {
      totalVotes: 0,
      turnoutRate: 0,
      totalCandidates: 0,
      totalPositions: 0,
      totalOfficers: 0,
      eligibleOfficers: 0
    }

    // From participation stats
    if (participationStats) {
      stats.totalVotes = participationStats.totalVoted || 0
      stats.turnoutRate = participationStats.turnoutPercentage || 0
      stats.eligibleOfficers = participationStats.totalEligible || 0
    }

    // From candidates data
    if (candidatesData) {
      stats.totalCandidates = candidatesData.data?.candidates?.length || 0
      stats.totalPositions = candidatesData.data?.positions?.length || 0
    }

    return stats
  }

  // Transform data for charts - departmental positions
  const getPresidentData = () => {
    if (!resultsData?.positionResults) return []
    
    const presidentPosition = resultsData.positionResults.find(
      pos => pos.positionName?.toLowerCase().includes('president') && 
             !pos.positionName?.toLowerCase().includes('vice')
    )
    
    if (!presidentPosition?.candidates) return []
    
    return presidentPosition.candidates.map((candidate, index) => ({
      name: candidate.candidateName,
      votes: candidate.voteCount || 0,
      percentage: candidate.votePercentage || 0,
      department: candidate.departmentName || 'Department'
    }))
  }

  const getVicePresidentData = () => {
    if (!resultsData?.positionResults) return []
    
    const vicePresidentPosition = resultsData.positionResults.find(
      pos => pos.positionName?.toLowerCase().includes('vice president')
    )
    
    if (!vicePresidentPosition?.candidates) return []
    
    return vicePresidentPosition.candidates.map((candidate, index) => ({
      name: candidate.candidateName,
      votes: candidate.voteCount || 0,
      percentage: candidate.votePercentage || 0,
      department: candidate.departmentName || 'Department'
    }))
  }

  const getSecretaryData = () => {
    if (!resultsData?.positionResults) return []
    
    const secretaryPosition = resultsData.positionResults.find(
      pos => pos.positionName?.toLowerCase().includes('secretary')
    )
    
    if (!secretaryPosition?.candidates) return []
    
    return secretaryPosition.candidates.map((candidate, index) => ({
      name: candidate.candidateName,
      votes: candidate.voteCount || 0,
      percentage: candidate.votePercentage || 0,
      department: candidate.departmentName || 'Department',
      rank: index + 1
    }))
  }

  const getTreasurerData = () => {
    if (!resultsData?.positionResults) return []
    
    const treasurerPosition = resultsData.positionResults.find(
      pos => pos.positionName?.toLowerCase().includes('treasurer')
    )
    
    if (!treasurerPosition?.candidates) return []
    
    return treasurerPosition.candidates.map((candidate, index) => ({
      name: candidate.candidateName,
      votes: candidate.voteCount || 0,
      percentage: candidate.votePercentage || 0,
      department: candidate.departmentName || 'Department',
      rank: index + 1
    }))
  }

  const getOtherPositionsData = () => {
    if (!resultsData?.positionResults) return []
    
    // Get all positions that aren't president, vice president, secretary, or treasurer
    const otherPositions = resultsData.positionResults.filter(
      pos => {
        const name = pos.positionName?.toLowerCase() || ''
        return !name.includes('president') && 
               !name.includes('secretary') && 
               !name.includes('treasurer')
      }
    )
    
    const allCandidates = []
    otherPositions.forEach(position => {
      if (position.candidates) {
        position.candidates.forEach((candidate, index) => {
          allCandidates.push({
            name: `${candidate.candidateName} (${position.positionName})`,
            votes: candidate.voteCount || 0,
            percentage: candidate.votePercentage || 0,
            position: position.positionName,
            department: candidate.departmentName || 'Department',
            rank: index + 1
          })
        })
      }
    })
    
    return allCandidates
  }

  // Get participation distribution for pie chart
  const getParticipationData = () => {
    if (!participationStats) return []

    return [
      { 
        name: 'Voted', 
        value: participationStats.totalVoted || 0, 
        color: '#059669' 
      },
      { 
        name: 'Confirmed but Not Voted', 
        value: (participationStats.totalConfirmed || 0) - (participationStats.totalVoted || 0), 
        color: '#0066ff' 
      },
      { 
        name: 'Not Confirmed', 
        value: (participationStats.totalEligible || 0) - (participationStats.totalConfirmed || 0), 
        color: '#6b7280' 
      }
    ].filter(item => item.value > 0)
  }

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{data.name}</p>
          {data.department && (
            <p className="text-sm text-gray-600">{data.department}</p>
          )}
          {data.position && (
            <p className="text-sm text-gray-600">{data.position}</p>
          )}
          <p className="text-[#001f65] font-medium">
            {payload[0].value?.toLocaleString()} votes {data.percentage && `(${data.percentage.toFixed(1)}%)`}
          </p>
        </div>
      )
    }
    return null
  }

  // Authentication screen
  if (!isAuthenticated) {
    return (
      <DepartmentalLayout
        deptElectionId={deptElectionId}
        title="Departmental Election Statistics"
        subtitle="Statistical Analysis & Results"
        activeItem="statistics"
      >
        <div className="min-h-screen flex items-center justify-center">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8 w-full max-w-md">
            <div className="text-center mb-6">
              <Lock className="w-12 h-12 mx-auto text-[#001f65] mb-4" />
              <h2 className="text-2xl font-bold text-[#001f65] mb-2">Restricted Access</h2>
              <p className="text-gray-600">Enter password to view statistics</p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="   "
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {authError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
                  <p className="text-red-700 text-sm">{authError}</p>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-[#001f65] hover:bg-[#003399] text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Access Statistics
              </button>
            </form>
          </div>
        </div>
      </DepartmentalLayout>
    )
  }

  if (!deptElectionId) {
    return (
      <DepartmentalLayout
        deptElectionId={null}
        title="Departmental Election Statistics"
        subtitle="Statistical Analysis & Results"
        activeItem="statistics"
      >
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20">
            <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Election Selected</h3>
            <p className="text-white/80 mb-6">Please select a departmental election to view statistics.</p>
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

  const statistics = getStatistics()
  const presidentData = getPresidentData()
  const vicePresidentData = getVicePresidentData()
  const secretaryData = getSecretaryData()
  const treasurerData = getTreasurerData()
  const otherPositionsData = getOtherPositionsData()
  const participationData = getParticipationData()

  return (
    <DepartmentalLayout
      deptElectionId={deptElectionId}
      title="Departmental Election Statistics"
      subtitle="Statistical Analysis & Results"
      activeItem="statistics"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with Results Button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            
          </div>

          <div className="flex gap-2">
            <button
              onClick={refreshData}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-white/20"
            >
              {loading ? (
                <Loader2 className="animate-spin rounded-full h-4 w-4 mr-2" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Refresh
            </button>
            
            <button
              onClick={showResultsSummary}
              className="flex items-center px-6 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors shadow-lg"
            >
              <Trophy className="w-4 h-4 mr-2" />
              View Results Summary
            </button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">Total Votes</h3>
                <p className="text-2xl font-bold text-[#001f65]">
                  {statistics.totalVotes.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">Officers voted</p>
              </div>
              <UserCheck className="w-10 h-10 text-[#001f65]/20" />
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">Turnout Rate</h3>
                <p className="text-2xl font-bold text-green-600">
                  {statistics.turnoutRate.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">Officer participation</p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-600/20" />
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">Total Candidates</h3>
                <p className="text-2xl font-bold text-blue-600">
                  {statistics.totalCandidates}
                </p>
                <p className="text-xs text-gray-500 mt-1">Running for positions</p>
              </div>
              <GraduationCap className="w-10 h-10 text-blue-600/20" />
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">Eligible Officers</h3>
                <p className="text-2xl font-bold text-purple-600">
                  {statistics.eligibleOfficers}
                </p>
                <p className="text-xs text-gray-500 mt-1">Can participate</p>
              </div>
              <Building className="w-10 h-10 text-purple-600/20" />
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin rounded-full h-8 w-8 text-white" />
            <span className="ml-3 text-white">Loading statistics...</span>
          </div>
        )}

        {/* Charts Section */}
        {!loading && (
          <div className="space-y-6">
            {/* Participation Distribution */}
            {participationData.length > 0 && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                <div className="flex items-center mb-4">
                  <Users className="w-6 h-6 text-[#001f65] mr-2" />
                  <h3 className="text-lg font-bold text-[#001f65]">Officer Participation Distribution</h3>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={participationData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({name, value}) => `${name} (${value})`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {participationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* President and Vice President - Pie Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* President Chart */}
              {presidentData.length > 0 && (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                  <div className="flex items-center mb-4">
                    <Crown className="w-6 h-6 text-yellow-600 mr-2" />
                    <h3 className="text-lg font-bold text-[#001f65]">Department President</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={presidentData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({name, percentage}) => `${name} (${percentage.toFixed(1)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="votes"
                      >
                        {presidentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS.primary[index % COLORS.primary.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Vice President Chart */}
              {vicePresidentData.length > 0 && (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                  <div className="flex items-center mb-4">
                    <Medal className="w-6 h-6 text-blue-600 mr-2" />
                    <h3 className="text-lg font-bold text-[#001f65]">Department Vice President</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={vicePresidentData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({name, percentage}) => `${name} (${percentage.toFixed(1)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="votes"
                      >
                        {vicePresidentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS.info[index % COLORS.info.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Secretary and Treasurer - Line Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Secretary Chart */}
              {secretaryData.length > 0 && (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                  <div className="flex items-center mb-4">
                    <Award className="w-6 h-6 text-green-600 mr-2" />
                    <h3 className="text-lg font-bold text-[#001f65]">Secretary</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={secretaryData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={0}
                      />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Line 
                        type="monotone" 
                        dataKey="votes" 
                        stroke="#059669" 
                        strokeWidth={3}
                        dot={{ fill: '#059669', strokeWidth: 2, r: 6 }}
                        activeDot={{ r: 8, stroke: '#059669', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Treasurer Chart */}
              {treasurerData.length > 0 && (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                  <div className="flex items-center mb-4">
                    <BarChart3 className="w-6 h-6 text-purple-600 mr-2" />
                    <h3 className="text-lg font-bold text-[#001f65]">Treasurer</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={treasurerData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={0}
                      />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Line 
                        type="monotone" 
                        dataKey="votes" 
                        stroke="#7c3aed" 
                        strokeWidth={3}
                        dot={{ fill: '#7c3aed', strokeWidth: 2, r: 6 }}
                        activeDot={{ r: 8, stroke: '#7c3aed', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Other Positions - Bar Chart */}
            {otherPositionsData.length > 0 && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                <div className="flex items-center mb-4">
                  <Users className="w-6 h-6 text-orange-600 mr-2" />
                  <h3 className="text-lg font-bold text-[#001f65]">Other Positions - Vote Distribution</h3>
                </div>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={otherPositionsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={120}
                      interval={0}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="votes" fill="#ea580c" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* No Data State */}
        {!loading && (!presidentData.length && !vicePresidentData.length && !secretaryData.length && !treasurerData.length && !otherPositionsData.length && !participationData.length) && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-12 text-center">
            <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Statistical Data Available</h3>
            <p className="text-gray-600 mb-4">
              Statistics and charts will appear here once voting begins and results are available.
            </p>
            <button
              onClick={refreshData}
              className="px-4 py-2 bg-[#001f65] hover:bg-[#003399] text-white rounded-lg transition-colors"
            >
              Refresh Data
            </button>
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

        {/* Election Status */}
        {departmentalElectionData && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle2 className="w-5 h-5 text-blue-500 mr-3 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-blue-900">
                  Election Status: <span className="capitalize">{departmentalElectionData.status}</span>
                </h4>
                <p className="text-blue-700 text-sm">
                  Election Date: {new Date(departmentalElectionData.electionDate).toLocaleDateString()}
                  {departmentalElectionData.departmentId && (
                    <span className="ml-4">
                      Department: {departmentalElectionData.departmentId.departmentCode}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Additional Statistics Cards */}
        {(participationStats || candidatesData) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Participation Summary */}
            {participationStats && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                <h3 className="text-lg font-semibold text-[#001f65] mb-4">Participation Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Eligible Officers:</span>
                    <span className="font-medium">{participationStats.totalEligible?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Confirmed:</span>
                    <span className="font-medium text-blue-600">{participationStats.totalConfirmed?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Voted:</span>
                    <span className="font-medium text-green-600">{participationStats.totalVoted?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-600">Turnout:</span>
                    <span className="font-bold text-[#001f65]">{participationStats.turnoutPercentage?.toFixed(1) || 0}%</span>
                  </div>
                </div>
              </div>
            )}

            

            {/* Department Info */}
            {departmentalElectionData?.departmentId && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                <h3 className="text-lg font-semibold text-[#001f65] mb-4">Department Info</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Code:</span>
                    <span className="font-medium">{departmentalElectionData.departmentId.departmentCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">College:</span>
                    <span className="font-medium text-blue-600">{departmentalElectionData.departmentId.college}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-600">Program:</span>
                    <span className="font-bold text-[#001f65] text-sm">{departmentalElectionData.departmentId.degreeProgram}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DepartmentalLayout>
  )
}