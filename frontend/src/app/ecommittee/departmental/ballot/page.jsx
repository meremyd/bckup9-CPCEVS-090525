"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { departmentalElectionsAPI } from "@/lib/api/departmentalElections"
import { positionsAPI } from "@/lib/api/positions"
import { candidatesAPI } from "@/lib/api/candidates"
import { ballotAPI } from "@/lib/api/ballots"
import DepartmentalLayout from "@/components/DepartmentalLayout"
import Swal from 'sweetalert2'
import { 
  Vote,
  Users,
  AlertCircle,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  Square,
  Eye,
  Loader2,
  Building2,
  GraduationCap,
  School,
  Trophy,
  UserCheck,
  BarChart3,
  RefreshCw
} from "lucide-react"

export default function DepartmentalBallotPage() {
  const [election, setElection] = useState(null)
  const [department, setDepartment] = useState(null)
  const [positions, setPositions] = useState([])
  const [positionStates, setPositionStates] = useState({}) // Track ballot state for each position
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState({})
  const [error, setError] = useState('')
  const [lastRefresh, setLastRefresh] = useState(null)

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
      if (parsedUser.userType !== "election_committee") {
        router.push("/adminlogin")
        return
      }
    } catch (parseError) {
      console.error("Error parsing user data:", parseError)
      router.push("/adminlogin")
      return
    }

    if (deptElectionId) {
      loadElectionData()
    } else {
      setError('No election ID provided')
      setLoading(false)
    }
  }, [deptElectionId, router])

  const loadElectionData = async () => {
    try {
      setLoading(true)
      setError('')

      // Load election details
      const electionResponse = await departmentalElectionsAPI.getById(deptElectionId)
      const electionData = electionResponse.success ? electionResponse.data : electionResponse.election || electionResponse
      setElection(electionData)

      // Load department details if available
      if (electionData.departmentId) {
        try {
          const deptId = electionData.departmentId._id || electionData.departmentId
          const deptResponse = await departmentsAPI.getById(deptId)
          const departmentData = deptResponse.success ? deptResponse.data : deptResponse
          setDepartment(departmentData)
        } catch (deptError) {
          console.warn('Could not fetch department details:', deptError)
          if (typeof electionData.departmentId === 'object') {
            setDepartment(electionData.departmentId)
          }
        }
      }

      // Load positions for this election
      const positionsResponse = await positionsAPI.departmental.getByElection(deptElectionId)
      const positionsData = positionsResponse.success ? positionsResponse.data : positionsResponse.positions || []
      
      // Load position details with candidates and ballot states
      const enrichedPositions = await Promise.all(
        positionsData.map(async (position) => {
          try {
            // Get candidates for this position
            const candidatesResponse = await candidatesAPI.departmental.getByElection(deptElectionId, {
              positionId: position._id
            })
            const candidates = candidatesResponse.success ? candidatesResponse.data.candidates : candidatesResponse.candidates || []

            // Get ballot statistics for this position
            const ballotStats = await ballotAPI.getDepartmentalBallotStatistics(deptElectionId)
            const positionStats = ballotStats.data?.positionBreakdown?.[position._id] || {
              totalBallots: 0,
              submittedBallots: 0,
              pendingBallots: 0,
              activeBallots: 0
            }

            return {
              ...position,
              candidates: candidates,
              candidateCount: candidates.length,
              ballotStats: positionStats,
              ballotState: 'closed' // Default state, will be updated from actual ballot status
            }
          } catch (error) {
            console.warn(`Error loading data for position ${position._id}:`, error)
            return {
              ...position,
              candidates: [],
              candidateCount: 0,
              ballotStats: {
                totalBallots: 0,
                submittedBallots: 0,
                pendingBallots: 0,
                activeBallots: 0
              },
              ballotState: 'closed'
            }
          }
        })
      )

      setPositions(enrichedPositions)
      setLastRefresh(new Date())

    } catch (error) {
      console.error("Error loading election data:", error)
      setError(error.message || 'Failed to load election data')
    } finally {
      setLoading(false)
    }
  }

  const handleBallotAction = async (positionId, action) => {
    try {
      setActionLoading(prev => ({ ...prev, [positionId]: action }))

      const position = positions.find(p => p._id === positionId)
      if (!position) {
        throw new Error('Position not found')
      }

      let result
      let successMessage = ''
      let confirmTitle = ''
      let confirmText = ''

      switch (action) {
        case 'open':
          confirmTitle = 'Open Ballot for Voting?'
          confirmText = `Allow voters to start casting ballots for ${position.positionName}?`
          successMessage = `Ballot opened for ${position.positionName}`
          break
        case 'close':
          confirmTitle = 'Close Ballot?'
          confirmText = `Stop accepting new votes for ${position.positionName}? Active ballots will remain valid.`
          successMessage = `Ballot closed for ${position.positionName}`
          break
        case 'release':
          confirmTitle = 'Release Ballot Results?'
          confirmText = `Make the results public for ${position.positionName}? This action cannot be undone.`
          successMessage = `Results released for ${position.positionName}`
          break
        default:
          throw new Error('Invalid action')
      }

      // Show confirmation dialog
      const confirmResult = await Swal.fire({
        title: confirmTitle,
        text: confirmText,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#001f65',
        cancelButtonColor: '#6b7280',
        confirmButtonText: `Yes, ${action}`,
        cancelButtonText: 'Cancel'
      })

      if (!confirmResult.isConfirmed) {
        return
      }

      // Execute the action (placeholder - implement actual API calls)
      switch (action) {
        case 'open':
          // API call to open ballot for position
          // result = await ballotAPI.openDepartmentalBallot(deptElectionId, positionId)
          break
        case 'close':
          // API call to close ballot for position
          // result = await ballotAPI.closeDepartmentalBallot(deptElectionId, positionId)
          break
        case 'release':
          // API call to release results for position
          // result = await ballotAPI.releaseDepartmentalResults(deptElectionId, positionId)
          break
      }

      // Update position state locally
      setPositions(prev => prev.map(p => 
        p._id === positionId 
          ? { ...p, ballotState: action === 'open' ? 'open' : action === 'close' ? 'closed' : 'released' }
          : p
      ))

      // Show success message
      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: successMessage,
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      })

      // Refresh data to get updated statistics
      setTimeout(() => {
        loadElectionData()
      }, 1000)

    } catch (error) {
      console.error(`Error ${action} ballot:`, error)
      
      Swal.fire({
        icon: 'error',
        title: `Failed to ${action} ballot`,
        text: error.message || `An error occurred while trying to ${action} the ballot`,
        confirmButtonColor: '#001f65'
      })
    } finally {
      setActionLoading(prev => ({ ...prev, [positionId]: null }))
    }
  }

  const getBallotStateInfo = (state) => {
    switch (state) {
      case 'open':
        return {
          color: 'bg-green-500/20 text-green-700 border-green-300',
          icon: <Play className="w-4 h-4" />,
          label: 'OPEN'
        }
      case 'closed':
        return {
          color: 'bg-red-500/20 text-red-700 border-red-300',
          icon: <Pause className="w-4 h-4" />,
          label: 'CLOSED'
        }
      case 'released':
        return {
          color: 'bg-blue-500/20 text-blue-700 border-blue-300',
          icon: <Eye className="w-4 h-4" />,
          label: 'RELEASED'
        }
      default:
        return {
          color: 'bg-gray-500/20 text-gray-700 border-gray-300',
          icon: <Square className="w-4 h-4" />,
          label: 'INACTIVE'
        }
    }
  }

  const formatDepartmentInfo = (dept) => {
    if (!dept) return { code: 'N/A', degreeProgram: 'N/A', college: 'N/A' }
    
    return {
      code: dept.departmentCode || 'N/A',
      degreeProgram: dept.degreeProgram || 'N/A',
      college: dept.college || 'N/A'
    }
  }

  const renderPositionCard = (position) => {
    const ballotState = getBallotStateInfo(position.ballotState)
    const isLoading = actionLoading[position._id]

    return (
      <div key={position._id} className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
        {/* Position Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Trophy className="w-6 h-6 text-[#001f65] mr-3" />
            <div>
              <h3 className="text-lg font-bold text-[#001f65]">{position.positionName}</h3>
              <p className="text-sm text-[#001f65]/60">Order: {position.positionOrder || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {ballotState.icon}
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${ballotState.color}`}>
              {ballotState.label}
            </span>
          </div>
        </div>

        {/* Position Description */}
        {position.description && (
          <div className="mb-4 p-3 bg-[#b0c8fe]/10 rounded-lg">
            <p className="text-sm text-[#001f65]/80">{position.description}</p>
          </div>
        )}

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="bg-[#b0c8fe]/20 rounded-lg p-3 text-center">
            <UserCheck className="w-5 h-5 text-[#001f65] mx-auto mb-1" />
            <p className="text-sm font-medium text-[#001f65]">Candidates</p>
            <p className="text-lg font-bold text-[#001f65]">{position.candidateCount}</p>
          </div>
          
          <div className="bg-[#b0c8fe]/20 rounded-lg p-3 text-center">
            <BarChart3 className="w-5 h-5 text-[#001f65] mx-auto mb-1" />
            <p className="text-sm font-medium text-[#001f65]">Total Votes</p>
            <p className="text-lg font-bold text-[#001f65]">{position.ballotStats.submittedBallots}</p>
          </div>
          
          <div className="bg-[#b0c8fe]/20 rounded-lg p-3 text-center">
            <Clock className="w-5 h-5 text-[#001f65] mx-auto mb-1" />
            <p className="text-sm font-medium text-[#001f65]">Active</p>
            <p className="text-lg font-bold text-[#001f65]">{position.ballotStats.activeBallots || 0}</p>
          </div>
          
          <div className="bg-[#b0c8fe]/20 rounded-lg p-3 text-center">
            <Users className="w-5 h-5 text-[#001f65] mx-auto mb-1" />
            <p className="text-sm font-medium text-[#001f65]">Pending</p>
            <p className="text-lg font-bold text-[#001f65]">{position.ballotStats.pendingBallots || 0}</p>
          </div>
        </div>

        {/* Candidates List */}
        {position.candidates && position.candidates.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-[#001f65] mb-2">Candidates:</h4>
            <div className="flex flex-wrap gap-2">
              {position.candidates.map((candidate, index) => (
                <span 
                  key={candidate._id || index}
                  className="px-2 py-1 bg-[#b0c8fe]/30 text-[#001f65] text-sm rounded-md"
                >
                  #{candidate.candidateNumber} {candidate.name || candidate.fullName || 'Unknown'}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {position.ballotState === 'closed' && (
            <button
              onClick={() => handleBallotAction(position._id, 'open')}
              disabled={isLoading}
              className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading === 'open' ? (
                <Loader2 className="animate-spin w-4 h-4 mr-2" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Open Ballot
            </button>
          )}

          {position.ballotState === 'open' && (
            <button
              onClick={() => handleBallotAction(position._id, 'close')}
              disabled={isLoading}
              className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading === 'close' ? (
                <Loader2 className="animate-spin w-4 h-4 mr-2" />
              ) : (
                <Pause className="w-4 h-4 mr-2" />
              )}
              Close Ballot
            </button>
          )}

          {(position.ballotState === 'closed' || position.ballotState === 'open') && position.ballotStats.submittedBallots > 0 && (
            <button
              onClick={() => handleBallotAction(position._id, 'release')}
              disabled={isLoading}
              className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading === 'release' ? (
                <Loader2 className="animate-spin w-4 h-4 mr-2" />
              ) : (
                <Eye className="w-4 h-4 mr-2" />
              )}
              Release Results
            </button>
          )}

          {position.ballotState === 'released' && (
            <div className="flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg">
              <CheckCircle className="w-4 h-4 mr-2" />
              Results Released
            </div>
          )}
        </div>
      </div>
    )
  }

  if (!deptElectionId) {
    return (
      <DepartmentalLayout
        deptElectionId={null}
        title="Ballot Management"
        subtitle="Position Ballot Control"
        activeItem="ballots"
      >
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20">
            <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Election Selected</h3>
            <p className="text-white/80 mb-6">Please select an election to manage its ballots.</p>
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

  const deptInfo = formatDepartmentInfo(department)

  return (
    <DepartmentalLayout
      deptElectionId={deptElectionId}
      title="Ballot Management"
      subtitle="Position Ballot Control"
      activeItem="ballots"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Election Overview Header */}
        {election && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[#001f65] flex items-center">
                <Vote className="w-6 h-6 mr-2" />
                Ballot Management
              </h2>
              <button
                onClick={loadElectionData}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-[#001f65] hover:bg-[#003399] text-white rounded-lg disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <Loader2 className="animate-spin w-4 h-4 mr-2" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Refresh
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Election Info */}
              <div>
                <h3 className="text-lg font-semibold text-[#001f65] mb-2">{election.title}</h3>
                <p className="text-sm text-[#001f65]/60 mb-3">ID: {election.deptElectionId}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-[#001f65]/80">
                    <Calendar className="w-4 h-4 mr-2" />
                    Year: {election.electionYear}
                  </div>
                  <div className="flex items-center text-[#001f65]/80">
                    <Clock className="w-4 h-4 mr-2" />
                    Status: <span className="ml-1 font-medium">{election.status?.toUpperCase()}</span>
                  </div>
                </div>
              </div>

              {/* Department Info */}
              <div>
                <h3 className="text-lg font-semibold text-[#001f65] mb-3">Department Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-[#001f65]/80">
                    <Building2 className="w-4 h-4 mr-2" />
                    Code: {deptInfo.code}
                  </div>
                  <div className="flex items-center text-[#001f65]/80">
                    <GraduationCap className="w-4 h-4 mr-2" />
                    Program: {deptInfo.degreeProgram}
                  </div>
                  <div className="flex items-center text-[#001f65]/80">
                    <School className="w-4 h-4 mr-2" />
                    College: {deptInfo.college}
                  </div>
                </div>
              </div>
            </div>

            {lastRefresh && (
              <div className="mt-4 pt-4 border-t border-[#001f65]/20">
                <p className="text-xs text-[#001f65]/60">
                  Last updated: {lastRefresh.toLocaleString()}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="animate-spin w-8 h-8 mx-auto text-[#001f65] mb-4" />
              <p className="text-[#001f65]/80">Loading positions and ballot data...</p>
            </div>
          </div>
        )}

        {/* Positions Grid */}
        {!loading && positions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                Election Positions ({positions.length})
              </h3>
              <div className="text-sm text-white/80">
                Total positions available for voting
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {positions
                .sort((a, b) => (a.positionOrder || 0) - (b.positionOrder || 0))
                .map(renderPositionCard)}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && positions.length === 0 && !error && (
          <div className="text-center py-12">
            <div className="bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20 inline-block">
              <Trophy className="w-12 h-12 mx-auto text-white/60 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No Positions Found</h3>
              <p className="text-white/80 mb-6">This election doesn't have any positions configured yet.</p>
              <button
                onClick={() => router.push(`/ecommittee/departmental/positions?deptElectionId=${deptElectionId}`)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Add Positions
              </button>
            </div>
          </div>
        )}
      </div>
    </DepartmentalLayout>
  )
}