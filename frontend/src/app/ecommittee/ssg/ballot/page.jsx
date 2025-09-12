"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ballotAPI } from "@/lib/api/ballots"
import { candidatesAPI } from "@/lib/api/candidates"
import { votingAPI } from "@/lib/api/voting"
import SSGLayout from "@/components/SSGLayout"
import Swal from 'sweetalert2'
import { 
  Vote,
  Lock,
  Unlock,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  ArrowLeft,
  ArrowRight,
  Loader2,
  WifiOff,
  AlertTriangle,
  Shield
} from "lucide-react"

export default function SSGBallotPage() {
  const [election, setElection] = useState(null)
  const [ballot, setBallot] = useState(null)
  const [candidates, setCandidates] = useState([])
  const [positions, setPositions] = useState([])
  const [currentPositionIndex, setCurrentPositionIndex] = useState(0)
  const [selectedVotes, setSelectedVotes] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [isBallotOpen, setIsBallotOpen] = useState(false)
  const [error, setError] = useState('')
  const [networkError, setNetworkError] = useState(false)
  const [tooManyRequests, setTooManyRequests] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const ssgElectionId = searchParams.get('ssgElectionId')

  useEffect(() => {
    // Check for admin/committee authentication
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
      fetchElectionData()
    } else {
      setError('No election ID provided')
    }
  }, [ssgElectionId, router])

  useEffect(() => {
    // Timer for ballot timeout
    if (timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining(prev => prev - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (timeRemaining === 0) {
      handleBallotTimeout()
    }
  }, [timeRemaining])

  const fetchElectionData = async () => {
    try {
      setIsLoading(true)
      setError('')
      setNetworkError(false)

      // Get election details and candidates
      const [electionResponse, candidatesResponse] = await Promise.all([
        votingAPI.getSSGElectionDetails(ssgElectionId),
        candidatesAPI.ssg.getForVoter(ssgElectionId)
      ])

      setElection(electionResponse)
      setCandidates(candidatesResponse.candidates || [])

      // Group candidates by position and sort positions
      const positionGroups = {}
      candidatesResponse.candidates?.forEach(candidate => {
        const positionName = candidate.positionId?.positionName
        if (positionName) {
          if (!positionGroups[positionName]) {
            positionGroups[positionName] = {
              position: candidate.positionId,
              candidates: []
            }
          }
          positionGroups[positionName].candidates.push(candidate)
        }
      })

      // Sort positions: President, Vice President, then others
      const sortedPositions = Object.values(positionGroups).sort((a, b) => {
        const order = ['President', 'Vice President', 'Senator']
        const aIndex = order.indexOf(a.position.positionName)
        const bIndex = order.indexOf(b.position.positionName)
        
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
        if (aIndex !== -1) return -1
        if (bIndex !== -1) return 1
        return a.position.positionName.localeCompare(b.position.positionName)
      })

      setPositions(sortedPositions)

      // Check if voter already has an active ballot
      const ballotStatus = await ballotAPI.getVoterSSGBallotStatus(ssgElectionId)
      if (ballotStatus.ballot && !ballotStatus.ballot.isSubmitted) {
        setBallot(ballotStatus.ballot)
        setIsBallotOpen(true)
        // Load existing votes
        const existingVotes = {}
        ballotStatus.ballot.votes?.forEach(vote => {
          existingVotes[vote.positionId] = vote.candidateId
        })
        setSelectedVotes(existingVotes)
        
        // Set remaining time if available
        if (ballotStatus.ballot.timeRemaining) {
          setTimeRemaining(ballotStatus.ballot.timeRemaining)
        }
      }

    } catch (error) {
      console.error("Error fetching election data:", error)
      handleApiError(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleApiError = (error) => {
    if (error.message?.includes('Too many requests') || error.response?.status === 429) {
      setTooManyRequests(true)
      setError('Too many requests. Please wait a moment before trying again.')
    } else if (error.message?.includes('Network Error') || !navigator.onLine) {
      setNetworkError(true)
      setError('Network connection error. Please check your internet connection.')
    } else {
      const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred'
      setError(errorMessage)
    }
  }

  const handleOpenBallot = async () => {
    try {
      setIsLoading(true)
      setError('')
      setTooManyRequests(false)
      setNetworkError(false)

      const response = await ballotAPI.startSSGBallotWithTimeout(ssgElectionId)
      setBallot(response.ballot)
      setIsBallotOpen(true)
      setSelectedVotes({})
      
      // Set ballot timeout (usually 15 minutes)
      if (response.ballot.timeRemaining) {
        setTimeRemaining(response.ballot.timeRemaining)
      }

      Swal.fire({
        icon: 'success',
        title: 'Ballot Opened',
        text: 'You can now cast your votes. Remember to submit before the time expires.',
        timer: 3000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      })

    } catch (error) {
      console.error("Error opening ballot:", error)
      handleApiError(error)
      
      Swal.fire({
        icon: 'error',
        title: 'Cannot Open Ballot',
        text: error.response?.data?.message || error.message || 'Failed to open ballot',
        confirmButtonColor: '#001f65'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCloseBallot = async () => {
    if (Object.keys(selectedVotes).length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No Votes Cast',
        text: 'You haven\'t selected any candidates. Are you sure you want to close the ballot?',
        showCancelButton: true,
        confirmButtonColor: '#001f65',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, close ballot',
        cancelButtonText: 'Continue voting'
      }).then(async (result) => {
        if (result.isConfirmed) {
          await abandonBallot()
        }
      })
      return
    }

    Swal.fire({
      title: 'Submit Ballot?',
      text: 'Once submitted, you cannot change your votes. Are you sure?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#001f65',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, submit ballot',
      cancelButtonText: 'Continue voting'
    }).then(async (result) => {
      if (result.isConfirmed) {
        await submitBallot()
      }
    })
  }

  const submitBallot = async () => {
    try {
      setIsLoading(true)
      setError('')

      // First cast all votes
      for (const [positionId, candidateId] of Object.entries(selectedVotes)) {
        await votingAPI.castSSGVote({
          ballotId: ballot._id,
          candidateId: candidateId,
          positionId: positionId
        })
      }

      // Then submit the ballot
      await ballotAPI.submitSSGBallot(ballot._id)
      
      setIsBallotOpen(false)
      setBallot(null)
      setSelectedVotes({})
      setTimeRemaining(null)

      Swal.fire({
        icon: 'success',
        title: 'Ballot Submitted!',
        text: 'Your votes have been successfully recorded.',
        confirmButtonColor: '#001f65'
      }).then(() => {
        router.push('/voter/dashboard')
      })

    } catch (error) {
      console.error("Error submitting ballot:", error)
      handleApiError(error)
      
      Swal.fire({
        icon: 'error',
        title: 'Submission Failed',
        text: error.response?.data?.message || error.message || 'Failed to submit ballot',
        confirmButtonColor: '#001f65'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const abandonBallot = async () => {
    try {
      setIsLoading(true)
      
      await ballotAPI.abandonSSGBallot(ballot._id)
      
      setIsBallotOpen(false)
      setBallot(null)
      setSelectedVotes({})
      setTimeRemaining(null)

      Swal.fire({
        icon: 'info',
        title: 'Ballot Closed',
        text: 'Your ballot has been closed without submitting votes.',
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      })

    } catch (error) {
      console.error("Error abandoning ballot:", error)
      handleApiError(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBallotTimeout = () => {
    setIsBallotOpen(false)
    setBallot(null)
    setSelectedVotes({})
    setTimeRemaining(null)

    Swal.fire({
      icon: 'warning',
      title: 'Ballot Expired',
      text: 'Your ballot has expired. Please start a new ballot to vote.',
      confirmButtonColor: '#001f65'
    })
  }

  const handleVoteSelection = (positionId, candidateId) => {
    const currentPosition = positions[currentPositionIndex]
    if (currentPosition.position.positionName === 'Senator') {
      // For senators, allow multiple selections (up to the maximum allowed)
      const currentVotes = Object.entries(selectedVotes)
        .filter(([key, value]) => key.startsWith(positionId))
        .map(([key, value]) => value)
      
      const maxSenators = 12 // Adjust based on election rules
      
      if (currentVotes.includes(candidateId)) {
        // Remove vote
        const newVotes = { ...selectedVotes }
        const voteKey = Object.keys(newVotes).find(key => newVotes[key] === candidateId && key.startsWith(positionId))
        delete newVotes[voteKey]
        setSelectedVotes(newVotes)
      } else if (currentVotes.length < maxSenators) {
        // Add vote
        const voteKey = `${positionId}_${Date.now()}`
        setSelectedVotes({
          ...selectedVotes,
          [voteKey]: candidateId
        })
      } else {
        Swal.fire({
          icon: 'warning',
          title: 'Maximum Selections Reached',
          text: `You can only select up to ${maxSenators} senators.`,
          confirmButtonColor: '#001f65'
        })
      }
    } else {
      // For single positions (President, Vice President)
      setSelectedVotes({
        ...selectedVotes,
        [positionId]: candidateId
      })
    }
  }

  const isSelected = (positionId, candidateId) => {
    if (positions[currentPositionIndex]?.position.positionName === 'Senator') {
      return Object.values(selectedVotes).includes(candidateId)
    }
    return selectedVotes[positionId] === candidateId
  }

  const formatTime = (seconds) => {
    if (!seconds) return "00:00"
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getCurrentPosition = () => {
    return positions[currentPositionIndex]
  }

  const canGoNext = () => {
    return currentPositionIndex < positions.length - 1
  }

  const canGoPrevious = () => {
    return currentPositionIndex > 0
  }

  if (!ssgElectionId) {
    return (
      <SSGLayout
        ssgElectionId={null}
        title="SSG Ballot"
        subtitle="Voting Interface"
        activeItem="ballot"
      >
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20">
            <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Election Selected</h3>
            <p className="text-white/80 mb-6">Please select an election to access the ballot.</p>
            <button
              onClick={() => router.push('/voter/dashboard')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </SSGLayout>
    )
  }

  return (
    <SSGLayout
      ssgElectionId={ssgElectionId}
      title="SSG Ballot"
      subtitle="Voting Interface"
      activeItem="ballot"
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Ballot Controls */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-bold text-[#001f65] flex items-center">
                <Vote className="w-6 h-6 mr-2" />
                {election?.title || 'SSG Election'}
              </h2>
              {timeRemaining && (
                <div className="flex items-center bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
                  <Clock className="w-4 h-4 mr-1" />
                  Time: {formatTime(timeRemaining)}
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              {!isBallotOpen ? (
                <button
                  onClick={handleOpenBallot}
                  disabled={isLoading}
                  className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin w-4 h-4 mr-2" />
                  ) : (
                    <Unlock className="w-4 h-4 mr-2" />
                  )}
                  Open Ballot
                </button>
              ) : (
                <button
                  onClick={handleCloseBallot}
                  disabled={isLoading}
                  className="flex items-center px-4 py-2 bg-[#001f65] hover:bg-[#003399] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin w-4 h-4 mr-2" />
                  ) : (
                    <Lock className="w-4 h-4 mr-2" />
                  )}
                  Submit Ballot
                </button>
              )}
            </div>
          </div>

          {/* Error Messages */}
          {error && (
            <div className={`mb-4 p-4 rounded-lg flex items-center ${
              networkError ? 'bg-orange-50 border border-orange-200' :
              tooManyRequests ? 'bg-yellow-50 border border-yellow-200' :
              'bg-red-50 border border-red-200'
            }`}>
              {networkError ? (
                <WifiOff className="w-5 h-5 text-orange-500 mr-3 flex-shrink-0" />
              ) : tooManyRequests ? (
                <AlertTriangle className="w-5 h-5 text-yellow-500 mr-3 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
              )}
              <div>
                <p className={
                  networkError ? 'text-orange-700' :
                  tooManyRequests ? 'text-yellow-700' :
                  'text-red-700'
                }>
                  {error}
                </p>
                {networkError && (
                  <button
                    onClick={fetchElectionData}
                    className="text-sm text-orange-600 hover:text-orange-800 underline mt-1"
                  >
                    Retry Connection
                  </button>
                )}
                {tooManyRequests && (
                  <p className="text-sm text-yellow-600 mt-1">
                    Wait 60 seconds before trying again.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Position Navigation */}
        {isBallotOpen && positions.length > 0 && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentPositionIndex(Math.max(0, currentPositionIndex - 1))}
                disabled={!canGoPrevious()}
                className="flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </button>
              
              <div className="flex items-center space-x-4">
                <span className="text-[#001f65] font-medium">
                  Position {currentPositionIndex + 1} of {positions.length}
                </span>
                <div className="flex space-x-1">
                  {positions.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentPositionIndex(index)}
                      className={`w-3 h-3 rounded-full transition-colors ${
                        index === currentPositionIndex
                          ? 'bg-[#001f65]'
                          : 'bg-gray-300 hover:bg-gray-400'
                      }`}
                    />
                  ))}
                </div>
              </div>
              
              <button
                onClick={() => setCurrentPositionIndex(Math.min(positions.length - 1, currentPositionIndex + 1))}
                disabled={!canGoNext()}
                className="flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          </div>
        )}

        {/* Ballot Content */}
        {isBallotOpen && getCurrentPosition() && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8">
            <div className="text-center mb-8">
              <div className="bg-[#b0c8fe]/20 rounded-lg p-6 mb-6">
                <h1 className="text-3xl font-bold text-[#001f65] mb-2">
                  {election?.electionYear} SSG ELECTION
                </h1>
                <h2 className="text-2xl font-semibold text-[#001f65] mb-4">
                  {getCurrentPosition().position.positionName}
                </h2>
                {getCurrentPosition().position.positionName === 'Senator' && (
                  <p className="text-[#001f65]/70 text-sm">
                    Select up to 12 senators
                  </p>
                )}
              </div>
            </div>

            {/* Candidates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getCurrentPosition().candidates.map((candidate) => (
                <div
                  key={candidate._id}
                  onClick={() => handleVoteSelection(getCurrentPosition().position._id, candidate._id)}
                  className={`relative bg-white rounded-2xl border-2 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                    isSelected(getCurrentPosition().position._id, candidate._id)
                      ? 'border-[#001f65] bg-[#b0c8fe]/10'
                      : 'border-gray-200 hover:border-[#001f65]/50'
                  }`}
                >
                  {/* Selection Indicator */}
                  {isSelected(getCurrentPosition().position._id, candidate._id) && (
                    <div className="absolute top-4 right-4 bg-[#001f65] text-white rounded-full p-2">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                  )}

                  <div className="p-6 text-center">
                    {/* Candidate Image */}
                    <div className="w-32 h-32 mx-auto mb-4 bg-gray-200 rounded-full overflow-hidden">
                      {candidate.campaignPicture ? (
                        <img
                          src={`data:image/jpeg;base64,${candidate.campaignPicture}`}
                          alt={candidate.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <Users className="w-16 h-16" />
                        </div>
                      )}
                    </div>

                    {/* Candidate Info */}
                    <h3 className="font-bold text-[#001f65] text-lg mb-2">
                      {candidate.fullName || 'Unknown Candidate'}
                    </h3>
                    
                    {candidate.partylistId && (
                      <p className="text-[#001f65]/70 text-sm font-medium mb-2">
                        {candidate.partylistId.partylistName}
                      </p>
                    )}

                    <div className="space-y-1 text-sm text-[#001f65]/60">
                      <p>School ID: {candidate.voterId?.schoolId || 'N/A'}</p>
                      <p>Department: {candidate.voterId?.departmentId?.departmentCode || 'N/A'}</p>
                      <p>Year Level: {candidate.voterId?.yearLevel || 'N/A'}</p>
                    </div>

                    {candidate.platform && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600 text-left">
                          {candidate.platform.length > 100 
                            ? `${candidate.platform.substring(0, 100)}...`
                            : candidate.platform
                          }
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Selection Summary */}
            {getCurrentPosition().position.positionName === 'Senator' && (
              <div className="mt-6 text-center">
                <p className="text-[#001f65]/70">
                  Selected: {Object.values(selectedVotes).filter(vote => 
                    getCurrentPosition().candidates.some(c => c._id === vote)
                  ).length} of 12 senators
                </p>
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {isLoading && !isBallotOpen && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-12">
            <div className="text-center">
              <Loader2 className="animate-spin w-12 h-12 mx-auto text-[#001f65] mb-4" />
              <h3 className="text-lg font-semibold text-[#001f65] mb-2">Loading Election Data</h3>
              <p className="text-[#001f65]/70">Please wait while we prepare your ballot...</p>
            </div>
          </div>
        )}

        {/* Ballot Closed State */}
        {!isBallotOpen && !isLoading && election && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-12">
            <div className="text-center">
              <Lock className="w-16 h-16 mx-auto text-[#001f65] mb-4" />
              <h3 className="text-xl font-bold text-[#001f65] mb-2">Ballot Closed</h3>
              <p className="text-[#001f65]/70 mb-6">Click "Open Ballot" to start voting.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
                <div className="bg-[#b0c8fe]/20 rounded-lg p-4">
                  <Shield className="w-8 h-8 mx-auto text-[#001f65] mb-2" />
                  <h4 className="font-semibold text-[#001f65] mb-1">Secure Voting</h4>
                  <p className="text-xs text-[#001f65]/70">Your votes are encrypted and anonymous</p>
                </div>
                
                <div className="bg-[#b0c8fe]/20 rounded-lg p-4">
                  <Clock className="w-8 h-8 mx-auto text-[#001f65] mb-2" />
                  <h4 className="font-semibold text-[#001f65] mb-1">Time Limited</h4>
                  <p className="text-xs text-[#001f65]/70">Complete voting within the time limit</p>
                </div>
                
                <div className="bg-[#b0c8fe]/20 rounded-lg p-4">
                  <CheckCircle className="w-8 h-8 mx-auto text-[#001f65] mb-2" />
                  <h4 className="font-semibold text-[#001f65] mb-1">One Chance</h4>
                  <p className="text-xs text-[#001f65]/70">Review carefully before submitting</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </SSGLayout>
  )
}