"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ssgElectionsAPI } from "@/lib/api/ssgElections"
import { votingAPI } from "@/lib/api/voting"
import { departmentsAPI } from "@/lib/api/departments"
import SSGLayout from "@/components/SSGLayout"
import Swal from 'sweetalert2'
import { 
  PieChart, 
  Pie, 
  Cell, 
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
  Building2,
  Download,
  RefreshCw,
  FileDown
} from "lucide-react"

export default function SSGStatisticsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [authError, setAuthError] = useState('')
  const [ssgElectionData, setSSGElectionData] = useState(null)
  const [resultsData, setResultsData] = useState(null)
  const [departments, setDepartments] = useState([])
  const [selectedDepartment, setSelectedDepartment] = useState(null)
  const [departmentResults, setDepartmentResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingDepartment, setLoadingDepartment] = useState(false)
  const [partylistColors, setPartylistColors] = useState({})
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

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
  }, [router])

  useEffect(() => {
    if (isAuthenticated && ssgElectionId) {
      fetchData()
    }
  }, [isAuthenticated, ssgElectionId])

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
        fetchResultsData(),
        fetchDepartments()
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

  const fetchResultsData = async () => {
  try {
    const response = await ssgElectionsAPI.getResults(ssgElectionId)
    setResultsData(response.data)
    
    // Pre-assign partylist colors when results are loaded
    assignPartylistColors(response.data)
  } catch (error) {
    console.error("Error fetching results:", error)
  }
}

  const fetchDepartments = async () => {
    try {
      const response = await departmentsAPI.getAll()
      const depts = response?.data || response?.departments || []
      setDepartments(depts)
    } catch (error) {
      console.error("Error loading departments:", error)
    }
  }

  const loadDepartmentResults = async (departmentId) => {
    try {
      setLoadingDepartment(true)
      setSelectedDepartment(departmentId)
      
      // Use correct staff endpoint
      const response = await votingAPI.getSSGElectionResultsByDepartment(ssgElectionId, departmentId)
      
      if (response?.success) {
        setDepartmentResults(response.data)
      }

      if (response?.data?.positions) {
  const deptPartylists = new Set()
  response.data.positions.forEach(position => {
    position.candidates?.forEach(candidate => {
      const partylistName = candidate.partylistName || candidate.candidate?.partylistId?.partylistName
      if (partylistName && partylistName !== 'Independent') {
        deptPartylists.add(partylistName)
      }
    })
  })
  
  // Assign any new partylists not already colored
  setPartylistColors(prev => {
    const updates = { ...prev }
    const partylistColorPalette = [
      '#EC4899', '#3B82F6', '#10B981', '#F59E0B', 
      '#8B5CF6', '#EF4444', '#14B8A6', '#F97316'
    ]
    
    Array.from(deptPartylists).forEach(name => {
      if (!updates[name]) {
        const colorIndex = Object.keys(updates).length % partylistColorPalette.length
        updates[name] = partylistColorPalette[colorIndex]
      }
    })
    
    return updates
  })
}
      
      setLoadingDepartment(false)
    } catch (error) {
      console.error("Error loading department results:", error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load department results'
      })
      setLoadingDepartment(false)
    }
  }

  const getPartylistColor = (partylistName) => {
  if (!partylistName || partylistName === 'Independent') {
    return '#6B7280' // Gray for Independent
  }
  
  // If color already assigned, return it
  if (partylistColors[partylistName]) {
    return partylistColors[partylistName]
  }
  
  // Predefined colors for first few partylists (pink and blue tones)
  const partylistColorPalette = [
    '#EC4899', // Pink
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Amber
    '#8B5CF6', // Purple
    '#EF4444', // Red
    '#14B8A6', // Teal
    '#F97316', // Orange
  ]
  
  // Get existing partylists count to determine next color
  // IMPORTANT: Check partylistColors state directly
  const existingPartylistNames = Object.keys(partylistColors)
  const colorIndex = existingPartylistNames.length % partylistColorPalette.length
  const newColor = partylistColorPalette[colorIndex]
  
  // Store the color for consistency
  // Use functional update to ensure we're working with latest state
  setPartylistColors(prev => {
    // Double-check it wasn't just added
    if (prev[partylistName]) {
      return prev
    }
    
    return {
      ...prev,
      [partylistName]: newColor
    }
  })
  
  return newColor
}

// Pre-assign colors to all partylists when data is loaded
const assignPartylistColors = (resultsData) => {
  if (!resultsData?.positionResults) return

  const partylistColorPalette = [
    '#EC4899', // Pink
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Amber
    '#8B5CF6', // Purple
    '#EF4444', // Red
    '#14B8A6', // Teal
    '#F97316', // Orange
  ]

  const allPartylists = new Set()
  
  // Collect all unique partylist names
  resultsData.positionResults.forEach(position => {
    position.candidates?.forEach(candidate => {
      const partylistName = candidate.partylistName
      if (partylistName && partylistName !== 'Independent') {
        allPartylists.add(partylistName)
      }
    })
  })

  // Assign colors to partylists
  const colorAssignments = {}
  Array.from(allPartylists).forEach((partylistName, index) => {
    const colorIndex = index % partylistColorPalette.length
    colorAssignments[partylistName] = partylistColorPalette[colorIndex]
  })

  setPartylistColors(colorAssignments)
}

  const handleDownloadStatistics = async () => {
    try {
      setDownloading(true)
      
      // Use the votingAPI export method (uses staff endpoint)
      const blob = await votingAPI.exportSSGElectionResults(ssgElectionId)
      
      // Create safe filename
      const electionTitle = ssgElectionData?.title || ssgElectionData?.ssgElectionId || 'Election'
      const safeTitle = electionTitle.replace(/[^a-zA-Z0-9]/g, '_')
      const timestamp = new Date().toISOString().split('T')[0]
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `SSG_Election_Statistics_${safeTitle}_${timestamp}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      Swal.fire({
        icon: 'success',
        title: 'Downloaded!',
        text: 'Statistics have been downloaded successfully.',
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      })
    } catch (error) {
      console.error("Error downloading statistics:", error)
      Swal.fire({
        icon: 'error',
        title: 'Download Failed',
        text: error.response?.data?.message || 'Failed to download statistics. Please try again.',
        confirmButtonColor: '#001f65'
      })
    } finally {
      setDownloading(false)
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

    let summaryHTML = '<div class="text-left space-y-4 max-h-96 overflow-y-auto">'
    
    resultsData.positionResults.forEach((position) => {
  if (position.candidates && position.candidates.length > 0) {
    const maxVotes = position.position?.maxVotes || 1 // Get maxVotes from position
    
    summaryHTML += `
      <div class="border-b pb-3 mb-3 last:border-b-0">
        <h4 class="font-bold text-[#001f65] text-lg mb-2">
          ${position.positionName}
        </h4>
    `
    
    position.candidates.forEach((candidate, idx) => {
      // Highlight winners based on maxVotes
      const isWinner = idx < maxVotes
      
      summaryHTML += `
        <div class="flex items-center justify-between py-2 px-3 rounded ${isWinner ? 'bg-yellow-100 border-l-4 border-yellow-500' : ''}">
          <div class="flex items-center gap-2">
            <div>
              <span class="font-semibold ${isWinner ? 'text-[#001f65]' : 'text-gray-700'}">${candidate.candidateName}</span>
              ${candidate.partylistName ? `<span class="text-xs text-gray-600 ml-2">${candidate.partylistName}</span>` : ''}
            </div>
          </div>
          <div class="text-right">
            <div class="font-bold ${isWinner ? 'text-[#001f65]' : 'text-gray-700'}">${candidate.voteCount?.toLocaleString() || 0}</div>
            <div class="text-xs text-gray-500">${candidate.votePercentage ? `${candidate.votePercentage.toFixed(1)}%` : '0%'}</div>
          </div>
        </div>
      `
    })
    
    summaryHTML += '</div>'
  }
})
    
    summaryHTML += '</div>'

    Swal.fire({
      title: `${ssgElectionData?.title || 'Election'} - Top Results`,
      html: summaryHTML,
      width: '700px',
      confirmButtonText: 'Close',
      confirmButtonColor: '#001f65',
      customClass: {
        popup: 'rounded-xl'
      }
    })
  }

  // Transform data for charts
  const getPresidentData = () => {
    if (!resultsData?.positionResults) return []
    
    const presidentPosition = resultsData.positionResults.find(
      pos => pos.positionName?.toLowerCase().includes('president') && 
             !pos.positionName?.toLowerCase().includes('vice')
    )
    
    if (!presidentPosition?.candidates) return []
    
    return presidentPosition.candidates.map((candidate) => ({
      name: candidate.candidateName,
      votes: candidate.voteCount || 0,
      percentage: candidate.votePercentage || 0,
      partylist: candidate.partylistName || 'Independent'
    }))
  }

  const getVicePresidentData = () => {
    if (!resultsData?.positionResults) return []
    
    const vicePresidentPosition = resultsData.positionResults.find(
      pos => pos.positionName?.toLowerCase().includes('vice president')
    )
    
    if (!vicePresidentPosition?.candidates) return []
    
    return vicePresidentPosition.candidates.map((candidate) => ({
      name: candidate.candidateName,
      votes: candidate.voteCount || 0,
      percentage: candidate.votePercentage || 0,
      partylist: candidate.partylistName || 'Independent'
    }))
  }

  const getSenatorData = () => {
    if (!resultsData?.positionResults) return []
    
    const senatorPosition = resultsData.positionResults.find(
      pos => pos.positionName?.toLowerCase().includes('senator')
    )
    
    if (!senatorPosition?.candidates) return []
    
    return senatorPosition.candidates.map((candidate, index) => ({
      name: candidate.candidateName,
      votes: candidate.voteCount || 0,
      percentage: candidate.votePercentage || 0,
      partylist: candidate.partylistName || 'Independent',
      rank: index + 1
    }))
  }

  const getDepartmentChartData = () => {
  if (!departmentResults?.positions) return { president: [], vicePresident: [], senators: [] }
  
  const president = departmentResults.positions.find(
    pos => pos.position.positionName?.toLowerCase().includes('president') && 
           !pos.position.positionName?.toLowerCase().includes('vice')
  )
  
  const vicePresident = departmentResults.positions.find(
    pos => pos.position.positionName?.toLowerCase().includes('vice president')
  )
  
  const senators = departmentResults.positions.find(
    pos => pos.position.positionName?.toLowerCase().includes('senator')
  )

  // Helper function to safely get candidate name
  const getCandidateName = (candidate) => {
    // Try different possible paths for candidate name
    if (candidate.candidateName) return candidate.candidateName
    if (candidate.voterId?.firstName && candidate.voterId?.lastName) {
      return `${candidate.voterId.firstName} ${candidate.voterId.lastName}`
    }
    if (candidate.candidate?.voterId?.firstName && candidate.candidate?.voterId?.lastName) {
      return `${candidate.candidate.voterId.firstName} ${candidate.candidate.voterId.lastName}`
    }
    return 'Unknown Candidate'
  }

  return {
    president: president?.candidates.map(c => ({
      name: getCandidateName(c),
      votes: c.departmentVoteCount || 0,
      percentage: c.percentage || 0,
      partylist: c.partylistName || c.candidate?.partylistId?.partylistName || 'Independent'
    })) || [],
    vicePresident: vicePresident?.candidates.map(c => ({
      name: getCandidateName(c),
      votes: c.departmentVoteCount || 0,
      percentage: c.percentage || 0,
      partylist: c.partylistName || c.candidate?.partylistId?.partylistName || 'Independent'
    })) || [],
    senators: senators?.candidates.map(c => ({
      name: getCandidateName(c),
      votes: c.departmentVoteCount || 0,
      percentage: c.percentage || 0,
      partylist: c.partylistName || c.candidate?.partylistId?.partylistName || 'Independent'
    })) || []
  }
}

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{data.name}</p>
          {data.partylist && (
            <p className="text-sm text-gray-600">{data.partylist}</p>
          )}
          <p className="text-[#001f65] font-medium">
            {payload[0].value?.toLocaleString()} votes {data.percentage && `(${data.percentage.toFixed(1)}%)`}
          </p>
        </div>
      )
    }
    return null
  }

  // Custom Legend Component for Pie Charts
  // Custom Legend Component for Pie Charts
const CustomPieLegend = ({ data }) => {
  return (
    <div className="mt-4 grid grid-cols-1 gap-2">
      {data.map((entry, index) => (
        <div key={`legend-${index}`} className="flex items-center gap-2">
          <div 
            className="w-4 h-4 rounded" 
            style={{ backgroundColor: getPartylistColor(entry.partylist) }}
          />
          <span className="text-sm text-gray-700">
            {entry.name} - {entry.votes.toLocaleString()} votes ({entry.percentage.toFixed(1)}%)
            {entry.partylist && entry.partylist !== 'Independent' && (
              <span className="text-xs text-gray-500 ml-1">({entry.partylist})</span>
            )}
          </span>
        </div>
      ))}
    </div>
  )
}

  // Authentication screen
  if (!isAuthenticated) {
    return (
      <SSGLayout
        ssgElectionId={ssgElectionId}
        title="Election Statistics"
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
                  placeholder="Enter password"
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
      </SSGLayout>
    )
  }

  if (!ssgElectionId) {
    return (
      <SSGLayout
        ssgElectionId={null}
        title="Election Statistics"
        subtitle="Statistical Analysis & Results"
        activeItem="statistics"
      >
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20">
            <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Election Selected</h3>
            <p className="text-white/80 mb-6">Please select an election to view statistics.</p>
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

  const presidentData = getPresidentData()
  const vicePresidentData = getVicePresidentData()
  const senatorData = getSenatorData()
  const deptChartData = getDepartmentChartData()

  return (
    <SSGLayout
      ssgElectionId={ssgElectionId}
      title="Election Statistics"
      subtitle="Statistical Analysis & Results"
      activeItem="statistics"
    >
      <div className="max-w-7xl mx-auto space-y-6 p-4">
        {/* Header with Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2"></h2>
            <p className="text-white/80">
              {/* {ssgElectionData?.title} - {ssgElectionData?.electionYear} */}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={refreshData}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-white/20"
            >
              {loading ? (
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Refresh
            </button>
            
            <button
              onClick={showResultsSummary}
              className="flex items-center px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors shadow-lg"
            >
              <Trophy className="w-4 h-4 mr-2" />
              Summary
            </button>

            <button
              onClick={handleDownloadStatistics}
              disabled={downloading}
              className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
            >
              {downloading ? (
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
              ) : (
                <FileDown className="w-4 h-4 mr-2" />
              )}
              Download
            </button>

            <button
              onClick={() => router.push(`/ecommittee/ssg/results?ssgElectionId=${ssgElectionId}`)}
              disabled={ssgElectionData?.status !== 'completed'}
              className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Results
            </button>
          </div>
        </div>

        {/* Department Cards */}
        <div className="mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {departments.map((dept) => (
              <button
                key={dept._id}
                onClick={() => loadDepartmentResults(dept._id)}
                className={`bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg border-2 transition-all hover:shadow-xl hover:scale-105 ${
                  selectedDepartment === dept._id 
                    ? 'border-[#001f65] bg-blue-50' 
                    : 'border-white/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-[#001f65] text-white rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <h3 className="font-bold text-[#001f65] text-sm truncate">
                      {dept.departmentCode}
                    </h3>
                    <p className="text-xs text-gray-600 truncate">
                      {dept.college}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          
          {selectedDepartment && (
            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  setSelectedDepartment(null)
                  setDepartmentResults(null)
                }}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors border border-white/30"
              >
                Clear Department Filter
              </button>
            </div>
          )}
        </div>

        {/* Loading State */}
        {(loading || loadingDepartment) && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin h-8 w-8 text-white mr-3" />
            <span className="text-white">Loading data...</span>
          </div>
        )}

        {/* Charts Section */}
        {!loading && !loadingDepartment && (
          <div className="space-y-6">
            {selectedDepartment && departmentResults ? (
              <>
                {/* Department Results Header */}
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                  <h2 className="text-2xl font-bold text-white text-center mb-2">
                    Department Results
                  </h2>
                  <p className="text-blue-100 text-center">
                    {departmentResults.department?.departmentCode} - {departmentResults.department?.degreeProgram}
                  </p>
                  <p className="text-blue-200 text-center text-sm mt-2">
                    Total Ballots: {departmentResults.summary?.totalDepartmentBallots || 0}
                  </p>
                </div>

                {/* Department Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Department President Chart */}
                  {deptChartData.president.length > 0 && (
                    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                      <h3 className="text-lg font-bold text-[#001f65] mb-4">President</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
  data={deptChartData.president}
  cx="50%"
  cy="50%"
  outerRadius={80}
  fill="#8884d8"
  dataKey="votes"
>
  {deptChartData.president.map((entry, index) => (
    <Cell key={`cell-${index}`} fill={getPartylistColor(entry.partylist)} />
  ))}
</Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <CustomPieLegend data={deptChartData.president}  />
                    </div>
                  )}

                  {/* Department Vice President Chart */}
                  {deptChartData.vicePresident.length > 0 && (
                    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                      <h3 className="text-lg font-bold text-[#001f65] mb-4">Vice President</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
  data={deptChartData.vicePresident}
  cx="50%"
  cy="50%"
  outerRadius={80}
  fill="#8884d8"
  dataKey="votes"
>
  {deptChartData.vicePresident.map((entry, index) => (
    <Cell key={`cell-${index}`} fill={getPartylistColor(entry.partylist)} />
  ))}
</Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <CustomPieLegend data={deptChartData.vicePresident} />
                    </div>
                  )}
                </div>

                {/* Department Senators Bar Chart */}
                {deptChartData.senators.length > 0 && (
                  <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                    <h3 className="text-lg font-bold text-[#001f65] mb-4">Senators</h3>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={deptChartData.senators}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="name" 
                          angle={-45}
                          textAnchor="end"
                          height={100}
                          interval={0}
                        />
                        <YAxis />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="votes">
  {deptChartData.senators.map((entry, index) => (
    <Cell key={`cell-${index}`} fill={getPartylistColor(entry.partylist)} />
  ))}
</Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Overall Results Header */}
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                  <h2 className="text-2xl font-bold text-white text-center">Overall Election Results</h2>
                </div>

                {/* Overall Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* President Chart */}
                  {presidentData.length > 0 && (
                    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                      <div className="flex items-center mb-4">
                        <Trophy className="w-6 h-6 text-yellow-600 mr-2" />
                        <h3 className="text-lg font-bold text-[#001f65]">President</h3>
                      </div>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
  data={presidentData}
  cx="50%"
  cy="50%"
  outerRadius={80}
  fill="#8884d8"
  dataKey="votes"
>
  {presidentData.map((entry, index) => (
    <Cell key={`cell-${index}`} fill={getPartylistColor(entry.partylist)} />
  ))}
</Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <CustomPieLegend data={presidentData} />
                    </div>
                  )}

                  {/* Vice President Chart */}
                  {vicePresidentData.length > 0 && (
                    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                      <div className="flex items-center mb-4">
                        <Award className="w-6 h-6 text-blue-600 mr-2" />
                        <h3 className="text-lg font-bold text-[#001f65]">Vice President</h3>
                      </div>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
  data={vicePresidentData}
  cx="50%"
  cy="50%"
  outerRadius={80}
  fill="#8884d8"
  dataKey="votes"
>
  {vicePresidentData.map((entry, index) => (
    <Cell key={`cell-${index}`} fill={getPartylistColor(entry.partylist)} />
  ))}
</Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <CustomPieLegend data={vicePresidentData} />
                    </div>
                  )}
                </div>

                {/* Senators Bar Chart */}
                {senatorData.length > 0 && (
                  <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                    <div className="flex items-center mb-4">
                      <Users className="w-6 h-6 text-green-600 mr-2" />
                      <h3 className="text-lg font-bold text-[#001f65]">Senators - Vote Distribution</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={senatorData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="name" 
                          angle={-45}
                          textAnchor="end"
                          height={100}
                          interval={0}
                        />
                        <YAxis />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="votes">
  {senatorData.map((entry, index) => (
    <Cell key={`cell-${index}`} fill={getPartylistColor(entry.partylist)} />
  ))}
</Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* No Data State */}
        {!loading && !loadingDepartment && (!presidentData.length && !vicePresidentData.length && !senatorData.length) && !selectedDepartment && (
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
              Ã—
            </button>
          </div>
        )}

      </div>
    </SSGLayout>
  )
}