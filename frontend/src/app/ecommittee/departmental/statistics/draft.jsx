"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { departmentalElectionsAPI } from "@/lib/api/departmentalElections"
import { votingAPI } from "@/lib/api/voting"
import DepartmentalLayout from "@/components/DepartmentalLayout"
import Swal from 'sweetalert2'
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend, 
  ResponsiveContainer
} from 'recharts'
import { 
  BarChart3,
  Users,
  Award,
  AlertCircle,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  Trophy,
  Download,
  RefreshCw,
  FileDown,
  ChevronDown
} from "lucide-react"

export default function DepartmentalStatisticsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [authError, setAuthError] = useState('')
  const [election, setElection] = useState(null)
  const [resultsData, setResultsData] = useState(null)
  const [selectedPosition, setSelectedPosition] = useState(null)
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  const router = useRouter()
  const searchParams = useSearchParams()
  const deptElectionId = searchParams.get('deptElectionId')

  // Color schemes for charts
  const COLORS = {
    primary: ['#001f65', '#003399', '#0052cc', '#0066ff', '#3385ff', '#66a3ff', '#99c2ff', '#cce0ff'],
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
      setElection(response.data)
    } catch (error) {
      console.error("Error fetching election data:", error)
      handleAPIError(error, 'Failed to load election data')
    }
  }

  const fetchResultsData = async () => {
    try {
      // Use staff endpoint for departmental election results
      const response = await votingAPI.getDepartmentalElectionLiveResults(deptElectionId)
      
      if (response?.success && response?.data) {
        setResultsData(response.data)
        
        // Auto-select first position if available
        if (response.data.positions && response.data.positions.length > 0) {
          setSelectedPosition(response.data.positions[0])
        }
      }
    } catch (error) {
      console.error("Error fetching results:", error)
      handleAPIError(error, 'Failed to load results data')
    }
  }

  const handleDownloadStatistics = async () => {
    try {
      setDownloading(true)
      
      // Use the votingAPI export method for departmental elections
      const blob = await votingAPI.exportDepartmentalElectionResults(deptElectionId)
      
      // Create safe filename
      const electionTitle = election?.title || election?.deptElectionId || 'Election'
      const safeTitle = electionTitle.replace(/[^a-zA-Z0-9]/g, '_')
      const timestamp = new Date().toISOString().split('T')[0]
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Departmental_Election_Statistics_${safeTitle}_${timestamp}.pdf`
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
    if (!resultsData || !resultsData.positions) {
      Swal.fire({
        icon: 'info',
        title: 'No Results Available',
        text: 'Results will be available once voting has started.',
        confirmButtonColor: '#001f65'
      })
      return
    }

    let summaryHTML = '<div class="text-left space-y-4 max-h-96 overflow-y-auto">'
    
    resultsData.positions.forEach((position) => {
      if (position.candidates && position.candidates.length > 0) {
        summaryHTML += `
          <div class="border-b pb-3 mb-3 last:border-b-0">
            <h4 class="font-bold text-[#001f65] text-lg mb-2">
              ${position.position.positionName}
            </h4>
        `
        
        position.candidates.forEach((candidate, idx) => {
          const isLeading = idx === 0 && candidate.voteCount > 0
          
          summaryHTML += `
            <div class="flex items-center justify-between py-2 px-3 rounded ${isLeading ? 'bg-yellow-100 border-l-4 border-yellow-500' : ''}">
              <div class="flex items-center gap-2">
                <div>
                  <span class="font-semibold ${isLeading ? 'text-[#001f65]' : 'text-gray-700'}">
                    ${candidate.voterId?.firstName || ''} ${candidate.voterId?.lastName || 'Unknown'}
                  </span>
                  <span class="text-xs text-gray-600 ml-2">#${candidate.candidateNumber}</span>
                </div>
              </div>
              <div class="text-right">
                <div class="font-bold ${isLeading ? 'text-[#001f65]' : 'text-gray-700'}">${candidate.voteCount?.toLocaleString() || 0}</div>
                <div class="text-xs text-gray-500">${candidate.percentage ? `${candidate.percentage}%` : '0%'}</div>
              </div>
            </div>
          `
        })
        
        summaryHTML += '</div>'
      }
    })
    
    summaryHTML += '</div>'

    Swal.fire({
      title: `${election?.title || 'Election'} - Results Summary`,
      html: summaryHTML,
      width: '700px',
      confirmButtonText: 'Close',
      confirmButtonColor: '#001f65',
      customClass: {
        popup: 'rounded-xl'
      }
    })
  }

  const handlePositionChange = (e) => {
    const positionId = e.target.value
    const position = resultsData.positions.find(p => p.position._id === positionId)
    setSelectedPosition(position)
  }

  const getPositionChartData = () => {
    if (!selectedPosition?.candidates) return []
    
    return selectedPosition.candidates.map((candidate) => {
      // Get candidate name from voterId
      const firstName = candidate.voterId?.firstName || ''
      const lastName = candidate.voterId?.lastName || ''
      const candidateName = `${firstName} ${lastName}`.trim() || `Candidate #${candidate.candidateNumber}`
      
      return {
        name: candidateName,
        votes: candidate.voteCount || 0,
        percentage: candidate.percentage || 0,
        candidateNumber: candidate.candidateNumber
      }
    })
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">Candidate #{data.candidateNumber}</p>
          <p className="text-[#001f65] font-medium">
            {payload[0].value?.toLocaleString()} votes ({data.percentage}%)
          </p>
        </div>
      )
    }
    return null
  }

  const CustomPieLegend = ({ data, colors }) => {
    return (
      <div className="mt-4 grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
        {data.map((entry, index) => (
          <div key={`legend-${index}`} className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded flex-shrink-0" 
              style={{ backgroundColor: colors[index % colors.length] }}
            />
            <span className="text-sm text-gray-700">
              {entry.name} - {entry.votes.toLocaleString()} votes ({entry.percentage}%)
            </span>
          </div>
        ))}
      </div>
    )
  }

  // Authentication screen
  if (!isAuthenticated) {
    return (
      <DepartmentalLayout
        deptElectionId={deptElectionId}
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
      </DepartmentalLayout>
    )
  }

  if (!deptElectionId) {
    return (
      <DepartmentalLayout
        deptElectionId={null}
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

  const positionChartData = getPositionChartData()

  return (
    <DepartmentalLayout
      deptElectionId={deptElectionId}
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
              {/* {election?.title} - {election?.electionYear} */}
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
              onClick={() => router.push(`/ecommittee/departmental/results?deptElectionId=${deptElectionId}`)}
              disabled={election?.status !== 'completed'}
              className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Results
            </button>
          </div>
        </div>

        {/* Position Selector */}
        {resultsData?.positions && resultsData.positions.length > 0 && (
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Position to View Statistics
            </label>
            <div className="relative">
              <select
                value={selectedPosition?.position._id || ''}
                onChange={handlePositionChange}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent appearance-none bg-white"
              >
                {resultsData.positions.map((position) => (
                  <option key={position.position._id} value={position.position._id}>
                    {position.position.positionName} ({position.totalVotes} votes cast)
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin h-8 w-8 text-white mr-3" />
            <span className="text-white">Loading data...</span>
          </div>
        )}

        {/* Charts Section */}
        {!loading && selectedPosition && (
          <div className="space-y-6">
            {/* Position Info Card */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <h2 className="text-2xl font-bold text-white text-center mb-2">
                {selectedPosition.position.positionName}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="bg-white/10 rounded-lg p-4 text-center">
                  <p className="text-blue-200 text-sm">Total Votes</p>
                  <p className="text-white text-2xl font-bold">{selectedPosition.totalVotes || 0}</p>
                </div>
                <div className="bg-white/10 rounded-lg p-4 text-center">
                  <p className="text-blue-200 text-sm">Total Participants</p>
                  <p className="text-white text-2xl font-bold">{selectedPosition.totalParticipants || 0}</p>
                </div>
                <div className="bg-white/10 rounded-lg p-4 text-center">
                  <p className="text-blue-200 text-sm">Candidates</p>
                  <p className="text-white text-2xl font-bold">{selectedPosition.candidates?.length || 0}</p>
                </div>
              </div>
            </div>

            {/* Pie Chart */}
            {positionChartData.length > 0 ? (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                <h3 className="text-lg font-bold text-[#001f65] mb-4 text-center">
                  Vote Distribution
                </h3>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={positionChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="votes"
                    >
                      {positionChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS.primary[index % COLORS.primary.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <CustomPieLegend data={positionChartData} colors={COLORS.primary} />
              </div>
            ) : (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-12 text-center">
                <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Vote Data Available</h3>
                <p className="text-gray-600">
                  No votes have been cast for this position yet.
                </p>
              </div>
            )}
          </div>
        )}

        {/* No Data State */}
        {!loading && (!resultsData?.positions || resultsData.positions.length === 0) && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-12 text-center">
            <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Positions Available</h3>
            <p className="text-gray-600 mb-4">
              Positions will appear here once they are added to the election.
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
      </div>
    </DepartmentalLayout>
  )
}