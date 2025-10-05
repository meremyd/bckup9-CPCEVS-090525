"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ballotAPI } from "@/lib/api/ballots"
import { candidatesAPI } from "@/lib/api/candidates"
import { electionParticipationAPI } from "@/lib/api/electionParticipation"
import VoterLayout from '@/components/VoterLayout'
import Swal from 'sweetalert2'
import { 
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  User,
  X
} from "lucide-react"

export default function SSGVoterBallotPage() {
  const [ballot, setBallot] = useState(null)
  const [election, setElection] = useState(null)
  const [positions, setPositions] = useState([])
  const [currentPositionIndex, setCurrentPositionIndex] = useState(0)
  const [selectedVotes, setSelectedVotes] = useState({})
  const [timeRemaining, setTimeRemaining] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const electionId = searchParams.get('id')
  const timerInterval = useRef(null)

  useEffect(() => {
    if (electionId) {
      initializeBallot()
    } else {
      router.push('/voter/ssg/elections')
    }

    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current)
      }
    }
  }, [electionId])

  const initializeBallot = async () => {
  try {
    setLoading(true)

    // Check ballot status
    const statusResponse = await ballotAPI.voter.getVoterSelectedSSGBallotStatus(electionId)
    
    if (statusResponse.hasVoted) {
      await showVotingReceipt()
      return
    }

    if (!statusResponse.canVote) {
      Swal.fire({
        icon: 'info',
        title: 'Cannot Vote',
        text: statusResponse.voterEligibility?.message || 'You cannot vote at this time.',
        confirmButtonColor: '#001f65'
      }).then(() => {
        router.push(`/voter/ssg/info?id=${electionId}`)
      })
      return
    }

    // Let the backend handle expired ballots - just start/continue ballot
    const startResponse = await ballotAPI.voter.startSSGBallot(electionId)
    const ballotData = startResponse.ballot

    setBallot(ballotData)
    setElection(statusResponse.election)

    // Get ballot preview with candidates
    const previewResponse = await ballotAPI.previewSSGBallot(electionId)
    setPositions(previewResponse.ballot)

    // Start timer if ballot has close time
    if (ballotData.ballotCloseTime) {
      const closeTime = new Date(ballotData.ballotCloseTime)
      const now = new Date()
      
      if (closeTime < now) {
        handleTimeExpired()
        return
      }
      
      startTimer(closeTime)
    }

  } catch (error) {
    console.error('Error initializing ballot:', error)
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: error.response?.data?.message || 'Failed to load ballot. Please try again.',
      confirmButtonColor: '#001f65'
    }).then(() => {
      router.push(`/voter/ssg/info?id=${electionId}`)
    })
  } finally {
    setLoading(false)
  }
}

  const startTimer = (closeTime) => {
    const updateTimer = () => {
      const now = new Date()
      const remaining = Math.max(0, Math.floor((closeTime - now) / 1000))
      
      setTimeRemaining(remaining)
      
      if (remaining <= 0) {
        clearInterval(timerInterval.current)
        handleTimeExpired()
      }
    }

    updateTimer()
    timerInterval.current = setInterval(updateTimer, 1000)
  }

  const handleTimeExpired = () => {
    Swal.fire({
      icon: 'warning',
      title: 'Time Expired',
      text: 'Your voting time has expired. The ballot will now close.',
      confirmButtonColor: '#001f65',
      allowOutsideClick: false
    }).then(() => {
      router.push(`/voter/ssg/info?id=${electionId}`)
    })
  }

  const formatTime = (seconds) => {
    if (seconds === null) return '00:00'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleCandidateSelect = (candidateId) => {
    const currentPosition = positions[currentPositionIndex]
    setSelectedVotes(prev => ({
      ...prev,
      [currentPosition.position._id]: candidateId
    }))
  }

  const handleNext = () => {
    if (currentPositionIndex < positions.length - 1) {
      setCurrentPositionIndex(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentPositionIndex > 0) {
      setCurrentPositionIndex(prev => prev - 1)
    }
  }

  const handleSubmit = async () => {
    // Check if all positions have votes
    const unvotedPositions = positions.filter(
      pos => !selectedVotes[pos.position._id]
    )

    if (unvotedPositions.length > 0) {
      const result = await Swal.fire({
        icon: 'warning',
        title: 'Incomplete Ballot',
        text: `You haven't voted for ${unvotedPositions.length} position(s). Do you want to continue?`,
        showCancelButton: true,
        confirmButtonColor: '#001f65',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Continue',
        cancelButtonText: 'Go Back'
      })

      if (!result.isConfirmed) return
    }

    const confirmResult = await Swal.fire({
      icon: 'question',
      title: 'Submit Ballot',
      text: 'Are you sure you want to submit your votes? This action cannot be undone.',
      showCancelButton: true,
      confirmButtonColor: '#001f65',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Submit',
      cancelButtonText: 'Cancel'
    })

    if (!confirmResult.isConfirmed) return

    try {
      setSubmitting(true)

      const votes = Object.entries(selectedVotes).map(([positionId, candidateId]) => ({
        positionId,
        candidateId
      }))

      await ballotAPI.voter.submitSelectedSSGBallot(ballot._id, votes)

      // Show voting receipt
      await showVotingReceipt()

    } catch (error) {
      console.error('Error submitting ballot:', error)
      Swal.fire({
        icon: 'error',
        title: 'Submission Failed',
        text: error.response?.data?.message || 'Failed to submit ballot. Please try again.',
        confirmButtonColor: '#001f65'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const showVotingReceipt = async () => {
    try {
      const votingStatus = await electionParticipationAPI.getSSGVotingStatus(electionId)
      
      await Swal.fire({
        icon: 'success',
        title: 'Vote Submitted Successfully!',
        html: `
          <div style="text-align: left; padding: 20px;">
            <p style="margin-bottom: 15px;"><strong>Election:</strong> ${election?.title || 'SSG Election'}</p>
            <p style="margin-bottom: 15px;"><strong>Status:</strong> <span style="color: #10b981; font-weight: bold;">VOTED</span></p>
            ${votingStatus.submittedAt ? `<p style="margin-bottom: 15px;"><strong>Voted At:</strong> ${new Date(votingStatus.submittedAt).toLocaleString()}</p>` : ''}
            <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">Thank you for participating in this election!</p>
          </div>
        `,
        confirmButtonColor: '#001f65',
        confirmButtonText: 'View Receipt',
        showCancelButton: true,
        cancelButtonText: 'Close',
        cancelButtonColor: '#6b7280'
      }).then((result) => {
        if (result.isConfirmed) {
          router.push(`/voter/ssg/info?id=${electionId}`)
        } else {
          router.push('/voter/ssg/elections')
        }
      })
    } catch (error) {
      console.error('Error showing receipt:', error)
      router.push(`/voter/ssg/info?id=${electionId}`)
    }
  }

  // Helper function to get campaign picture URL
  const getCampaignPictureUrl = (candidate) => {
    // Check if campaign picture data is embedded in candidate object
    if (candidate.campaignPicture) {
      if (candidate.campaignPicture.startsWith('data:')) {
        return candidate.campaignPicture
      } else {
        return `data:image/jpeg;base64,${candidate.campaignPicture}`
      }
    }
    
    // Fall back to API URL if no embedded data
    return candidatesAPI.voter.getCampaignPictureUrl(candidate._id)
  }

  if (loading) {
    return (
      <VoterLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20">
            <Loader2 className="animate-spin rounded-full h-12 w-12 mx-auto text-white" />
            <p className="mt-4 text-white font-medium">Loading ballot...</p>
          </div>
        </div>
      </VoterLayout>
    )
  }

  if (!ballot || positions.length === 0) {
    return (
      <VoterLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-xl max-w-md mx-auto">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Error</h2>
            <p className="text-gray-600 mb-4 text-center">Failed to load ballot</p>
            <button
              onClick={() => router.push(`/voter/ssg/info?id=${electionId}`)}
              className="w-full bg-[#001f65] hover:bg-[#003399] text-white px-6 py-2 rounded-lg transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </VoterLayout>
    )
  }

  const currentPosition = positions[currentPositionIndex]
  const currentVote = selectedVotes[currentPosition.position._id]

  return (
    <VoterLayout>
      {/* Header with Timer */}
      <div className="bg-white/95 backdrop-blur-sm shadow-lg border-b border-white/30 px-4 sm:px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#001f65]">
              {election?.title || 'SSG GENERAL ELECTION 2025'}
            </h1>
            <p className="text-sm text-gray-600">Cast your vote carefully</p>
          </div>
          <div className="flex items-center gap-4">
            {timeRemaining !== null && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                timeRemaining < 60 ? 'bg-red-100 text-red-800' :
                timeRemaining < 300 ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                <Clock className="w-5 h-5" />
                <span className="font-mono font-bold text-lg">
                  {formatTime(timeRemaining)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Ballot Content */}
      <div className="p-4 lg:p-6">
        <div className="max-w-6xl mx-auto">
          
          {/* Position Header */}
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-white/20">
            <h2 className="text-3xl font-bold text-white text-center mb-2">
              {currentPosition.position.positionName}
            </h2>
            <p className="text-white/80 text-center">
              Select one candidate for this position
            </p>
          </div>

          {/* Candidates Grid with Navigation */}
          <div className="relative">
            {/* Left Arrow */}
            {currentPositionIndex > 0 && (
              <button
                onClick={handlePrevious}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-16 z-10 bg-[#001f65] hover:bg-[#003399] text-white p-4 rounded-full shadow-lg transition-all duration-200"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Candidates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4">
              {currentPosition.candidates.map((candidate) => {
                const isSelected = currentVote === candidate._id
                
                return (
                  <div
                    key={candidate._id}
                    onClick={() => handleCandidateSelect(candidate._id)}
                    className={`bg-white/95 backdrop-blur-sm rounded-2xl p-6 cursor-pointer transition-all duration-200 border-2 ${
                      isSelected 
                        ? 'border-[#001f65] shadow-xl scale-105' 
                        : 'border-white/20 hover:border-blue-300 hover:shadow-lg'
                    }`}
                  >
                    {/* Campaign Picture */}
                    <div className="aspect-square bg-gray-200 rounded-xl mb-4 overflow-hidden flex items-center justify-center">
                      {candidate.hasCampaignPicture ? (
                        <img
                          src={getCampaignPictureUrl(candidate)}
                          alt={candidate.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none'
                            e.target.nextElementSibling.style.display = 'flex'
                          }}
                        />
                      ) : null}
                      <User className={`w-20 h-20 text-gray-400 ${candidate.hasCampaignPicture ? 'hidden' : 'flex'}`} />
                    </div>

                    {/* Candidate Info */}
                    <div className="text-center">
                      <div className="text-2xl font-bold text-[#001f65] mb-1">
                        {candidate.candidateNumber}
                      </div>
                      <h3 className="text-xl font-bold text-gray-800 mb-1">
                        {candidate.name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {candidate.partylist}
                      </p>
                      <p className="text-xs text-gray-500">
                        {candidate.department} • {candidate.college}
                      </p>
                    </div>

                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="mt-4 flex items-center justify-center text-[#001f65]">
                        <CheckCircle className="w-6 h-6 mr-2" />
                        <span className="font-bold">Selected</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Right Arrow */}
            {currentPositionIndex < positions.length - 1 && (
              <button
                onClick={handleNext}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-16 z-10 bg-[#001f65] hover:bg-[#003399] text-white p-4 rounded-full shadow-lg transition-all duration-200"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Position Progress */}
          <div className="mt-8 text-center">
            <p className="text-white font-medium text-lg">
              Position {currentPositionIndex + 1} of {positions.length}
            </p>
            <div className="mt-2 w-full max-w-md mx-auto bg-white/20 rounded-full h-2">
              <div 
                className="bg-[#001f65] h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentPositionIndex + 1) / positions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Submit Button */}
          {currentPositionIndex === positions.length - 1 && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={handleSubmit}
                disabled={submitting || Object.keys(selectedVotes).length === 0}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 text-white px-12 py-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl font-bold text-lg flex items-center gap-3 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin w-6 h-6" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-6 h-6" />
                    Submit Ballot
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </VoterLayout>
  )
}