"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ballotAPI } from "@/lib/api/ballots"
import { candidatesAPI } from "@/lib/api/candidates"
import SSGLayout from "@/components/SSGLayout"
import Swal from 'sweetalert2'
import { 
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  User,
  ArrowLeft,
  Shield,
  Settings,
  Plus,
  Minus,
  Timer
} from "lucide-react"

export default function SSGBallotPage() {
  const [ballot, setBallot] = useState(null)
  const [election, setElection] = useState(null)
  const [positions, setPositions] = useState([])
  const [currentPositionIndex, setCurrentPositionIndex] = useState(0)
  const [selectedVotes, setSelectedVotes] = useState({})
  const [timeRemaining, setTimeRemaining] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showTimerForm, setShowTimerForm] = useState(false)
  const [timerMinutes, setTimerMinutes] = useState(10)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const ssgElectionId = searchParams.get('ssgElectionId')
  const timerInterval = useRef(null)

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
      if (!["admin", "election_committee"].includes(parsedUser.userType)) {
        router.push("/adminlogin")
        return
      }
    } catch (parseError) {
      console.error("Error parsing user data:", parseError)
      router.push("/adminlogin")
      return
    }

    if (ssgElectionId) {
      initializeBallot()
    } else {
      router.push('/ecommittee/dashboard')
    }

    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current)
      }
    }
  }, [ssgElectionId])

  const initializeBallot = async () => {
    try {
      setLoading(true)

      // Get ballot preview (using staff endpoint)
      const previewResponse = await ballotAPI.previewSSGBallot(ssgElectionId)
      
      setElection(previewResponse.election)
      setPositions(previewResponse.ballot)

      // Start a simulated timer for testing (30 minutes default)
      const closeTime = new Date()
      closeTime.setMinutes(closeTime.getMinutes() + 30)
      startTimer(closeTime)

    } catch (error) {
      console.error('Error initializing ballot:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Failed to load ballot. Please try again.',
        confirmButtonColor: '#001f65'
      }).then(() => {
        router.push('/ecommittee/dashboard')
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
      text: 'The ballot timer has expired. This is a test scenario.',
      confirmButtonColor: '#001f65'
    })
  }

  const formatTime = (seconds) => {
    if (seconds === null) return '00:00'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleTimerUpdate = async () => {
    try {
      // Update timer
      const newCloseTime = new Date()
      newCloseTime.setMinutes(newCloseTime.getMinutes() + timerMinutes)
      
      if (timerInterval.current) {
        clearInterval(timerInterval.current)
      }
      startTimer(newCloseTime)

      Swal.fire({
        icon: 'success',
        title: 'Timer Updated',
        text: `Ballot timer updated to ${timerMinutes} minutes.`,
        confirmButtonColor: '#001f65'
      })
      setShowTimerForm(false)
    } catch (error) {
      console.error('Error updating timer:', error)
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: 'Failed to update timer',
        confirmButtonColor: '#001f65'
      })
    }
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
        const newVotes = { ...selectedVotes }
        const voteKey = Object.keys(newVotes).find(
          key => newVotes[key] === candidateId && key.startsWith(positionId)
        )
        delete newVotes[voteKey]
        setSelectedVotes(newVotes)
      } else if (currentVotes.length < maxVotes) {
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
      title: 'Submit Test Ballot',
      text: 'This will simulate a ballot submission for testing purposes. Continue?',
      showCancelButton: true,
      confirmButtonColor: '#001f65',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Submit Test',
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

      // Show test submission success
      await Swal.fire({
        icon: 'success',
        title: 'Test Ballot Submitted!',
        html: `
          <div style="text-align: left; padding: 20px;">
            <p style="margin-bottom: 15px;"><strong>Election:</strong> ${election?.title || 'SSG Election'}</p>
            <p style="margin-bottom: 15px;"><strong>Total Votes:</strong> ${votes.length}</p>
            <p style="margin-bottom: 15px;"><strong>Status:</strong> <span style="color: #10b981; font-weight: bold;">TEST SUBMITTED</span></p>
            <div style="margin-top: 20px;">
              <strong>Selected Votes:</strong>
              <ul style="margin-top: 10px;">
                ${votes.map(vote => {
                  const position = positions.find(p => p.position._id === vote.positionId)
                  const candidate = position?.candidates.find(c => c._id === vote.candidateId)
                  return `<li>${position?.position.positionName}: ${candidate?.name || 'Unknown'}</li>`
                }).join('')}
              </ul>
            </div>
          </div>
        `,
        confirmButtonColor: '#001f65',
        confirmButtonText: 'Close'
      })

      // Reset selections for another test
      setSelectedVotes({})
      setCurrentPositionIndex(0)

    } catch (error) {
      console.error('Error submitting ballot:', error)
      Swal.fire({
        icon: 'error',
        title: 'Submission Failed',
        text: error.response?.data?.message || 'Failed to submit test ballot.',
        confirmButtonColor: '#001f65'
      })
    } finally {
      setSubmitting(false)
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
    return candidatesAPI.getCampaignPictureUrl(candidate._id)
  }

  if (loading) {
    return (
      <SSGLayout
        ssgElectionId={ssgElectionId}
        title="SSG Ballot Preview"
        subtitle="Election Committee Testing Interface"
        activeItem="ballot"
      >
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20">
            <Loader2 className="animate-spin rounded-full h-12 w-12 mx-auto text-white" />
            <p className="mt-4 text-white font-medium">Loading ballot...</p>
          </div>
        </div>
      </SSGLayout>
    )
  }

  if (!election || positions.length === 0) {
    return (
      <SSGLayout
        ssgElectionId={ssgElectionId}
        title="SSG Ballot Preview"
        subtitle="Election Committee Testing Interface"
        activeItem="ballot"
      >
        <div className="min-h-screen flex items-center justify-center">
          <div className="bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-xl max-w-md mx-auto">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Error</h2>
            <p className="text-gray-600 mb-4 text-center">Failed to load ballot</p>
            <button
              onClick={() => router.push('/ecommittee/dashboard')}
              className="w-full bg-[#001f65] hover:bg-[#003399] text-white px-6 py-2 rounded-lg transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </SSGLayout>
    )
  }

  const currentPosition = positions[currentPositionIndex]
  const maxVotes = currentPosition.position.maxVotes || 1
  const selectionCount = getSelectionCount()

  return (
    <SSGLayout
      ssgElectionId={ssgElectionId}
      title="SSG Ballot Preview"
      subtitle="Election Committee Testing Interface"
      activeItem="ballot"
    >
      {/* Transparent Navbar with Back Button, Timer, and Settings */}
      <div className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <button
            onClick={() => router.push('/ecommittee/dashboard')}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white rounded-lg transition-colors border border-white/30"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back</span>
          </button>
          
          <div className="flex items-center gap-2">
            <div className="bg-blue-100/90 backdrop-blur-md text-blue-800 px-3 py-1 rounded-full text-sm flex items-center border border-blue-200">
              <Shield className="w-4 h-4 mr-1" />
              Testing Mode
            </div>
            
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
            
            <button
              onClick={() => setShowTimerForm(!showTimerForm)}
              className="p-2 bg-orange-600/90 hover:bg-orange-700 backdrop-blur-md text-white rounded-lg transition-colors border border-orange-500"
              title="Timer Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Timer Settings Form */}
        {showTimerForm && (
          <div className="mt-4 max-w-7xl mx-auto">
            <div className="bg-orange-50/95 backdrop-blur-md border border-orange-200 rounded-lg p-4">
              <h4 className="font-semibold text-orange-800 mb-3 flex items-center">
                <Timer className="w-4 h-4 mr-2" />
                Ballot Timer Settings
              </h4>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTimerMinutes(Math.max(5, timerMinutes - 5))}
                    className="p-1 bg-orange-200 hover:bg-orange-300 rounded"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1 bg-white border border-orange-200 rounded text-center min-w-[60px]">
                    {timerMinutes} min
                  </span>
                  <button
                    onClick={() => setTimerMinutes(Math.min(180, timerMinutes + 5))}
                    className="p-1 bg-orange-200 hover:bg-orange-300 rounded"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleTimerUpdate}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                  >
                    Update Timer
                  </button>
                  <button
                    onClick={() => setShowTimerForm(false)}
                    className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
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
                    Submit Test Ballot
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </SSGLayout>
  )
}