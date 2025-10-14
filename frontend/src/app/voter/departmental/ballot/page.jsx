"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ballotAPI } from "@/lib/api/ballots"
import { candidatesAPI } from "@/lib/api/candidates"
import { electionParticipationAPI } from "@/lib/api/electionParticipation"
import VoterLayout from '@/components/VoterLayout'
import Swal from 'sweetalert2'
import { 
  AlertCircle,
  CheckCircle,
  Loader2,
  User,
  ArrowLeft,
  Calendar,
  Clock
} from "lucide-react"

export default function DepartmentalVoterBallotPage() {
  const [ballot, setBallot] = useState(null)
  const [election, setElection] = useState(null)
  const [position, setPosition] = useState(null)
  const [candidates, setCandidates] = useState([])
  const [selectedVotes, setSelectedVotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(null)
  const [ballotCloseDateTime, setBallotCloseDateTime] = useState(null)

  const initializingRef = useRef(false)
  const hasInitializedRef = useRef(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const electionId = searchParams.get('electionId')
  const positionId = searchParams.get('positionId')

  // Countdown timer effect - FIXED to use actual close datetime
  useEffect(() => {
    if (!ballotCloseDateTime) return

    const updateTimer = () => {
      const now = new Date()
      const closeTime = new Date(ballotCloseDateTime)
      const diff = closeTime - now

      if (diff <= 0) {
        setTimeRemaining({ expired: true })
        Swal.fire({
          icon: 'warning',
          title: 'Voting Time Expired',
          text: 'The voting period for this position has ended.',
          confirmButtonColor: '#001f65',
          allowOutsideClick: false
        }).then(() => {
          router.replace(`/voter/departmental/info?id=${electionId}`)
        })
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeRemaining({ hours, minutes, seconds, expired: false })
    }

    updateTimer() // Initial call
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [ballotCloseDateTime, electionId, router])

  useEffect(() => {
    console.log('📋 Ballot Page - Query Params:', { electionId, positionId })
    
    // ✅ ADD THIS CHECK to prevent double initialization
    if (hasInitializedRef.current) {
      console.log('⏭️ Already initialized, skipping...')
      return
    }
    
    if (electionId && positionId) {
      // ✅ ADD THIS CHECK to prevent concurrent initialization
      if (initializingRef.current) {
        console.log('⏳ Already initializing, skipping...')
        return
      }
      
      initializingRef.current = true
      hasInitializedRef.current = true
      
      initializeBallot().finally(() => {
        initializingRef.current = false
      })
    } else {
      console.error('❌ Missing parameters:', { electionId, positionId })
      Swal.fire({
        icon: 'error',
        title: 'Invalid URL',
        text: 'Missing election or position information',
        confirmButtonColor: '#001f65'
      }).then(() => {
        router.push('/voter/departmental/elections')
      })
    }
  }, [electionId, positionId])

const initializeBallot = async () => {
  try {
    setLoading(true)

    // Check voter status for this position
    const statusResponse = await ballotAPI.voter.getVoterDepartmentalBallotStatus(electionId, positionId)
    
    if (statusResponse.hasVoted) {
      await showVotingReceipt()
      return
    }

    if (!statusResponse.canVote) {
      Swal.fire({
        icon: 'info',
        title: 'Cannot Vote',
        text: statusResponse.voterEligibility?.message || 'You cannot vote for this position.',
        confirmButtonColor: '#001f65',
        allowOutsideClick: false,
        allowEscapeKey: false
      }).then(() => {
        router.replace(`/voter/departmental/info?id=${electionId}`)
      })
      return
    }

    const timingResponse = await ballotAPI.getDepartmentalPositionBallotTiming(positionId)
    const timing = timingResponse.data?.timing
    
    if (!timing?.isOpen) {
      Swal.fire({
        icon: 'info',
        title: 'Voting Not Available',
        text: 'Voting is not currently open for this position.',
        confirmButtonColor: '#001f65',
        allowOutsideClick: false,
        allowEscapeKey: false
      }).then(() => {
        router.replace(`/voter/departmental/info?id=${electionId}`)
      })
      return
    }

    const closeDateTime = statusResponse.position?.ballotCloseTime 
      ? new Date(statusResponse.position.ballotCloseTime)
      : null

    console.log('Close DateTime set to:', closeDateTime)
    setBallotCloseDateTime(closeDateTime)
    setElection(statusResponse.election)
    setPosition(statusResponse.position)

    console.log('Position data:', statusResponse.position)
    console.log('maxVotes value:', statusResponse.position?.maxVotes)

    // Start or get existing ballot
    const startResponse = await ballotAPI.voter.startDepartmentalBallot(electionId, positionId)
    setBallot(startResponse.ballot)

    const previewResponse = await ballotAPI.voter.previewDepartmentalBallotForVoter(electionId, positionId)
    setCandidates(previewResponse.candidates || [])

  } catch (error) {
    console.error('Error initializing ballot:', error)
    
    let errorMessage = 'Failed to load ballot. Please try again.'
    
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message
    }
    
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: errorMessage,
      confirmButtonColor: '#001f65',
      allowOutsideClick: false,
      allowEscapeKey: false
    }).then(() => {
      router.replace(`/voter/departmental/info?id=${electionId}`)
    })
  } finally {
    setLoading(false)
  }
}

  const handleCandidateSelect = (candidateId) => {
    if (!position) return
    
    const maxVotes = position.maxVotes || 1

    if (maxVotes > 1) {
      if (selectedVotes.includes(candidateId)) {
        setSelectedVotes(selectedVotes.filter(id => id !== candidateId))
      } else if (selectedVotes.length < maxVotes) {
        setSelectedVotes([...selectedVotes, candidateId])
      } else {
        Swal.fire({
          icon: 'warning',
          title: 'Maximum Selections Reached',
          text: `You can only select up to ${maxVotes} candidates for this position.`,
          confirmButtonColor: '#001f65'
        })
      }
    } else {
      setSelectedVotes([candidateId])
    }
  }

  const isSelected = (candidateId) => {
    return selectedVotes.includes(candidateId)
  }

  const handleSubmit = async () => {
    if (selectedVotes.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "No Vote Selected",
        text: "Please select at least one candidate before submitting.",
        confirmButtonColor: "#001f65",
      })
      return
    }

    const maxVotes = position?.maxVotes || 1
    if (selectedVotes.length > maxVotes) {
      Swal.fire({
        icon: "warning",
        title: "Too Many Selections",
        text: `You can only select up to ${maxVotes} candidate(s) for this position.`,
        confirmButtonColor: "#001f65",
      })
      return
    }

    const selectedCandidates = candidates.filter(c => selectedVotes.includes(c._id))
    
    const result = await Swal.fire({
      icon: 'question',
      title: 'Submit Vote',
      html: `
        <div style="text-align: left; padding: 20px;">
          <p style="margin-bottom: 15px;"><strong>Position:</strong> ${position?.positionName}</p>
          <p style="margin-bottom: 15px;"><strong>Your Selection${selectedVotes.length > 1 ? 's' : ''}:</strong></p>
          <div style="padding: 10px; margin: 10px 0; background: #f3f4f6; border-radius: 6px;">
            ${selectedCandidates.map(c => `<div style="margin: 5px 0;">#${c.candidateNumber} - ${c.name}</div>`).join('')}
          </div>
          <p style="margin-top: 15px; color: #dc2626;">This action cannot be undone.</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: '#001f65',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Submit',
      cancelButtonText: 'Cancel',
      width: '600px'
    })

    if (!result.isConfirmed) return

    try {
      setSubmitting(true)

      const votes = selectedVotes.map(candidateId => ({
        positionId: position._id,
        candidateId: candidateId
      }))

      await ballotAPI.voter.submitDepartmentalBallot(ballot._id, votes)
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
      await Swal.fire({
        icon: 'success',
        title: 'Vote Submitted Successfully!',
        html: `
          <div style="text-align: left; padding: 20px;">
            <p style="margin-bottom: 15px;"><strong>Election:</strong> ${election?.title || 'Departmental Election'}</p>
            <p style="margin-bottom: 15px;"><strong>Position:</strong> ${position?.positionName || 'N/A'}</p>
            <p style="margin-bottom: 15px;"><strong>Status:</strong> <span style="color: #10b981; font-weight: bold;">VOTED</span></p>
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
          router.push(`/voter/departmental/info?id=${electionId}`)
        } else {
          router.push('/voter/departmental/elections')
        }
      })
    } catch (error) {
      console.error('Error showing receipt:', error)
      router.push(`/voter/departmental/info?id=${electionId}`)
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

  const formatTimeRemaining = () => {
    if (!timeRemaining || timeRemaining.expired) return null

    const { hours, minutes, seconds } = timeRemaining
    const totalMinutes = hours * 60 + minutes
    
    let urgencyClass = 'bg-green-500/90 border-green-400'
    let urgencyText = 'Voting Open'
    
    if (totalMinutes <= 5) {
      urgencyClass = 'bg-red-500/90 border-red-400 animate-pulse'
      urgencyText = 'Closing Soon!'
    } else if (totalMinutes <= 15) {
      urgencyClass = 'bg-orange-500/90 border-orange-400'
      urgencyText = 'Hurry Up!'
    } else if (totalMinutes <= 30) {
      urgencyClass = 'bg-yellow-500/90 border-yellow-400'
      urgencyText = 'Time Running'
    }

    return (
      <div className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg backdrop-blur-md border text-white ${urgencyClass}`}>
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          <span className="font-bold text-sm">{urgencyText}</span>
        </div>
        <div className="text-xs font-mono font-bold">
          {hours > 0 && `${hours}h `}{String(minutes).padStart(2, '0')}m {String(seconds).padStart(2, '0')}s
        </div>
      </div>
    )
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

  if (!ballot || !position || candidates.length === 0) {
    return (
      <VoterLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-xl max-w-md mx-auto">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Error</h2>
            <p className="text-gray-600 mb-4 text-center">Failed to load ballot</p>
            <button
              onClick={() => router.push(`/voter/departmental/info?id=${electionId}`)}
              className="w-full bg-[#001f65] hover:bg-[#003399] text-white px-6 py-2 rounded-lg transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </VoterLayout>
    )
  }

  const maxVotes = position.maxVotes || 1

  return (
    <VoterLayout>
      <div className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <button
            onClick={() => router.push(`/voter/departmental/info?id=${electionId}`)}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white rounded-lg transition-colors border border-white/30"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back</span>
          </button>
          
          {formatTimeRemaining()}
        </div>
      </div>

      <div className="pt-20 pb-6 px-4 lg:px-6">
        <div className="max-w-7xl mx-auto">
          
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
                  {election?.title || 'DEPARTMENTAL ELECTION'}
                </h1>
                {election?.electionDate && (
                  <p className="text-white/90 text-lg mt-2 flex items-center justify-center gap-2">
                    <Calendar className="w-5 h-5" />
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
            
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-4">
              {position.positionName}
            </h2>
            <p className="text-white/80 text-base sm:text-lg mt-2">
              {maxVotes > 1 
                ? `Select up to ${maxVotes} candidates (${selectedVotes.length}/${maxVotes} selected)`
                : 'Select one candidate for this position'
              }
            </p>
          </div>

          <div className="flex justify-center mb-8 px-4">
            <div className={`grid gap-8 justify-items-center ${
              candidates.length === 1
                ? 'grid-cols-1'
                : candidates.length === 2
                ? 'grid-cols-1 sm:grid-cols-2 max-w-4xl'
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 max-w-7xl'
            }`}>
              {candidates.map((candidate) => {
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
                      
                      <div className="relative w-full h-72 bg-gray-200 overflow-hidden flex-shrink-0">
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

                      <div className="flex-1 p-5 text-center flex flex-col justify-end">
                        <div className={`-mx-5 -mb-5 p-4 transition-all duration-300 ${
                          selected
                            ? 'bg-[#001f65] text-white'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}>
                          <p className="text-base font-bold">
                            {candidate.candidateNumber}. {candidate.name}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <button
              onClick={handleSubmit}
              disabled={submitting || selectedVotes.length === 0}
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
                  Submit Vote
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </VoterLayout>
  )
}