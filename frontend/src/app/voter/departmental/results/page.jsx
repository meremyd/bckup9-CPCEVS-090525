"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { votingAPI } from "@/lib/api/voting"
import VoterLayout from '@/components/VoterLayout'
import Swal from 'sweetalert2'
import {
  Loader2,
  ArrowLeft,
  LogOut,
  Trophy,
  Award,
  Lock,
  Clock,
  Users,
  CheckCircle
} from "lucide-react"

export default function VoterDepartmentalResultsPage() {
  const [election, setElection] = useState(null)
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const router = useRouter()
  const searchParams = useSearchParams()
  const electionId = searchParams.get('id')

  useEffect(() => {
    checkAuthAndLoadData()
  }, [electionId])

  const checkAuthAndLoadData = async () => {
    try {
      const voterToken = localStorage.getItem("voterToken")
      if (!voterToken) {
        router.push("/voterlogin")
        return
      }
      if (!electionId) {
        setError("No election ID provided")
        setLoading(false)
        return
      }
      await loadResults()
    } catch (error) {
      setError("Authentication error occurred")
      setLoading(false)
    }
  }

  const isBallotOpen = (position) => {
    if (!position?.ballotOpenTime || !position?.ballotCloseTime) {
      return false
    }

    const now = new Date()
    const openTime = new Date(position.ballotOpenTime)
    const closeTime = new Date(position.ballotCloseTime)

    return now >= openTime && now <= closeTime
  }

  const getPositionTimingInfo = (position) => {
    if (!position?.ballotOpenTime || !position?.ballotCloseTime) {
      return {
        status: 'not_scheduled',
        message: 'Ballot timing not set for this position'
      }
    }

    const now = new Date()
    const openTime = new Date(position.ballotOpenTime)
    const closeTime = new Date(position.ballotCloseTime)

    if (now < openTime) {
      const timeDiff = openTime - now
      const hours = Math.floor(timeDiff / (1000 * 60 * 60))
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
      return {
        status: 'scheduled',
        message: `Voting opens in ${hours}h ${minutes}m`,
        openTime: formatTimeDisplay(position.ballotOpenTime),
        closeTime: formatTimeDisplay(position.ballotCloseTime)
      }
    }

    if (now > closeTime) {
      return {
        status: 'closed',
        message: 'Voting has ended',
        openTime: formatTimeDisplay(position.ballotOpenTime),
        closeTime: formatTimeDisplay(position.ballotCloseTime)
      }
    }

    const timeDiff = closeTime - now
    const hours = Math.floor(timeDiff / (1000 * 60 * 60))
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))

    return {
      status: 'open',
      message: `Voting closes in ${hours}h ${minutes}m`,
      openTime: formatTimeDisplay(position.ballotOpenTime),
      closeTime: formatTimeDisplay(position.ballotCloseTime)
    }
  }

  const loadResults = async () => {
    try {
      setLoading(true)
      const resultsResponse = await votingAPI.getDepartmentalElectionLiveResultsForVoter(electionId)
      
      if (resultsResponse?.success) {
        setResults(resultsResponse.data)
        setElection(resultsResponse.data.election)
      } else {
        setError(resultsResponse?.message || "Could not load results")
      }
      setLoading(false)
    } catch (error) {
      console.error('Error loading results:', error)
      setError("Failed to load departmental election results")
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'You will be logged out of your account',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, logout',
      cancelButtonText: 'Cancel'
    })
    if (result.isConfirmed) {
      localStorage.removeItem("voterToken")
      localStorage.removeItem("voterData")
      router.push("/voterlogin")
      Swal.fire({
        title: 'Logged Out',
        text: 'You have been successfully logged out',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      })
    }
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      })
    } catch (error) {
      return 'Invalid date'
    }
  }

  const formatTimeDisplay = (timeString) => {
    if (!timeString) return ''
    try {
      // If it's already formatted as HH:mm, use it directly
      if (typeof timeString === 'string' && timeString.match(/^\d{2}:\d{2}$/)) {
        const [hours, minutes] = timeString.split(':').map(Number)
        const period = hours >= 12 ? 'PM' : 'AM'
        const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
        return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
      }
      
      // Otherwise parse as Date
      const date = new Date(timeString)
      const hours = date.getHours()
      const minutes = date.getMinutes()
      const period = hours >= 12 ? 'PM' : 'AM'
      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
    } catch (error) {
      return 'Invalid time'
    }
  }

  const renderCandidateCard = (candidate, index, position) => {
    const ballotIsOpen = isBallotOpen(position)
    const totalParticipants = position.totalParticipants || 0
    
    return (
      <div
        key={candidate._id}
        className="bg-white/95 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-lg border border-white/20 hover:shadow-xl transition-shadow mb-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            {/* Rank Badge */}
            <div className={`flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 text-white rounded-lg flex items-center justify-center font-bold text-2xl ${
              index === 0 ? 'bg-red-600' : index === 1 ? 'bg-blue-600' : 'bg-gray-600'
            }`}>
              {index + 1}
            </div>

            {/* Candidate Info */}
            <div className="min-w-0 flex-1">
              {ballotIsOpen ? (
                <>
                  <p className="text-xs text-amber-600 font-semibold mb-1 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Anonymous
                  </p>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-400">
                    Candidate #{candidate.candidateNumber}
                  </h3>
                  <p className="text-xs text-gray-400">Name revealed after voting closes</p>
                </>
              ) : (
                <>
                  <h3 className="text-lg sm:text-xl font-bold text-[#001f65]">
                    {candidate.name || `Candidate #${candidate.candidateNumber}`}
                  </h3>
                  {candidate.yearLevel && (
                    <p className="text-xs text-gray-500">Year {candidate.yearLevel}</p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Vote Count */}
          <div className="text-right flex-shrink-0 ml-4">
            <div className="text-2xl font-bold text-[#001f65]">
              {candidate.voteCount?.toLocaleString() ?? 0}
            </div>
            {candidate.percentage !== undefined && (
              <div className="text-sm text-gray-500">{candidate.percentage}%</div>
            )}
            {index === 0 && candidate.voteCount > 0 && !ballotIsOpen && (
              <div className="mt-1">
                <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded">
                  LEADING
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderPositionResults = (position) => {
    const timing = getPositionTimingInfo(position)
    const ballotIsOpen = isBallotOpen(position)
    const totalVotes = position.totalVotes || 0
    const totalParticipants = position.totalParticipants || 0

    return (
      <div className="mb-8" key={position._id}>
        {/* Position Header Card */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-lg border border-white/20 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-bold text-[#001f65] mb-2">
                {position.positionName}
              </h2>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  <span>Votes Cast: <span className="font-semibold">{totalVotes} of {totalParticipants}</span></span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>Participants: <span className="font-semibold">{totalParticipants}</span></span>
                </div>
              </div>
            </div>
            
            {/* Ballot Status Badge */}
            {timing && timing.status !== 'not_scheduled' && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg flex-shrink-0 whitespace-nowrap ${
                ballotIsOpen 
                  ? 'bg-amber-100 text-amber-800' 
                  : timing.status === 'closed'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                <Clock className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium">{timing.message}</span>
              </div>
            )}
          </div>

          {/* Ballot Status Info Messages */}
          {ballotIsOpen && timing && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs sm:text-sm text-amber-800 font-medium flex items-center gap-2">
                <Lock className="w-4 h-4 flex-shrink-0" />
                Results are hidden while voting is open. Candidate names will be revealed when voting closes at {timing.closeTime}.
              </p>
            </div>
          )}

          {!ballotIsOpen && timing && timing.status === 'closed' && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs sm:text-sm text-blue-800 font-medium">
                Voting closed at {timing.closeTime}
              </p>
            </div>
          )}

          {timing && timing.status === 'scheduled' && (
            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-xs sm:text-sm text-gray-800 font-medium">
                Voting opens at {timing.openTime}
              </p>
            </div>
          )}

          {timing && timing.status === 'not_scheduled' && (
            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-xs sm:text-sm text-gray-800 font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 flex-shrink-0" />
                Ballot for this position has not been opened yet. Check back later.
              </p>
            </div>
          )}
        </div>

        {/* Candidates List */}
        {position.candidates.length === 0 ? (
          <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 sm:p-8 shadow-lg border border-white/20 text-center">
            <Award className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium mb-1">No Candidates Yet</p>
            <p className="text-sm text-gray-500">
              Candidates for this position will appear here once registered by the election committee.
            </p>
          </div>
        ) : (
          position.candidates.map((candidate, idx) => renderCandidateCard(candidate, idx, position))
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <VoterLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20">
            <Loader2 className="animate-spin rounded-full h-12 w-12 mx-auto text-white" />
            <p className="mt-4 text-white font-medium">Loading election results...</p>
          </div>
        </div>
      </VoterLayout>
    )
  }

  if (error) {
    return (
      <VoterLayout>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-xl max-w-md mx-auto border border-white/20">
            <Award className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Unable to Load Results</h2>
            <p className="text-gray-600 mb-4 text-center">{error}</p>
            <button
              onClick={() => router.push('/voter/departmental/elections')}
              className="w-full bg-[#001f65] hover:bg-[#003399] text-white px-6 py-2 rounded-lg transition-colors"
            >
              Back to Elections
            </button>
          </div>
        </div>
      </VoterLayout>
    )
  }

  return (
    <VoterLayout>
      {/* Navbar */}
      <div className="bg-white/95 backdrop-blur-sm shadow-lg border-b border-white/30 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center min-w-0">
            <button
              onClick={() => router.push(`/voter/departmental/info?id=${electionId}`)}
              className="mr-2 sm:mr-3 p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-[#001f65]" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-[#001f65] truncate">{election?.title}</h1>
              <p className="text-xs text-[#001f65]/70">Live Results</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center px-2 sm:px-4 py-2 text-xs sm:text-sm text-red-600 hover:bg-red-50/80 rounded-lg transition-colors border border-red-200 bg-white/60 backdrop-blur-sm flex-shrink-0"
          >
            <LogOut className="w-4 h-4 mr-0 sm:mr-2" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 lg:p-6">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#001f65] to-[#003399] rounded-full mb-4">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">{election?.title}</h1>
            <p className="text-lg text-blue-100 mb-1">{formatDateTime(election?.electionDate)}</p>
            <p className="text-sm text-blue-200/80">Departmental Election Results</p>
            
            {/* Total Participants Summary */}
            {results?.totalParticipants > 0 && (
              <div className="mt-4 inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                <Users className="w-5 h-5 text-white" />
                <span className="text-white font-medium">
                  {results.totalParticipants} {results.totalParticipants === 1 ? 'Participant' : 'Participants'}
                </span>
              </div>
            )}
          </div>

          {results?.positions && results.positions.length > 0 ? (
            results.positions.map(position => renderPositionResults(position))
          ) : (
            <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 sm:p-8 shadow-lg border border-white/20 text-center">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No Positions Available</p>
              <p className="text-sm text-gray-500 mt-2">
                The election committee will open positions for voting soon. Check back later for live results.
              </p>
            </div>
          )}
        </div>
      </div>
    </VoterLayout>
  )
}