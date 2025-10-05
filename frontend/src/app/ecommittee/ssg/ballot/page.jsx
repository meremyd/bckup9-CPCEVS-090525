"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ballotAPI } from "@/lib/api/ballots"
import SSGLayout from "@/components/SSGLayout"
import Swal from 'sweetalert2'
import {
  Vote,
  AlertCircle,
  Check,
  Users,
  ArrowLeft,
  ArrowRight,
  Loader2,
  WifiOff,
  AlertTriangle,
  Shield,
  Plus,
  Minus,
  Timer,
  Settings,
} from "lucide-react"

export default function SSGBallotPage() {
  const [election, setElection] = useState(null)
  const [ballotPreview, setBallotPreview] = useState(null)
  const [currentPositionIndex, setCurrentPositionIndex] = useState(0)
  const [selectedVotes, setSelectedVotes] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [networkError, setNetworkError] = useState(false)
  const [tooManyRequests, setTooManyRequests] = useState(false)
  const [showTimerForm, setShowTimerForm] = useState(false)
  const [timerMinutes, setTimerMinutes] = useState(10)

  const router = useRouter()
  const searchParams = useSearchParams()
  const ssgElectionId = searchParams.get("ssgElectionId")

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
      fetchBallotPreview()
    } else {
      setError("No election ID provided")
    }
  }, [ssgElectionId, router])

  const fetchBallotPreview = async () => {
    try {
      setIsLoading(true)
      setError("")
      setNetworkError(false)

      const response = await ballotAPI.previewSSGBallot(ssgElectionId)
      setBallotPreview(response)
      setElection(response.election)
    } catch (error) {
      console.error("Error fetching ballot preview:", error)
      handleApiError(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleApiError = (error) => {
    if (error.message?.includes("Too many requests") || error.response?.status === 429) {
      setTooManyRequests(true)
      setError("Too many requests. Please wait a moment before trying again.")
    } else if (error.message?.includes("Network Error") || !navigator.onLine) {
      setNetworkError(true)
      setError("Network connection error. Please check your internet connection.")
    } else {
      const errorMessage = error.response?.data?.message || error.message || "An unexpected error occurred"
      setError(errorMessage)
    }
  }

  const handleVoteSelection = (positionId, candidateId) => {
    const currentPosition = getCurrentPosition()

    if (currentPosition.position.positionName.toLowerCase().includes("senator")) {
      // For senators, allow multiple selections (up to the maximum allowed)
      const currentVotes = Object.entries(selectedVotes)
        .filter(([key, value]) => key.startsWith(positionId))
        .map(([key, value]) => value)

      const maxSenators = currentPosition.position.maxVotes || 12

      if (currentVotes.includes(candidateId)) {
        // Remove vote
        const newVotes = { ...selectedVotes }
        const voteKey = Object.keys(newVotes).find((key) => newVotes[key] === candidateId && key.startsWith(positionId))
        delete newVotes[voteKey]
        setSelectedVotes(newVotes)
      } else if (currentVotes.length < maxSenators) {
        // Add vote
        const voteKey = `${positionId}_${Date.now()}`
        setSelectedVotes({
          ...selectedVotes,
          [voteKey]: candidateId,
        })
      } else {
        Swal.fire({
          icon: "warning",
          title: "Maximum Selections Reached",
          text: `You can only select up to ${maxSenators} senators.`,
          confirmButtonColor: "#001f65",
        })
      }
    } else {
      // For single positions (President, Vice President)
      setSelectedVotes({
        ...selectedVotes,
        [positionId]: candidateId,
      })
    }
  }

  const isSelected = (positionId, candidateId) => {
    const currentPosition = getCurrentPosition()
    if (currentPosition.position.positionName.toLowerCase().includes("senator")) {
      return Object.values(selectedVotes).includes(candidateId)
    }
    return selectedVotes[positionId] === candidateId
  }

  const getCurrentPosition = () => {
    return ballotPreview?.ballot[currentPositionIndex] || null
  }

  const canGoNext = () => {
    return currentPositionIndex < (ballotPreview?.ballot?.length - 1 || 0)
  }

  const canGoPrevious = () => {
    return currentPositionIndex > 0
  }

  const goToPreviousPosition = () => {
    if (canGoPrevious()) {
      setCurrentPositionIndex(currentPositionIndex - 1)
    }
  }

  const goToNextPosition = () => {
    if (canGoNext()) {
      setCurrentPositionIndex(currentPositionIndex + 1)
    }
  }

  const handleTimerUpdate = async () => {
    try {
      setIsLoading(true)
      Swal.fire({
        icon: "success",
        title: "Timer Updated",
        text: `Ballot timer would be updated to ${timerMinutes} minutes.`,
        confirmButtonColor: "#001f65",
      })
      setShowTimerForm(false)
    } catch (error) {
      console.error("Error updating timer:", error)
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: error.response?.data?.message || error.message || "Failed to update timer",
        confirmButtonColor: "#001f65",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const submitTestBallot = async () => {
    if (Object.keys(selectedVotes).length === 0) {
      Swal.fire({
        icon: "warning",
        title: "No Votes Selected",
        text: "Please select candidates before submitting the test ballot.",
        confirmButtonColor: "#001f65",
      })
      return
    }

    const votes = ballotAPI.createVotePayload(selectedVotes)
    const validation = ballotAPI.validateVoteSelections(selectedVotes, ballotPreview)

    if (!validation.valid) {
      Swal.fire({
        icon: "error",
        title: "Invalid Selections",
        html: `<ul style="text-align: left;">${validation.errors.map((error) => `<li>${error}</li>`).join("")}</ul>`,
        confirmButtonColor: "#001f65",
      })
      return
    }

    Swal.fire({
      title: "Submit Test Ballot?",
      text: "This will simulate a ballot submission for testing purposes.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#001f65",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, submit test",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          icon: "success",
          title: "Test Ballot Submitted!",
          html: `<div style="text-align: left;">
            <p><strong>Selected Votes:</strong></p>
            <ul>
              ${validation.votes
                .map((vote) => {
                  const position = ballotPreview.ballot.find((p) => p.position._id === vote.positionId)
                  const candidate = position?.candidates.find((c) => c._id === vote.candidateId)
                  return `<li>${position?.position.positionName}: ${candidate?.name || "Unknown"}</li>`
                })
                .join("")}
            </ul>
          </div>`,
          confirmButtonColor: "#001f65",
        })
      }
    })
  }

  // Fixed Campaign Picture Component - Using the same approach as SSG candidates page
  const CampaignPicture = ({ candidate }) => {
    const [imageError, setImageError] = useState(false)
    const [imageLoading, setImageLoading] = useState(true)

    const handleImageLoad = () => {
      setImageLoading(false)
      setImageError(false)
    }

    const handleImageError = (e) => {
      console.error(`Failed to load campaign picture for candidate ${candidate._id}:`, e)
      setImageLoading(false)
      setImageError(true)
    }

    // Show placeholder if no campaign picture or if image failed to load
    if (!candidate.hasCampaignPicture || imageError) {
      return (
        <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100">
          <Users className="w-16 h-16 sm:w-20 sm:h-20" />
        </div>
      )
    }

    // Use the same approach as SSG candidates page - check if campaignPicture data exists
    let imageUrl = null
    
    // If candidate has campaignPicture data, use it directly (base64 or data URL)
    if (candidate.campaignPicture) {
      if (typeof candidate.campaignPicture === 'string') {
        if (candidate.campaignPicture.startsWith('data:')) {
          // Already a proper data URL
          imageUrl = candidate.campaignPicture
        } else {
          // Raw base64 data - convert to proper data URL
          imageUrl = `data:image/jpeg;base64,${candidate.campaignPicture}`
        }
      }
    }
    
    // If no direct image data, fallback to API endpoint
    if (!imageUrl) {
      imageUrl = `/api/candidates/${candidate._id}/campaign-picture?t=${Date.now()}`
    }
    
    return (
      <div className="relative w-full h-full">
        {imageLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
            <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 animate-spin" />
          </div>
        )}
        <img
          src={imageUrl}
          alt={`${candidate.name} campaign picture`}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            imageLoading ? 'opacity-0' : 'opacity-100'
          }`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          style={{ display: imageError ? 'none' : 'block' }}
        />
      </div>
    )
  }

  if (!ssgElectionId) {
    return (
      <SSGLayout
        ssgElectionId={null}
        title="SSG Ballot Preview"
        subtitle="Election Committee Testing Interface"
        activeItem="ballot"
      >
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20">
            <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Election Selected</h3>
            <p className="text-white/80 mb-6">Please select an election to preview the ballot.</p>
            <button
              onClick={() => router.push("/ecommittee/dashboard")}
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
      title="SSG Ballot Preview"
      subtitle="Election Committee Testing Interface"
      activeItem="ballot"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Ballot Controls */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <h2 className="text-lg sm:text-xl font-bold text-[#001f65] flex items-center">
                <Vote className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                {election?.title || "SSG Election"} - Preview Mode
              </h2>
              <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center w-fit">
                <Shield className="w-4 h-4 mr-1" />
                Testing Mode
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                onClick={() => setShowTimerForm(!showTimerForm)}
                className="flex items-center justify-center px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
              >
                <Timer className="w-4 h-4 mr-2" />
                Timer Settings
              </button>

              <button
                onClick={submitTestBallot}
                disabled={isLoading}
                className="flex items-center justify-center px-4 py-2 bg-[#001f65] hover:bg-[#003399] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                Test Submit
              </button>
            </div>
          </div>

          {/* Timer Form */}
          {showTimerForm && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mt-4">
              <h4 className="font-semibold text-orange-800 mb-3 flex items-center">
                <Settings className="w-4 h-4 mr-2" />
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
                    disabled={isLoading}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg disabled:opacity-50 transition-colors"
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
              <p className="text-orange-700 text-sm mt-2">
                Set the ballot timer duration (5-180 minutes). This affects how long voters have to complete their
                ballot.
              </p>
            </div>
          )}

          {/* Error Messages */}
          {error && (
            <div
              className={`mb-4 p-4 rounded-lg flex items-start gap-3 ${
                networkError
                  ? "bg-orange-50 border border-orange-200"
                  : tooManyRequests
                    ? "bg-yellow-50 border border-yellow-200"
                    : "bg-red-50 border border-red-200"
              }`}
            >
              {networkError ? (
                <WifiOff className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
              ) : tooManyRequests ? (
                <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className={networkError ? "text-orange-700" : tooManyRequests ? "text-yellow-700" : "text-red-700"}>
                  {error}
                </p>
                {networkError && (
                  <button
                    onClick={fetchBallotPreview}
                    className="text-sm text-orange-600 hover:text-orange-800 underline mt-1"
                  >
                    Retry Connection
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Fixed Position Navigation */}
        {ballotPreview?.ballot && ballotPreview.ballot.length > 0 && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-4">
            <div className="flex items-center justify-between">
              <button
                onClick={goToPreviousPosition}
                disabled={!canGoPrevious()}
                className="flex items-center px-3 py-2 sm:px-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
              >
                <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden">Prev</span>
              </button>

              <div className="flex items-center gap-2 sm:gap-4">
                <span className="text-[#001f65] font-medium text-sm sm:text-base">
                  Position {currentPositionIndex + 1} of {ballotPreview.ballot.length}
                </span>
                <div className="flex gap-1">
                  {ballotPreview.ballot.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentPositionIndex(index)}
                      className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-colors ${
                        index === currentPositionIndex ? "bg-[#001f65]" : "bg-gray-300 hover:bg-gray-400"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={goToNextPosition}
                disabled={!canGoNext()}
                className="flex items-center px-3 py-2 sm:px-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
              >
                <span className="hidden sm:inline">Next</span>
                <span className="sm:hidden">Next</span>
                <ArrowRight className="w-4 h-4 ml-1 sm:ml-2" />
              </button>
            </div>
          </div>
        )}

        {/* Fixed Ballot Content with Responsive Design and Proper Navigation */}
        {getCurrentPosition() && (
          <div
            className="relative min-h-[500px] sm:min-h-[600px] rounded-2xl shadow-lg overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #4A90E2 0%, #7BB3F0 50%, #A8CCFF 100%)",
            }}
          >
            {/* Background Logo/Watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-10">
              <div className="w-64 h-64 sm:w-96 sm:h-96 rounded-full border-4 border-white flex items-center justify-center">
                <img
                  src="/bg1.png"
                  alt="CPC Logo"
                  className="w-48 h-48 sm:w-64 sm:h-64 object-contain"
                  onError={(e) => {
                    e.target.style.display = "none"
                    e.target.parentElement.innerHTML = '<span class="text-white text-4xl sm:text-6xl font-bold">CPC</span>'
                  }}
                />
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => router.push("/ecommittee/dashboard")}
              className="absolute top-4 left-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors z-20"
            >
              ✕
            </button>

            {/* College Logo */}
            <div className="absolute top-4 right-4 w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-full flex items-center justify-center z-20">
              <img
                src="/cpclogo.png"
                alt="CPC Logo"
                className="w-12 h-12 sm:w-16 sm:h-16 object-contain rounded-full"
                onError={(e) => {
                  e.target.style.display = "none"
                  e.target.parentElement.innerHTML =
                    '<div class="w-12 h-12 sm:w-16 sm:h-16 bg-red-600 rounded-full flex items-center justify-center"><span class="text-white font-bold text-xs">CPC</span></div>'
                }}
              />
            </div>

            <div className="relative z-10 p-4 sm:p-8">
              {/* Header */}
              <div className="text-center mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2">{election?.title || "SSG ELECTION"}</h1>
                <h2 className="text-xl sm:text-3xl font-semibold text-white mb-4">{getCurrentPosition().position.positionName}</h2>
                {election?.electionDate && (
                  <p className="text-white/90 text-base sm:text-lg mb-2">
                    {new Date(election.electionDate).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                )}
                {getCurrentPosition().position.positionName.toLowerCase().includes("senator") && (
                  <p className="text-white/90 text-base sm:text-lg">
                    Select up to {getCurrentPosition().position.maxVotes || 12} senators
                  </p>
                )}
              </div>

              {/* Fixed Ballot Area with Non-Sticky Navigation */}
              <div className="relative">
                {/* Centered Candidates Grid */}
                <div className="flex justify-center mb-6 sm:mb-8">
                  <div
                    className={`grid gap-4 sm:gap-6 lg:gap-8 justify-items-center ${
                      getCurrentPosition().candidates.length === 1
                        ? "grid-cols-1"
                        : getCurrentPosition().candidates.length === 2
                        ? "grid-cols-1 sm:grid-cols-2 max-w-2xl"
                        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl"
                    }`}
                  >
                    {getCurrentPosition().candidates.map((candidate) => {
                      const selected = isSelected(getCurrentPosition().position._id, candidate._id)
                      
                      return (
                        <div
                          key={candidate._id}
                          onClick={() => handleVoteSelection(getCurrentPosition().position._id, candidate._id)}
                          className={`relative cursor-pointer transition-all duration-300 hover:shadow-xl transform hover:scale-105 w-full max-w-sm rounded-lg overflow-hidden ${
                            selected
                              ? "ring-4 ring-white shadow-2xl scale-105"
                              : "shadow-lg hover:shadow-xl"
                          }`}
                          style={{ minHeight: "320px" }}
                        >
                          {/* Main candidate card */}
                          <div className={`h-full flex flex-col transition-all duration-300 ${
                            selected ? "bg-[#001f65]" : "bg-white"
                          }`}>
                            
                            {/* Fixed Rectangular Image Container */}
                            <div className="relative w-full h-48 sm:h-56 bg-gray-200 overflow-hidden flex-shrink-0">
                              <CampaignPicture candidate={candidate} />
                              
                              {/* Check icon overlay */}
                              {selected && (
                                <div className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center z-30 shadow-lg">
                                  <Check className="w-5 h-5 text-[#001f65] font-bold stroke-[3]" />
                                </div>
                              )}
                            </div>

                            {/* Candidate info section */}
                            <div className="flex-1 p-3 sm:p-4 text-center flex flex-col justify-end">
                              <div
                                className={`-mx-3 sm:-mx-4 -mb-3 sm:-mb-4 p-3 sm:p-4 transition-all duration-300 ${
                                  selected
                                    ? "bg-[#001f65] text-white"
                                    : "bg-blue-600 text-white hover:bg-blue-700"
                                }`}
                              >
                                <p className="text-sm font-bold truncate">
                                  {candidate.candidateNumber ? `${candidate.candidateNumber}. ` : ""}
                                  {candidate.name || "Unknown Candidate"}
                                </p>
                                <p className="text-xs opacity-90 mt-1">{candidate.partylist || "Independent"}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Navigation Arrows - Positioned Below Candidates */}
                <div className="flex justify-between items-center max-w-6xl mx-auto">
                  <div className="flex-1">
                    {canGoPrevious() && (
                      <button
                        onClick={goToPreviousPosition}
                        className="flex items-center px-4 py-2 sm:px-6 sm:py-3 bg-[#001f65]/90 hover:bg-[#001f65] rounded-lg text-white transition-all duration-200 shadow-lg backdrop-blur-sm"
                      >
                        <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                        <span className="text-sm sm:text-base">Previous</span>
                      </button>
                    )}
                  </div>

                  <div className="flex-1 text-right">
                    {canGoNext() && (
                      <button
                        onClick={goToNextPosition}
                        className="flex items-center px-4 py-2 sm:px-6 sm:py-3 bg-[#001f65]/90 hover:bg-[#001f65] rounded-lg text-white transition-all duration-200 shadow-lg backdrop-blur-sm ml-auto"
                      >
                        <span className="text-sm sm:text-base">Next</span>
                        <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 ml-2" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Selection Summary for Senators */}
                {getCurrentPosition().position.positionName.toLowerCase().includes("senator") && (
                  <div className="mt-6 sm:mt-8 text-center">
                    <p className="text-white text-base sm:text-lg">
                      Selected:{" "}
                      {
                        Object.values(selectedVotes).filter((vote) =>
                          getCurrentPosition().candidates.some((c) => c._id === vote),
                        ).length
                      }{" "}
                      of {getCurrentPosition().position.maxVotes || 12} senators
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !ballotPreview && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8 sm:p-12">
            <div className="text-center">
              <Loader2 className="animate-spin w-12 h-12 mx-auto text-[#001f65] mb-4" />
              <h3 className="text-lg font-semibold text-[#001f65] mb-2">Loading Ballot Preview</h3>
              <p className="text-[#001f65]/70">Please wait while we prepare the ballot preview...</p>
            </div>
          </div>
        )}

        {/* No Data State */}
        {!isLoading && !ballotPreview && !error && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8 sm:p-12">
            <div className="text-center">
              <Vote className="w-16 h-16 mx-auto text-[#001f65] mb-4" />
              <h3 className="text-xl font-bold text-[#001f65] mb-2">No Ballot Data</h3>
              <p className="text-[#001f65]/70 mb-6">No ballot preview available for this election.</p>
              <button
                onClick={fetchBallotPreview}
                className="px-4 py-2 bg-[#001f65] hover:bg-[#003399] text-white rounded-lg transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>
    </SSGLayout>
  )
}