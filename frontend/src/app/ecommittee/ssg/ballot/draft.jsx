"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ballotAPI } from "@/lib/api/ballots"
import SSGLayout from "@/components/SSGLayout"
import CampaignPicture from "@/components/CampaignPicture"
import Swal from "sweetalert2"
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

  const getPositionName = (index) => {
    return ballotPreview?.ballot[index]?.position?.positionName || "Position"
  }

  const goBackToPosition = () => {
    if (currentPositionIndex > 0) {
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
      // This would require a ballot ID - for preview mode, we'll just show a success message
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

  // FIXED: Campaign picture component with proper API URL
  // const CampaignPicture = ({ candidate }) => {
  //   const [imageError, setImageError] = useState(false)
  //   const [imageLoading, setImageLoading] = useState(true)

  //   const handleImageLoad = () => {
  //     setImageLoading(false)
  //     setImageError(false)
  //   }

  //   const handleImageError = (e) => {
  //     console.error(`Failed to load campaign picture for candidate ${candidate._id}:`, e)
  //     setImageLoading(false)
  //     setImageError(true)
  //   }

  //   // Always show placeholder if no campaign picture or if image failed to load
  //   if (!candidate.hasCampaignPicture || imageError) {
  //     return (
  //       <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100">
  //         <Users className="w-20 h-20" />
  //       </div>
  //     )
  //   }

  //   // FIXED: Construct proper campaign picture URL with /api prefix
  //   return (
  //     <>
  //       {imageLoading && (
  //         <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
  //           <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
  //         </div>
  //       )}
  //       <img
  //         src={`/api/candidates/${candidate._id}/campaign-picture?t=${Date.now()}`}
  //         alt={`${candidate.name} campaign picture`}
  //         className={`w-full h-full object-cover transition-opacity duration-300 ${
  //           imageLoading ? 'opacity-0' : 'opacity-100'
  //         }`}
  //         onLoad={handleImageLoad}
  //         onError={handleImageError}
  //         style={{ display: imageError ? 'none' : 'block' }}
  //       />
  //       {/* Fallback if image fails */}
  //       {imageError && (
  //         <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100">
  //           <Users className="w-20 h-20" />
  //         </div>
  //       )}
  //     </>
  //   )
  // }

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
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Ballot Controls */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-bold text-[#001f65] flex items-center">
                <Vote className="w-6 h-6 mr-2" />
                {election?.title || "SSG Election"} - Preview Mode
              </h2>
              <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center">
                <Shield className="w-4 h-4 mr-1" />
                Testing Mode
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowTimerForm(!showTimerForm)}
                className="flex items-center px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
              >
                <Timer className="w-4 h-4 mr-2" />
                Timer Settings
              </button>

              <button
                onClick={submitTestBallot}
                disabled={isLoading}
                className="flex items-center px-4 py-2 bg-[#001f65] hover:bg-[#003399] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
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
              <p className="text-orange-700 text-sm mt-2">
                Set the ballot timer duration (5-180 minutes). This affects how long voters have to complete their
                ballot.
              </p>
            </div>
          )}

          {/* Error Messages */}
          {error && (
            <div
              className={`mb-4 p-4 rounded-lg flex items-center ${
                networkError
                  ? "bg-orange-50 border border-orange-200"
                  : tooManyRequests
                    ? "bg-yellow-50 border border-yellow-200"
                    : "bg-red-50 border border-red-200"
              }`}
            >
              {networkError ? (
                <WifiOff className="w-5 h-5 text-orange-500 mr-3 flex-shrink-0" />
              ) : tooManyRequests ? (
                <AlertTriangle className="w-5 h-5 text-yellow-500 mr-3 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
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

        {/* Position Navigation with proper back navigation */}
        {ballotPreview?.ballot && ballotPreview.ballot.length > 0 && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-4">
            <div className="flex items-center justify-between">
              <button
                onClick={goBackToPosition}
                disabled={!canGoPrevious()}
                className="flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {canGoPrevious() ? `Back to ${getPositionName(currentPositionIndex - 1)}` : 'Previous'}
              </button>

              <div className="flex items-center space-x-4">
                <span className="text-[#001f65] font-medium">
                  Position {currentPositionIndex + 1} of {ballotPreview.ballot.length}
                </span>
                <div className="flex space-x-1">
                  {ballotPreview.ballot.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentPositionIndex(index)}
                      className={`w-3 h-3 rounded-full transition-colors ${
                        index === currentPositionIndex ? "bg-[#001f65]" : "bg-gray-300 hover:bg-gray-400"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={goToNextPosition}
                disabled={!canGoNext()}
                className="flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {canGoNext() ? `Next to ${getPositionName(currentPositionIndex + 1)}` : 'Next'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          </div>
        )}

        {/* FIXED: Ballot Content with proper check icon overlay and dark blue selection */}
        {getCurrentPosition() && (
          <div
            className="relative min-h-[600px] rounded-2xl shadow-lg overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #4A90E2 0%, #7BB3F0 50%, #A8CCFF 100%)",
            }}
          >
            {/* Background Logo/Watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-10">
              <div className="w-96 h-96 rounded-full border-4 border-white flex items-center justify-center">
                <img
                  src="/bg1.png"
                  alt="CPC Logo"
                  className="w-64 h-64 object-contain"
                  onError={(e) => {
                    e.target.style.display = "none"
                    e.target.parentElement.innerHTML = '<span class="text-white text-6xl font-bold">CPC</span>'
                  }}
                />
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => router.push("/ecommittee/dashboard")}
              className="absolute top-4 left-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors z-10"
            >
              ×
            </button>

            {/* College Logo */}
            <div className="absolute top-4 right-4 w-20 h-20 bg-white rounded-full flex items-center justify-center z-10">
              <img
                src="/logo.png"
                alt="CPC Logo"
                className="w-16 h-16 object-contain rounded-full"
                onError={(e) => {
                  e.target.style.display = "none"
                  e.target.parentElement.innerHTML =
                    '<div class="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center"><span class="text-white font-bold text-xs">CPC</span></div>'
                }}
              />
            </div>

            <div className="relative z-10 p-8">
              {/* Header - Dynamic content from election data */}
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-white mb-2">{election?.title || "SSG ELECTION"}</h1>
                <h2 className="text-3xl font-semibold text-white mb-4">{getCurrentPosition().position.positionName}</h2>
                {election?.electionDate && (
                  <p className="text-white/90 text-lg mb-2">
                    {new Date(election.electionDate).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                )}
                {getCurrentPosition().position.positionName.toLowerCase().includes("senator") && (
                  <p className="text-white/90 text-lg">
                    Select up to {getCurrentPosition().position.maxVotes || 12} senators
                  </p>
                )}
              </div>

              {/* FIXED: Navigation arrows positioned and centered within ballot area */}
              <div className="flex items-center justify-center">
                {/* Left Arrow - Previous Position */}
                <div className="flex-shrink-0 mr-8">
                  {canGoPrevious() && (
                    <button
                      onClick={goBackToPosition}
                      className="w-12 h-12 bg-[#001f65] hover:bg-[#003399] rounded-lg flex items-center justify-center text-white transition-colors shadow-lg"
                    >
                      <ArrowLeft className="w-6 h-6" />
                    </button>
                  )}
                </div>

                {/* Candidates Grid - Centered */}
                <div
                  className={`grid gap-8 justify-items-center ${
                    getCurrentPosition().candidates.length === 1
                      ? "grid-cols-1"
                      : getCurrentPosition().candidates.length === 2
                        ? "grid-cols-2 max-w-2xl"
                        : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                  }`}
                >
                  {getCurrentPosition().candidates.map((candidate) => {
                    const selected = isSelected(getCurrentPosition().position._id, candidate._id)
                    
                    return (
                      <div
                        key={candidate._id}
                        onClick={() => handleVoteSelection(getCurrentPosition().position._id, candidate._id)}
                        className={`relative cursor-pointer transition-all duration-300 hover:shadow-xl transform hover:scale-105 w-64 rounded-lg overflow-hidden ${
                          selected
                            ? "ring-4 ring-white shadow-2xl scale-105"
                            : "shadow-lg hover:shadow-xl"
                        }`}
                        style={{ minHeight: "320px" }}
                      >
                        {/* FIXED: Main candidate card with dark blue background when selected */}
                        <div className={`h-full flex flex-col transition-all duration-300 ${
                          selected ? "bg-[#001f65]" : "bg-white"
                        }`}>
                          
                          {/* FIXED: Image container with proper check icon overlay positioned like reference */}
                          <div className="relative w-full h-48 bg-gray-200 overflow-hidden flex-shrink-0">
                            <CampaignPicture candidate={candidate} />
                            
                            {/* FIXED: Check icon overlay positioned exactly like reference image - top right */}
                            {selected && (
                              <div className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center z-30 shadow-lg">
                                <Check className="w-5 h-5 text-[#001f65] font-bold stroke-[3]" />
                              </div>
                            )}
                          </div>

                          {/* FIXED: Candidate info section with proper dark blue highlighting */}
                          <div className="flex-1 p-4 text-center flex flex-col justify-end">
                            <div
                              className={`-mx-4 -mb-4 p-3 transition-all duration-300 ${
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

                {/* Right Arrow - Next Position */}
                <div className="flex-shrink-0 ml-8">
                  {canGoNext() && (
                    <button
                      onClick={goToNextPosition}
                      className="w-12 h-12 bg-[#001f65] hover:bg-[#003399] rounded-lg flex items-center justify-center text-white transition-colors shadow-lg"
                    >
                      <ArrowRight className="w-6 h-6" />
                    </button>
                  )}
                </div>
              </div>

              {/* Selection Summary */}
              {getCurrentPosition().position.positionName.toLowerCase().includes("senator") && (
                <div className="mt-8 text-center">
                  <p className="text-white text-lg">
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
        )}

        {/* Loading State */}
        {isLoading && !ballotPreview && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-12">
            <div className="text-center">
              <Loader2 className="animate-spin w-12 h-12 mx-auto text-[#001f65] mb-4" />
              <h3 className="text-lg font-semibold text-[#001f65] mb-2">Loading Ballot Preview</h3>
              <p className="text-[#001f65]/70">Please wait while we prepare the ballot preview...</p>
            </div>
          </div>
        )}

        {/* No Data State */}
        {!isLoading && !ballotPreview && !error && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-12">
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