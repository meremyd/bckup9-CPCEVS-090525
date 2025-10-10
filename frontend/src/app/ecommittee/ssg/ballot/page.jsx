"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ballotAPI } from "@/lib/api/ballots"
import { candidatesAPI } from "@/lib/api/candidates"
import { ssgElectionsAPI } from "@/lib/api/ssgElections"
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
  Shield,
  Settings,
  Plus,
  Minus,
  Timer,
  Save
} from "lucide-react"

export default function SSGBallotPreviewPage() {
  const [election, setElection] = useState(null)
  const [positions, setPositions] = useState([])
  const [currentPositionIndex, setCurrentPositionIndex] = useState(0)
  const [selectedVotes, setSelectedVotes] = useState({})
  const [displayMinutes, setDisplayMinutes] = useState(10)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showTimerForm, setShowTimerForm] = useState(false)
  const [timerMinutes, setTimerMinutes] = useState(10)
  const [savingDuration, setSavingDuration] = useState(false)
  
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
      initializeBallotPreview()
    } else {
      router.push('/ecommittee/ssg')
    }
  }, [ssgElectionId])

  const initializeBallotPreview = async () => {
    try {
      setLoading(true)

      // Get election details to fetch ballot duration
      const electionResponse = await ssgElectionsAPI.getById(ssgElectionId)
      const electionData = electionResponse.data || electionResponse

      // Use STAFF endpoint for preview
      const previewResponse = await ballotAPI.previewSSGBallot(ssgElectionId)
      
      setElection(previewResponse.election)
      setPositions(previewResponse.ballot)

      // Get ballot duration from election settings
      const duration = electionData.ballotDuration || 10
      setDisplayMinutes(duration)
      setTimerMinutes(duration)

    } catch (error) {
      console.error('Error initializing ballot preview:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Failed to load ballot preview.',
        confirmButtonColor: '#001f65'
      }).then(() => {
        router.push('/ecommittee/ssg')
      })
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (minutes) => {
    const hrs = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hrs > 0) {
      return `${hrs}h ${mins}m`
    }
    return `${mins} minutes`
  }

  const handleSaveBallotDuration = async () => {
    try {
      setSavingDuration(true)
      
      await ballotAPI.updateSSGBallotDuration(ssgElectionId, timerMinutes)
      
      setDisplayMinutes(timerMinutes)
      setShowTimerForm(false)
      
      await Swal.fire({
        icon: 'success',
        title: 'Ballot Duration Updated',
        html: `
          <div style="text-align: left; padding: 20px;">
            <p style="margin-bottom: 10px;">Ballot duration has been updated to <strong>${timerMinutes} minutes</strong>.</p>
            <p style="margin-bottom: 10px; color: #059669;">✓ All new ballots will use this duration</p>
            <p style="color: #6b7280; font-size: 14px;">Note: Active ballots will continue with their original duration</p>
          </div>
        `,
        confirmButtonColor: '#001f65'
      })

      // Refresh election data
      await initializeBallotPreview()
      
    } catch (error) {
      console.error('Error saving ballot duration:', error)
      Swal.fire({
        icon: 'error',
        title: 'Save Failed',
        text: error.response?.data?.message || 'Failed to update ballot duration.',
        confirmButtonColor: '#001f65'
      })
    } finally {
      setSavingDuration(false)
    }
  }

  const handleCandidateSelect = (candidateId) => {
    const currentPosition = positions[currentPositionIndex]
    const positionId = currentPosition.position._id
    const maxVotes = currentPosition.position.maxVotes || 1

    if (maxVotes > 1) {
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
        text: `You haven't selected candidates for ${unvotedPositions.length} position(s). Do you want to continue with the preview?`,
        showCancelButton: true,
        confirmButtonColor: '#001f65',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Continue Preview',
        cancelButtonText: 'Go Back'
      })

      if (!result.isConfirmed) return
    }

    const confirmResult = await Swal.fire({
      icon: 'question',
      title: 'Preview Test Ballot',
      html: `
        <div style="text-align: left; padding: 20px;">
          <p style="margin-bottom: 15px; font-weight: bold; color: #d97706;">⚠️ PREVIEW MODE - NO VOTES WILL BE RECORDED</p>
          <p style="margin-bottom: 10px;">This is a ballot preview for testing purposes only.</p>
          <p style="margin-bottom: 10px;"><strong>NO actual votes will be submitted</strong> to the database.</p>
          <p>Continue to see your selection summary?</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: '#001f65',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'View Summary',
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
              const candidate = posData.candidates.find(c => c._id === candidateId)
              if (candidate) {
                votes.push({ 
                  position: posData.position.positionName,
                  candidate: candidate.name,
                  partylist: candidate.partylist || 'Independent'
                })
              }
            })
        } else if (selectedVotes[positionId]) {
          const candidate = posData.candidates.find(c => c._id === selectedVotes[positionId])
          if (candidate) {
            votes.push({ 
              position: posData.position.positionName,
              candidate: candidate.name,
              partylist: candidate.partylist || 'Independent'
            })
          }
        }
      })

      await Swal.fire({
        icon: 'success',
        title: 'Ballot Preview Summary',
        html: `
          <div style="text-align: left; padding: 20px;">
            <div style="background: #fef3c7; border: 2px solid #f59e0b; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 0; font-weight: bold; color: #92400e;">🔒 PREVIEW MODE - NOT SUBMITTED</p>
              <p style="margin: 5px 0 0 0; font-size: 14px; color: #78350f;">No votes were recorded in the database.</p>
            </div>
            
            <p style="margin-bottom: 15px;"><strong>Election:</strong> ${election?.title || 'SSG Election'}</p>
            <p style="margin-bottom: 15px;"><strong>Total Selections:</strong> ${votes.length} out of ${positions.length} positions</p>
            
            <div style="margin-top: 20px;">
              <strong>Your Selections:</strong>
              <ul style="margin-top: 10px; list-style: none; padding: 0;">
                ${votes.map(vote => `
                  <li style="padding: 10px; margin: 5px 0; background: #f3f4f6; border-radius: 6px;">
                    <strong>${vote.position}:</strong><br>
                    ${vote.candidate} <span style="color: #6b7280; font-size: 14px;">(${vote.partylist})</span>
                  </li>
                `).join('')}
              </ul>
            </div>
            
            ${unvotedPositions.length > 0 ? `
              <div style="margin-top: 20px; padding: 10px; background: #fee2e2; border-radius: 6px;">
                <strong style="color: #991b1b;">Unvoted Positions (${unvotedPositions.length}):</strong>
                <ul style="margin-top: 5px; color: #7f1d1d;">
                  ${unvotedPositions.map(pos => `<li>${pos.position.positionName}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
          </div>
        `,
        confirmButtonColor: '#001f65',
        confirmButtonText: 'Close Preview',
        width: '600px'
      })

      setSelectedVotes({})
      setCurrentPositionIndex(0)

    } catch (error) {
      console.error('Error in preview:', error)
      Swal.fire({
        icon: 'error',
        title: 'Preview Error',
        text: 'An error occurred while generating the preview.',
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
            <p className="mt-4 text-white font-medium">Loading ballot preview...</p>
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
            <p className="text-gray-600 mb-4 text-center">Failed to load ballot preview</p>
            <button
              onClick={() => router.push('/ecommittee/ssg')}
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
      <div className="pt-6 pb-6 px-4 lg:px-6">
        <div className="max-w-7xl mx-auto">
          
          {/* Header Controls - Testing Mode and Timer */}
          <div className="mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="bg-blue-100/90 backdrop-blur-md text-blue-800 px-4 py-2 rounded-full text-sm flex items-center border border-blue-200">
                <Shield className="w-4 h-4 mr-2" />
                Testing Mode - No Votes Recorded
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg backdrop-blur-md border bg-blue-500/90 text-white border-blue-400">
                  <Clock className="w-5 h-5" />
                  <span className="font-bold text-lg">
                    {formatTime(displayMinutes)}
                  </span>
                  <span className="text-xs ml-2">(Current Setting)</span>
                </div>
                
                <button
                  onClick={() => setShowTimerForm(!showTimerForm)}
                  className="p-2 bg-orange-600/90 hover:bg-orange-700 backdrop-blur-md text-white rounded-lg transition-colors border border-orange-500 flex items-center gap-2 px-4"
                  title="Ballot Timer Settings"
                >
                  <Settings className="w-5 h-5" />
                  <span className="hidden sm:inline">Timer Settings</span>
                </button>
              </div>
            </div>

            {/* Ballot Timer Settings Form */}
            {showTimerForm && (
              <div className="bg-orange-50/95 backdrop-blur-md border-2 border-orange-300 rounded-lg p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-orange-900 flex items-center text-lg">
                    <Timer className="w-5 h-5 mr-2" />
                    Configure Ballot Duration
                  </h4>
                  <button
                    onClick={() => setShowTimerForm(false)}
                    className="text-orange-600 hover:text-orange-800"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="bg-orange-100 border border-orange-300 rounded-lg p-4 mb-4">
                  <p className="text-orange-900 text-sm">
                    ⚠️ This setting affects <strong>all new ballots</strong> created for this election. Active ballots will continue with their original duration.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex items-center gap-3 bg-white rounded-lg p-2 border border-orange-200">
                    <button
                      onClick={() => setTimerMinutes(Math.max(5, timerMinutes - 5))}
                      className="p-2 bg-orange-200 hover:bg-orange-300 rounded-lg transition-colors"
                      disabled={timerMinutes <= 5}
                    >
                      <Minus className="w-5 h-5 text-orange-800" />
                    </button>
                    <div className="text-center min-w-[120px]">
                      <div className="text-2xl font-bold text-orange-900">{timerMinutes}</div>
                      <div className="text-xs text-orange-700">minutes</div>
                    </div>
                    <button
                      onClick={() => setTimerMinutes(Math.min(180, timerMinutes + 5))}
                      className="p-2 bg-orange-200 hover:bg-orange-300 rounded-lg transition-colors"
                      disabled={timerMinutes >= 180}
                    >
                      <Plus className="w-5 h-5 text-orange-800" />
                    </button>
                  </div>

                  <div className="flex gap-2 flex-1">
                    <button
                      onClick={handleSaveBallotDuration}
                      disabled={savingDuration || timerMinutes === displayMinutes}
                      className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-semibold flex items-center justify-center gap-2"
                    >
                      {savingDuration ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          Save Duration
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setTimerMinutes(displayMinutes)
                        setShowTimerForm(false)
                      }}
                      className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>

                <div className="mt-4 text-sm text-orange-800">
                  <p>• Minimum: 5 minutes</p>
                  <p>• Maximum: 180 minutes (3 hours)</p>
                  <p>• Recommended: 10-30 minutes for most elections</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Header with Logos and Election Title */}
          <div className="relative mb-6 text-center">
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

          {/* Navigation Arrows - Above ballot content */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={handlePrevious}
              disabled={currentPositionIndex === 0}
              className="flex items-center gap-2 px-6 py-3 bg-[#001f65]/90 hover:bg-[#001f65] disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg text-white transition-all duration-200 shadow-lg"
            >
              <ChevronLeft className="w-6 h-6" />
              <span className="hidden sm:inline">Previous</span>
            </button>

            <div className="text-white font-medium text-lg">
              Position {currentPositionIndex + 1} of {positions.length}
            </div>

            <button
              onClick={handleNext}
              disabled={currentPositionIndex === positions.length - 1}
              className="flex items-center gap-2 px-6 py-3 bg-[#001f65]/90 hover:bg-[#001f65] disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg text-white transition-all duration-200 shadow-lg"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Candidates Grid */}
          <div className="flex justify-center mb-8">
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

          {/* Position Progress Bar */}
          <div className="mt-8 text-center">
            <div className="w-full max-w-md mx-auto bg-white/20 rounded-full h-2">
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
                disabled={submitting}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 text-white px-12 py-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl font-bold text-lg flex items-center gap-3 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin w-6 h-6" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-6 h-6" />
                    View Selection Summary
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