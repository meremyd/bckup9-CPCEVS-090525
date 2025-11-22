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
  X,
  ArrowLeft
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
  const hasShownExpiredAlert = useRef(false)
  const isNavigating = useRef(false)
  const isMounted = useRef(true)

  useEffect(() => {
  isMounted.current = true
  hasShownExpiredAlert.current = false
  isNavigating.current = false
  
  // Check if we already showed expired alert (using sessionStorage as backup)
  const expiredKey = `ballot_expired_${electionId}`
  if (sessionStorage.getItem(expiredKey)) {
    // Already handled, redirect immediately without showing alert
    sessionStorage.removeItem(expiredKey)
    router.replace(`/voter/ssg/info?id=${electionId}`)
    return
  }
  
  if (electionId) {
    initializeBallot()
  } else {
    router.push('/voter/ssg/elections')
  }

  return () => {
    isMounted.current = false
    if (timerInterval.current) {
      clearInterval(timerInterval.current)
      timerInterval.current = null
    }
    Swal.close()
  }
}, [electionId])

//   useEffect(() => {
//   return () => {
//     // Cleanup timer on unmount to prevent memory leaks
//     if (timerInterval.current) {
//       clearInterval(timerInterval.current)
//       timerInterval.current = null
//     }
//   }
// }, [])

 const initializeBallot = async () => {
  isNavigating.current = false
  hasShownExpiredAlert.current = false
  
  try {
    setLoading(true)

    const statusResponse = await ballotAPI.voter.getVoterSelectedSSGBallotStatus(electionId)
    
    if (!isMounted.current) return
    
    // ✅ If already voted, show receipt
    if (statusResponse.hasVoted) {
      isNavigating.current = true
      await showVotingReceipt()
      return
    }

    // ✅ If can't vote (not eligible, wrong time, etc.) - but NOT because of expired ballot
    if (!statusResponse.canVote && !statusResponse.ballot?.isExpired && statusResponse.ballot?.ballotStatus !== 'expired') {
      isNavigating.current = true
      Swal.fire({
        icon: 'info',
        title: 'Cannot Vote',
        text: statusResponse.voterEligibility?.message || 'You cannot vote at this time.',
        confirmButtonColor: '#001f65',
        allowOutsideClick: false,
        allowEscapeKey: false
      }).then(() => {
        router.replace(`/voter/ssg/info?id=${electionId}`)
      })
      return
    }

    // ✅ REMOVED: The check for expired ballot here
    // We now let the backend handle expired ballots by deleting them and creating new ones
    // The startSSGBallot endpoint will handle this case

    let startResponse
    let retryCount = 0
    const maxRetries = 2

    while (retryCount <= maxRetries) {
      if (!isMounted.current) return
      
      try {
        startResponse = await ballotAPI.voter.startSSGBallot(electionId)
        break
      } catch (startError) {
        if (startError.response?.status === 409 && retryCount < maxRetries) {
          retryCount++
          await new Promise(resolve => setTimeout(resolve, 500))
          continue
        }
        throw startError
      }
    }

    if (!isMounted.current) return

    const ballotData = startResponse.ballot
    setBallot(ballotData)
    setElection(statusResponse.election)

    const previewResponse = await ballotAPI.voter.previewSSGBallot(electionId)
    
    if (!isMounted.current) return
    
    setPositions(previewResponse.ballot)

    if (ballotData.ballotCloseTime) {
      const closeTime = new Date(ballotData.ballotCloseTime)
      const now = new Date()
      
      if (closeTime < now) {
        // This should rarely happen now since backend should give fresh ballot
        // But just in case, show error and redirect
        isNavigating.current = true
        hasShownExpiredAlert.current = true
        Swal.fire({
          icon: 'warning',
          title: 'Ballot Expired',
          text: 'This ballot has expired. Please try again.',
          confirmButtonColor: '#001f65',
          allowOutsideClick: false,
          allowEscapeKey: false
        }).then(() => {
          router.replace(`/voter/ssg/info?id=${electionId}`)
        })
        return
      }
      
      startTimer(closeTime)
    }

  } catch (error) {
    console.error('Error initializing ballot:', error)
    
    if (!isMounted.current) return
    
    isNavigating.current = true
    
    let errorMessage = 'Failed to load ballot. Please try again.'
    
    if (error.response?.status === 409) {
      errorMessage = 'A ballot session conflict occurred. Please refresh the page.'
    } else if (error.response?.status === 400) {
      errorMessage = error.response?.data?.message || 'You cannot vote at this time.'
    }
    
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: errorMessage,
      confirmButtonColor: '#001f65',
      allowOutsideClick: false,
      allowEscapeKey: false
    }).then(() => {
      router.replace(`/voter/ssg/info?id=${electionId}`)
    })
  } finally {
    if (isMounted.current) {
      setLoading(false)
    }
  }
}

  const startTimer = (closeTime) => {
  // Clear any existing timer
  if (timerInterval.current) {
    clearInterval(timerInterval.current)
    timerInterval.current = null
  }
  
  hasShownExpiredAlert.current = false
  
  const updateTimer = () => {
    // Check guards before doing anything
    if (!isMounted.current || isNavigating.current || hasShownExpiredAlert.current) {
      if (timerInterval.current) {
        clearInterval(timerInterval.current)
        timerInterval.current = null
      }
      return
    }
    
    const now = new Date()
    const remaining = Math.max(0, Math.floor((closeTime - now) / 1000))
    
    setTimeRemaining(remaining)
    
    if (remaining <= 0) {
      // Clear interval BEFORE calling handleTimeExpired
      if (timerInterval.current) {
        clearInterval(timerInterval.current)
        timerInterval.current = null
      }
      handleTimeExpired()
    }
  }

  // Initial call
  updateTimer()
  
  // Only start interval if we haven't already expired
  if (!hasShownExpiredAlert.current && !isNavigating.current) {
    timerInterval.current = setInterval(updateTimer, 1000)
  }
}


 const handleTimeExpired = () => {
  // Guard: check all conditions
  if (!isMounted.current || hasShownExpiredAlert.current || isNavigating.current) {
    return
  }
  
  // Set flags
  hasShownExpiredAlert.current = true
  isNavigating.current = true
  
  // Clear timer immediately
  if (timerInterval.current) {
    clearInterval(timerInterval.current)
    timerInterval.current = null
  }
  
  // Set sessionStorage flag as backup to prevent loops
  const expiredKey = `ballot_expired_${electionId}`
  sessionStorage.setItem(expiredKey, 'true')
  
  // Close any existing Swal
  Swal.close()
  
  // Show alert with slight delay to ensure cleanup
  setTimeout(() => {
    // Double check we should still show this
    if (!isMounted.current) {
      router.replace(`/voter/ssg/info?id=${electionId}`)
      return
    }
    
    Swal.fire({
      icon: 'warning',
      title: 'Time Expired',
      text: 'Your voting time has expired. The ballot will now close.',
      confirmButtonColor: '#001f65',
      allowOutsideClick: false,
      allowEscapeKey: false
    }).then(() => {
      // Clear the sessionStorage flag after successful navigation
      sessionStorage.removeItem(expiredKey)
      router.replace(`/voter/ssg/info?id=${electionId}`)
    })
  }, 50)
}


  const formatTime = (seconds) => {
    if (seconds === null) return '00:00'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleCandidateSelect = (candidateId) => {
    const currentPosition = positions[currentPositionIndex]
    const positionId = currentPosition.position._id
    const maxVotes = currentPosition.position.maxVotes || 1

    if (maxVotes > 1) {
      // Multiple selection (e.g., senators)
      const currentVotes = Object.entries(selectedVotes)
        .filter(([key]) => key.startsWith(positionId))
        .map(([_, value]) => value)

      if (currentVotes.includes(candidateId)) {
        // Remove vote
        const newVotes = { ...selectedVotes }
        const voteKey = Object.keys(newVotes).find(
          key => newVotes[key] === candidateId && key.startsWith(positionId)
        )
        delete newVotes[voteKey]
        setSelectedVotes(newVotes)
      } else if (currentVotes.length < maxVotes) {
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
          text: `You can only select up to ${maxVotes} candidates for this position.`,
          confirmButtonColor: '#001f65'
        })
      }
    } else {
      // Single selection
      setSelectedVotes({
        ...selectedVotes,
        [positionId]: candidateId
      })
    }
  }

  const isSelected = (candidateId) => {
    const currentPosition = positions[currentPositionIndex]
    const positionId = currentPosition.position._id
    const maxVotes = currentPosition.position.maxVotes || 1

    if (maxVotes > 1) {
      return Object.values(selectedVotes).includes(candidateId)
    }
    return selectedVotes[positionId] === candidateId
  }

  const getSelectionCount = () => {
    const currentPosition = positions[currentPositionIndex]
    const positionId = currentPosition.position._id
    return Object.values(selectedVotes).filter((vote) =>
      currentPosition.candidates.some((c) => c._id === vote)
    ).length
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
    const unvotedPositions = positions.filter(
      pos => !Object.keys(selectedVotes).some(key => key.startsWith(pos.position._id))
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

      const votes = []
      positions.forEach(posData => {
        const positionId = posData.position._id
        const maxVotes = posData.position.maxVotes || 1

        if (maxVotes > 1) {
          Object.entries(selectedVotes)
            .filter(([key]) => key.startsWith(positionId))
            .forEach(([_, candidateId]) => {
              votes.push({ positionId, candidateId })
            })
        } else if (selectedVotes[positionId]) {
          votes.push({ positionId, candidateId: selectedVotes[positionId] })
        }
      })

      await ballotAPI.voter.submitSelectedSSGBallot(ballot._id, votes)
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

  const getCampaignPictureUrl = (candidate) => {
    if (candidate.campaignPicture) {
      if (candidate.campaignPicture.startsWith('data:')) {
        return candidate.campaignPicture
      } else {
        return `data:image/jpeg;base64,${candidate.campaignPicture}`
      }
    }
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
  const maxVotes = currentPosition.position.maxVotes || 1
  const selectionCount = getSelectionCount()

  return (
    <VoterLayout>
      {/* Transparent Navbar with Back Button and Timer */}
      <div className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <button
            onClick={() => router.push(`/voter/ssg/info?id=${electionId}`)}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white rounded-lg transition-colors border border-white/30"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back</span>
          </button>
          
          {timeRemaining !== null && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg backdrop-blur-md border ${
              timeRemaining < 60 ? 'bg-red-500/90 text-white border-red-400' :
              timeRemaining < 300 ? 'bg-yellow-500/90 text-white border-yellow-400' :
              'bg-green-500/90 text-white border-green-400'
            }`}>
              <Clock className="w-5 h-5" />
              <span className="font-mono font-bold text-lg">
                {formatTime(timeRemaining)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-20 pb-6 px-4 lg:px-6">
        <div className="max-w-7xl mx-auto">
          
          {/* Header with Logos and Election Title */}
          <div className="relative mb-4 text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              <img 
                src="/ssglogo.jpg" 
                alt="SSG Logo" 
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
                onError={(e) => e.target.style.display = 'none'}
              />
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white">
                  {election?.title || 'SSG GENERAL ELECTION 2025'}
                </h1>
                {election?.electionDate && (
                  <p className="text-white/90 text-lg mt-2">
                    {new Date(election.electionDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                )}
              </div>
              <img 
                src="/cpclogo.png" 
                alt="CPC Logo" 
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-full"
                onError={(e) => e.target.style.display = 'none'}
              />
            </div>
            
            {/* Position Name - Below election title, no background */}
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-4">
              {currentPosition.position.positionName}
            </h2>
            <p className="text-white/80 text-base sm:text-lg mt-2">
              {maxVotes > 1 
                ? `Select up to ${maxVotes} candidates (${selectionCount}/${maxVotes} selected)`
                : 'Select one candidate for this position'
              }
            </p>
          </div>

          {/* Sticky Navigation Arrows */}
          <div className="fixed top-1/2 left-4 z-40 transform -translate-y-1/2">
            {currentPositionIndex > 0 && (
              <button
                onClick={handlePrevious}
                className="p-4 bg-[#001f65]/90 hover:bg-[#001f65] rounded-full text-white transition-all duration-200 shadow-lg backdrop-blur-sm"
                aria-label="Previous position"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
            )}
          </div>

          <div className="fixed top-1/2 right-4 z-40 transform -translate-y-1/2">
            {currentPositionIndex < positions.length - 1 && (
              <button
                onClick={handleNext}
                className="p-4 bg-[#001f65]/90 hover:bg-[#001f65] rounded-full text-white transition-all duration-200 shadow-lg backdrop-blur-sm"
                aria-label="Next position"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            )}
          </div>

          {/* Candidates Grid */}
          <div className="flex justify-center mb-8 px-4">
            <div className={`grid gap-8 justify-items-center ${
              currentPosition.candidates.length === 1
                ? 'grid-cols-1'
                : currentPosition.candidates.length === 2
                ? 'grid-cols-1 sm:grid-cols-2 max-w-4xl'
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-7xl'
            }`}>
              {currentPosition.candidates.map((candidate) => {
                const selected = isSelected(candidate._id)
                
                return (
                  <div
                    key={candidate._id}
                    onClick={() => handleCandidateSelect(candidate._id)}
                    className={`relative cursor-pointer transition-all duration-300 w-full max-w-[320px] rounded-lg overflow-hidden ${
                      selected
                        ? 'ring-4 ring-white shadow-2xl scale-105'
                        : 'shadow-lg hover:shadow-xl hover:scale-102'
                    }`}
                  >
                    <div className={`h-full flex flex-col transition-all duration-300 ${
                      selected ? 'bg-[#001f65]' : 'bg-white'
                    }`}>
                      
                      {/* Image Container */}
                      <div className="relative w-full h-75 bg-gray-200 overflow-hidden flex-shrink-0">
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
                        <div className={`w-full h-full flex items-center justify-center ${candidate.hasCampaignPicture ? 'hidden' : 'flex'}`}>
                          <User className="w-24 h-24 text-gray-400" />
                        </div>
                        
                        {selected && (
                          <div className="absolute top-3 right-3 w-10 h-10 bg-white rounded-full flex items-center justify-center z-30 shadow-lg">
                            <CheckCircle className="w-6 h-6 text-[#001f65] font-bold stroke-[3]" />
                          </div>
                        )}
                      </div>

                      {/* Candidate Info */}
                      <div className="flex-1 p-5 text-center flex flex-col justify-end">
                        <div className={`-mx-5 -mb-5 p-4 transition-all duration-300 ${
                          selected
                            ? 'bg-[#001f65] text-white'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}>
                          <p className="text-base font-bold">
                            {candidate.candidateNumber}. {candidate.name}
                          </p>
                          <p className="text-sm opacity-90 mt-1">
                            {candidate.partylist || 'Independent'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Position Progress */}
          <div className="mt-8 text-center">
            <p className="text-white font-medium text-lg">
              Position {currentPositionIndex + 1} of {positions.length}
            </p>
            <div className="mt-2 w-full max-w-md mx-auto bg-white/20 rounded-full h-2">
              <div 
                className="bg-white h-2 rounded-full transition-all duration-300"
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