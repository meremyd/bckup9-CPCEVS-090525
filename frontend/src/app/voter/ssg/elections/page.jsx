"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ssgElectionsAPI } from "@/lib/api/ssgElections"
import { electionParticipationAPI } from "@/lib/api/electionParticipation"
import VoterLayout from '@/components/VoterLayout'
import Swal from 'sweetalert2'
import { 
  Vote,
  Loader2,
  ChevronRight,
  Calendar,
  Clock,
  Info,
  Eye,
  BarChart3,
  Trophy,
  Users,
  Home,
  AlertCircle,
  Fingerprint
} from "lucide-react"

export default function VoterSSGElectionsPage() {
  const [elections, setElections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [voter, setVoter] = useState(null)
  const [votingStatus, setVotingStatus] = useState({})
  const router = useRouter()

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      try {
        const voterToken = localStorage.getItem("voterToken")
        if (!voterToken) {
          router.push("/voterlogin")
          return
        }

        // Get voter info from token or API
        const voterData = JSON.parse(localStorage.getItem("voterData") || "{}")
        setVoter(voterData)

        await loadElections()
      } catch (error) {
        console.error("Auth check error:", error)
        setError("Authentication error occurred")
      }
    }

    checkAuthAndLoadData()
  }, [router])

  const loadElections = async () => {
    try {
      setLoading(true)
      // Pass empty status to get all elections regardless of status
      const response = await ssgElectionsAPI.getAllForVoters({ status: '' })
      console.log('SSG Elections response:', response)
      
      let electionsData = []
      if (response?.success && response?.data?.elections) {
        electionsData = response.data.elections
      } else if (response?.elections) {
        electionsData = response.elections
      } else {
        electionsData = []
      }

      // Check voting status for each election
      await loadVotingStatus(electionsData)
      
    } catch (error) {
      console.error("Error loading SSG elections:", error)
      setError("Failed to load elections")
      setElections([])
    } finally {
      setLoading(false)
    }
  }

  const loadVotingStatus = async (electionsData) => {
  try {
    const statusPromises = electionsData.map(async (election) => {
      try {
        // Use election participation API to check voting status
        const statusResponse = await electionParticipationAPI.getSSGVotingStatus(election._id)
        return {
          electionId: election._id,
          hasVoted: statusResponse?.hasVoted || false,
          votingStatus: statusResponse?.votingStatus || 'not_voted'
        }
      } catch (error) {
        console.error(`Error checking voting status for election ${election._id}:`, error)
        return {
          electionId: election._id,
          hasVoted: false,
          votingStatus: 'not_voted'
        }
      }
    })

    const statusResults = await Promise.all(statusPromises)
    
    // Create status map
    const statusMap = {}
    statusResults.forEach(result => {
      statusMap[result.electionId] = result.hasVoted
    })
    
    setVotingStatus(statusMap)

    // Add hasVoted property to elections
    const electionsWithStatus = electionsData.map(election => ({
      ...election,
      hasVoted: statusMap[election._id] || false
    }))
    
    setElections(electionsWithStatus)
    
  } catch (error) {
    console.error("Error loading voting status:", error)
    // Set elections without voting status if there's an error
    setElections(electionsData)
  }
}

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-100'
      case 'upcoming':
        return 'bg-yellow-500/20 text-yellow-100'
      case 'completed':
        return 'bg-blue-500/20 text-blue-100'
      default:
        return 'bg-gray-500/20 text-gray-100'
    }
  }

  const formatDate = (date) => {
    if (!date) return 'TBD'
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTime = (time24) => {
    if (!time24) return ''
    try {
      const [hours, minutes] = time24.split(':').map(Number)
      const period = hours >= 12 ? 'PM' : 'AM'
      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
    } catch (error) {
      return 'Invalid time'
    }
  }

  const getFingerprintColor = (hasVoted) => {
    return hasVoted ? 'text-blue-600' : 'text-gray-400'
  }

  const handleElectionClick = (election) => {
    // Store election data for use in other pages
    localStorage.setItem('selectedSSGElectionForVoter', JSON.stringify(election))
    router.push(`/voter/ssg/info?id=${election._id}`)
  }

  const handleBackToDashboard = () => {
    router.push('/voter/dashboard')
  }

  if (loading) {
    return (
      <VoterLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20">
            <Loader2 className="animate-spin rounded-full h-12 w-12 mx-auto text-white" />
            <p className="mt-4 text-white font-medium">Loading SSG elections...</p>
          </div>
        </div>
      </VoterLayout>
    )
  }

  if (error) {
    return (
      <VoterLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-xl max-w-md mx-auto border border-white/20">
            <div className="text-red-500 text-6xl mb-4 text-center">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Error</h2>
            <p className="text-gray-600 mb-4 text-center">{error}</p>
            <div className="space-y-2">
              <button
                onClick={loadElections}
                className="w-full bg-[#001f65] hover:bg-[#003399] text-white px-6 py-2 rounded-lg transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={handleBackToDashboard}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </VoterLayout>
    )
  }

  return (
    <VoterLayout>
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-sm shadow-lg border-b border-white/30 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-br from-[#001f65] to-[#003399] rounded-lg flex items-center justify-center mr-3 shadow-lg">
              <Vote className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#001f65]">SSG Elections</h1>
              <p className="text-xs text-[#001f65]/70">Student Supreme Government Elections</p>
            </div>
          </div>
          
          <button
            onClick={handleBackToDashboard}
            className="flex items-center px-2 sm:px-4 py-2 text-xs sm:text-sm text-[#001f65] hover:bg-[#b0c8fe]/30 rounded-lg transition-colors border border-[#001f65]/20 bg-white/60 backdrop-blur-sm"
          >
            <Home className="w-4 h-4 mr-1 sm:mr-2" />
            Dashboard
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 lg:p-6">
        <div className="min-h-[calc(100vh-120px)]">
          {/* Title and Info */}
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">SSG Elections</h2>
            <p className="text-white/80">View and participate in Student Supreme Government elections</p>
            
            {/* {voter && (
              <p className="text-white/60 text-sm mt-2">
                Logged in as: {voter.firstName} {voter.lastName} ({voter.schoolId})
              </p>
            )} */}
          </div>

          {/* Elections Grid */}
          <div className="flex justify-center">
            <div className="w-full max-w-6xl">
              {elections.length === 0 ? (
                <div className="text-center">
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-12 border border-white/20">
                    <AlertCircle className="w-16 h-16 text-white/60 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">No SSG Elections Available</h3>
                    <p className="text-white/70">
                      There are currently no active SSG elections. Check back later for upcoming elections.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center">
                  {elections.map((election) => (
                    <div
                      key={election._id}
                      onClick={() => handleElectionClick(election)}
                      className="w-full max-w-xs bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg p-6 hover:bg-white/30 transition-all duration-200 cursor-pointer group relative overflow-hidden aspect-[3/4] flex flex-col"
                    >
                      {/* Fingerprint icon indicator */}
                      <div className="absolute top-4 right-4">
                        <Fingerprint className={`w-6 h-6 ${getFingerprintColor(election.hasVoted)} transition-colors duration-300`} />
                      </div>
                      
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                      
                      <div className="relative z-10 flex-1 flex flex-col">
                        {/* Status Badge */}
                        <div className="flex justify-between items-start mb-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(election.status)}`}>
                            {election.status?.toUpperCase() || 'ACTIVE'}
                          </span>
                          {/* Voting Status Badge */}
                          {election.hasVoted && (
                            <div className="bg-blue-500/20 text-blue-100 rounded-full px-2 py-1">
                              <span className="text-xs font-medium">✓ Voted</span>
                            </div>
                          )}
                        </div>

                        {/* Election Info */}
                        <div className="flex-1 flex flex-col justify-center text-center mb-6">
                          <h3 className="text-xl font-bold text-white mb-2 leading-tight">
                            {election.title || `SSG Election ${election.electionYear}`}
                          </h3>
                          <p className="text-blue-100 text-sm mb-2">
                            {election.electionYear}
                          </p>
                          {election.electionDate && (
                            <p className="text-blue-200 text-xs">
                              {new Date(election.electionDate).toLocaleDateString()}
                            </p>
                          )}
                          <p className="text-blue-200 text-xs mt-1">
                            ID: {election.ssgElectionId}
                          </p>
                          {/* Display ballot times in cards */}
                          {(election.ballotOpenTime || election.ballotCloseTime) && (
                            <div className="mt-2 space-y-1">
                              {election.ballotOpenTime && (
                                <p className="text-blue-200 text-xs">
                                  Opens: {formatTime(election.ballotOpenTime)}
                                </p>
                              )}
                              {election.ballotCloseTime && (
                                <p className="text-blue-200 text-xs">
                                  Closes: {formatTime(election.ballotCloseTime)}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* View Indicator */}
                        <div className="flex justify-center mt-auto">
                          <div className="flex items-center text-blue-100 text-sm">
                            <Fingerprint className={`w-4 h-4 mr-1 ${getFingerprintColor(election.hasVoted)}`} />
                            <span>{election.hasVoted ? 'Already Voted' : 'Click to vote'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </VoterLayout>
  )
}