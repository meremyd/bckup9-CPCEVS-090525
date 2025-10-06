"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ballotAPI } from "@/lib/api/ballots"
import { departmentalElectionsAPI } from "@/lib/api/departmentalElections"
import DepartmentalLayout from "@/components/DepartmentalLayout"
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
  UserCheck,
  Calendar,
  Building,
  BookOpen,
  Clock,
  Lock,
  Unlock,
  Play,
  Square,
  Eye
} from "lucide-react"

export default function DepartmentalBallotPage() {
  const [election, setElection] = useState(null)
  const [availablePositions, setAvailablePositions] = useState([])
  const [currentPosition, setCurrentPosition] = useState(null)
  const [ballotPreview, setBallotPreview] = useState(null)
  const [selectedVote, setSelectedVote] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [networkError, setNetworkError] = useState(false)
  const [tooManyRequests, setTooManyRequests] = useState(false)
  const [showTimerForm, setShowTimerForm] = useState(false)
  const [timerMinutes, setTimerMinutes] = useState(10)
  const [voterEligibility, setVoterEligibility] = useState(null)
  const [showYearLevelForm, setShowYearLevelForm] = useState(false)
  const [yearLevels, setYearLevels] = useState([1, 2, 3, 4])
  const [ballotStatus, setBallotStatus] = useState('closed') // 'closed', 'open', 'preview'

  const router = useRouter()
  const searchParams = useSearchParams()
  const deptElectionId = searchParams.get("deptElectionId")
  const positionId = searchParams.get("positionId")

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

    if (deptElectionId) {
      fetchElectionData()
    } else {
      setError("No election ID provided")
    }
  }, [deptElectionId, router])

  useEffect(() => {
    if (positionId && deptElectionId) {
      fetchBallotPreview()
    }
  }, [positionId, deptElectionId])

  const fetchElectionData = async () => {
    try {
      setIsLoading(true)
      setError("")
      setNetworkError(false)

      const [electionResponse, positionsResponse] = await Promise.all([
        departmentalElectionsAPI.getById(deptElectionId),
        ballotAPI.getAvailablePositionsForVoting(deptElectionId)
      ])

      setElection(electionResponse.election)
      setAvailablePositions(positionsResponse.availablePositions || [])
      setVoterEligibility(positionsResponse.voterEligibility)

      // If no position is selected but positions are available, select the first one
      if (!positionId && positionsResponse.availablePositions && positionsResponse.availablePositions.length > 0) {
        const firstPosition = positionsResponse.availablePositions[0]
        const newUrl = new URL(window.location)
        newUrl.searchParams.set("positionId", firstPosition._id)
        router.replace(newUrl.toString())
      }

    } catch (error) {
      console.error("Error fetching election data:", error)
      handleApiError(error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchBallotPreview = async () => {
    if (!deptElectionId || !positionId) return

    try {
      setIsLoading(true)
      setError("")

      const response = await ballotAPI.previewDepartmentalBallot(deptElectionId, positionId)
      setBallotPreview(response)
      setCurrentPosition(response.position)
      
      // Extract year level restrictions from position description if available
      if (response.position?.description) {
        const yearLevelMatch = response.position.description.match(/Year levels?: (.*?)(?:\n|$)/)
        if (yearLevelMatch) {
          const restrictionText = yearLevelMatch[1]
          if (!restrictionText.includes('All year levels')) {
            const allowedLevels = []
            if (restrictionText.includes('1st')) allowedLevels.push(1)
            if (restrictionText.includes('2nd')) allowedLevels.push(2)
            if (restrictionText.includes('3rd')) allowedLevels.push(3)
            if (restrictionText.includes('4th')) allowedLevels.push(4)
            if (allowedLevels.length > 0) {
              setYearLevels(allowedLevels)
            }
          }
        }
      }
      
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

  const handleVoteSelection = (candidateId) => {
    setSelectedVote(candidateId)
  }

  const isSelected = (candidateId) => {
    return selectedVote === candidateId
  }

  const handlePositionChange = (newPositionId) => {
    const newUrl = new URL(window.location)
    newUrl.searchParams.set("positionId", newPositionId)
    router.replace(newUrl.toString())
    setSelectedVote(null) // Reset selection when changing positions
  }

  const getNextPosition = () => {
    const currentIndex = availablePositions.findIndex(p => p._id === positionId)
    if (currentIndex >= 0 && currentIndex < availablePositions.length - 1) {
      return availablePositions[currentIndex + 1]
    }
    return null
  }

  const getPreviousPosition = () => {
    const currentIndex = availablePositions.findIndex(p => p._id === positionId)
    if (currentIndex > 0) {
      return availablePositions[currentIndex - 1]
    }
    return null
  }

  const handleTimerUpdate = async () => {
    try {
      setIsLoading(true)
      // This would require a ballot ID - for preview mode, we'll just show a success message
      Swal.fire({
        icon: "success",
        title: "Timer Updated",
        text: `Ballot timer would be updated to ${timerMinutes} minutes for this position.`,
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

  const handleYearLevelUpdate = async () => {
    if (!currentPosition) return

    try {
      setIsLoading(true)
      
      // Validate year levels
      const validation = ballotAPI.validateYearLevels(yearLevels)
      if (!validation.valid) {
        Swal.fire({
          icon: "error",
          title: "Invalid Year Levels",
          text: validation.message,
          confirmButtonColor: "#001f65",
        })
        return
      }

      await ballotAPI.updateYearLevelRestriction(currentPosition._id, yearLevels)
      
      Swal.fire({
        icon: "success",
        title: "Year Level Restriction Updated",
        text: `Position "${currentPosition.positionName}" can now be voted by: ${yearLevels.map(level => ballotAPI.getYearLevelText(level)).join(', ')}`,
        confirmButtonColor: "#001f65",
      })
      
      setShowYearLevelForm(false)
      // Refresh ballot preview to show updated restrictions
      await fetchBallotPreview()
      
    } catch (error) {
      console.error("Error updating year level restriction:", error)
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: error.response?.data?.message || error.message || "Failed to update year level restriction",
        confirmButtonColor: "#001f65",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const submitTestBallot = async () => {
    if (!selectedVote) {
      Swal.fire({
        icon: "warning",
        title: "No Vote Selected",
        text: "Please select a candidate before submitting the test ballot.",
        confirmButtonColor: "#001f65",
      })
      return
    }

    const selectedCandidate = ballotPreview?.candidates?.find(c => c._id === selectedVote)
    
    Swal.fire({
      title: "Submit Test Ballot?",
      text: `This will simulate a ballot submission for ${currentPosition?.positionName}.`,
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
            <p><strong>Position:</strong> ${currentPosition?.positionName}</p>
            <p><strong>Selected Candidate:</strong> ${selectedCandidate?.name || "Unknown"}</p>
            <p><strong>Candidate Number:</strong> ${selectedCandidate?.candidateNumber || "N/A"}</p>
          </div>`,
          confirmButtonColor: "#001f65",
        })
      }
    })
  }

  const toggleYearLevel = (level) => {
    setYearLevels(prev => 
      prev.includes(level) 
        ? prev.filter(l => l !== level)
        : [...prev, level].sort()
    )
  }

  const openBallotForPosition = async () => {
    if (!currentPosition) return

    Swal.fire({
      title: "Open Ballot for Position?",
      html: `
        <div style="text-align: left;">
          <p><strong>Position:</strong> ${currentPosition.positionName}</p>
          <p><strong>Eligible Year Levels:</strong> ${yearLevels.map(level => ballotAPI.getYearLevelText(level)).join(', ')}</p>
          <p><strong>Candidates:</strong> ${ballotPreview?.candidates?.length || 0}</p>
          <br>
          <p style="color: #059669;">This will open voting for this specific position. Voters from eligible year levels can start voting.</p>
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#22c55e",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, open ballot",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        setBallotStatus('open')
        Swal.fire({
          icon: "success",
          title: "Ballot Opened!",
          text: `Voting is now open for ${currentPosition.positionName}`,
          confirmButtonColor: "#001f65",
        })
      }
    })
  }

  const closeBallotForPosition = async () => {
    if (!currentPosition) return

    Swal.fire({
      title: "Close Ballot for Position?",
      html: `
        <div style="text-align: left;">
          <p><strong>Position:</strong> ${currentPosition.positionName}</p>
          <p style="color: #dc2626;">This will immediately close voting for this position. No more votes can be submitted.</p>
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, close ballot",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        setBallotStatus('closed')
        Swal.fire({
          icon: "success",
          title: "Ballot Closed!",
          text: `Voting is now closed for ${currentPosition.positionName}`,
          confirmButtonColor: "#001f65",
        })
      }
    })
  }

  const handlePreviewMode = () => {
    setBallotStatus('preview')
    Swal.fire({
      icon: "info",
      title: "Preview Mode Activated",
      text: "You are now viewing the ballot in preview mode. This is how voters will see it.",
      confirmButtonColor: "#001f65",
    })
  }

  if (!deptElectionId) {
    return (
      <DepartmentalLayout
        deptElectionId={null}
        title="Departmental Ballot Preview"
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
      </DepartmentalLayout>
    )
  }

  return (
    <DepartmentalLayout
      deptElectionId={deptElectionId}
      title="Departmental Ballot Preview"
      subtitle="Election Committee Position-Based Voting Interface"
      activeItem="ballot"
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Election Info Header */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-bold text-[#001f65] flex items-center">
                <Building className="w-6 h-6 mr-2" />
                {election?.title || "Departmental Election"}
              </h2>
              <div className={`px-3 py-1 rounded-full text-sm flex items-center ${
                ballotStatus === 'open' ? 'bg-green-100 text-green-800' :
                ballotStatus === 'preview' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                <Shield className="w-4 h-4 mr-1" />
                {ballotStatus === 'open' ? 'Ballot Open' :
                 ballotStatus === 'preview' ? 'Preview Mode' :
                 'Ballot Closed'}
              </div>
            </div>

            {election && (
              <div className="text-right text-sm text-[#001f65]/70">
                <p className="flex items-center">
                  <Building className="w-4 h-4 mr-1" />
                  {election.department?.departmentCode} - {election.department?.degreeProgram}
                </p>
                <p className="flex items-center mt-1">
                  <Calendar className="w-4 h-4 mr-1" />
                  {new Date(election.electionDate).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          {/* Voter Eligibility Info */}
          {voterEligibility && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-blue-800 mb-2 flex items-center">
                <UserCheck className="w-4 h-4 mr-2" />
                Departmental Election Requirements
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className={`flex items-center ${voterEligibility.isRegistered ? 'text-green-700' : 'text-red-700'}`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${voterEligibility.isRegistered ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  Registered Voter
                </div>
                <div className={`flex items-center ${voterEligibility.isClassOfficer ? 'text-green-700' : 'text-red-700'}`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${voterEligibility.isClassOfficer ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  Class Officer
                </div>
                <div className={`flex items-center ${voterEligibility.departmentMatch ? 'text-green-700' : 'text-red-700'}`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${voterEligibility.departmentMatch ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  Same Department
                </div>
                <div className={`flex items-center ${voterEligibility.canVote ? 'text-green-700' : 'text-yellow-700'}`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${voterEligibility.canVote ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                  Can Vote
                </div>
              </div>
              <p className="text-blue-700 text-sm mt-2">{voterEligibility.message}</p>
            </div>
          )}
        </div>

        {/* Position Selection and Controls */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-semibold text-[#001f65] flex items-center">
                <Vote className="w-5 h-5 mr-2" />
                Position-Based Voting Control
              </h3>
              {availablePositions.length > 0 && (
                <select
                  value={positionId || ""}
                  onChange={(e) => handlePositionChange(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent"
                >
                  <option value="">Select Position</option>
                  {availablePositions.map((position) => (
                    <option key={position._id} value={position._id}>
                      {position.positionName} (Order: {position.positionOrder})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handlePreviewMode}
                className="flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                disabled={!currentPosition}
              >
                <Eye className="w-4 h-4 mr-1" />
                Preview
              </button>

              <button
                onClick={() => setShowYearLevelForm(!showYearLevelForm)}
                className="flex items-center px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm"
                disabled={!currentPosition}
              >
                <BookOpen className="w-4 h-4 mr-1" />
                Year Level
              </button>

              <button
                onClick={() => setShowTimerForm(!showTimerForm)}
                className="flex items-center px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors text-sm"
                disabled={!currentPosition}
              >
                <Timer className="w-4 h-4 mr-1" />
                Timer
              </button>

              <button
                onClick={openBallotForPosition}
                className="flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
                disabled={!currentPosition || ballotStatus === 'open'}
              >
                <Play className="w-4 h-4 mr-1" />
                Open Ballot
              </button>

              <button
                onClick={closeBallotForPosition}
                className="flex items-center px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
                disabled={!currentPosition || ballotStatus === 'closed'}
              >
                <Square className="w-4 h-4 mr-1" />
                Close Ballot
              </button>

              <button
                onClick={submitTestBallot}
                disabled={isLoading || !selectedVote}
                className="flex items-center px-3 py-2 bg-[#001f65] hover:bg-[#003399] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                {isLoading ? <Loader2 className="animate-spin w-4 h-4 mr-1" /> : <Check className="w-4 h-4 mr-1" />}
                Test Submit
              </button>
            </div>
          </div>

          {/* Year Level Form */}
          {showYearLevelForm && currentPosition && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mt-4">
              <h4 className="font-semibold text-purple-800 mb-3 flex items-center">
                <BookOpen className="w-4 h-4 mr-2" />
                Year Level Restrictions for "{currentPosition.positionName}"
              </h4>
              <div className="flex items-center space-x-4 mb-4">
                <span className="text-sm text-purple-700">Allowed Year Levels:</span>
                {[1, 2, 3, 4].map((level) => (
                  <label key={level} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={yearLevels.includes(level)}
                      onChange={() => toggleYearLevel(level)}
                      className="rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-purple-700">
                      {ballotAPI.getYearLevelText(level)}
                    </span>
                  </label>
                ))}
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleYearLevelUpdate}
                  disabled={isLoading || yearLevels.length === 0}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 transition-colors"
                >
                  Update Restrictions
                </button>
                <button
                  onClick={() => setShowYearLevelForm(false)}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
              <p className="text-purple-700 text-xs mt-2">
                Only voters from selected year levels will be able to vote for this position.
              </p>
            </div>
          )}

          {/* Timer Form */}
          {showTimerForm && currentPosition && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mt-4">
              <h4 className="font-semibold text-orange-800 mb-3 flex items-center">
                <Settings className="w-4 h-4 mr-2" />
                Ballot Timer for "{currentPosition.positionName}"
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
                Set individual ballot timer for this position (5-180 minutes).
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

        {/* Position Navigation */}
        {availablePositions.length > 1 && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  const prev = getPreviousPosition()
                  if (prev) handlePositionChange(prev._id)
                }}
                disabled={!getPreviousPosition()}
                className="flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {getPreviousPosition()?.positionName || 'Previous Position'}
              </button>

              <div className="flex items-center space-x-4">
                <span className="text-[#001f65] font-medium">
                  Position {(availablePositions.findIndex(p => p._id === positionId) + 1)} of {availablePositions.length}
                </span>
                <div className="flex space-x-1">
                  {availablePositions.map((position, index) => (
                    <button
                      key={position._id}
                      onClick={() => handlePositionChange(position._id)}
                      className={`w-3 h-3 rounded-full transition-colors ${
                        position._id === positionId ? "bg-[#001f65]" : "bg-gray-300 hover:bg-gray-400"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  const next = getNextPosition()
                  if (next) handlePositionChange(next._id)
                }}
                disabled={!getNextPosition()}
                className="flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {getNextPosition()?.positionName || 'Next Position'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          </div>
        )}

        {/* Ballot Content */}
        {ballotPreview && currentPosition && (
          <div
            className="relative min-h-[600px] rounded-2xl shadow-lg overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #15803d 100%)",
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

            {/* Ballot Status Indicator */}
            <div className="absolute top-4 left-4 z-10">
              <div className={`px-4 py-2 rounded-full text-white font-medium flex items-center ${
                ballotStatus === 'open' ? 'bg-green-600/90' :
                ballotStatus === 'preview' ? 'bg-blue-600/90' :
                'bg-red-600/90'
              }`}>
                {ballotStatus === 'open' && <Unlock className="w-4 h-4 mr-2" />}
                {ballotStatus === 'preview' && <Eye className="w-4 h-4 mr-2" />}
                {ballotStatus === 'closed' && <Lock className="w-4 h-4 mr-2" />}
                {ballotStatus === 'open' ? 'Ballot Open' :
                 ballotStatus === 'preview' ? 'Preview Mode' :
                 'Ballot Closed'}
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => router.push("/ecommittee/dashboard")}
              className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors z-10"
            >
              ×
            </button>

            {/* College Logo */}
            <div className="absolute top-16 right-4 w-20 h-20 bg-white rounded-full flex items-center justify-center z-10">
              <img
                src="/cpclogo.png"
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
                <h1 className="text-4xl font-bold text-white mb-2">
                  {election?.title || "DEPARTMENTAL ELECTION"}
                </h1>
                <h2 className="text-3xl font-semibold text-white mb-2">
                  {currentPosition.positionName}
                </h2>
                <p className="text-white/90 text-xl mb-2">
                  {election?.department?.departmentCode} - {election?.department?.degreeProgram}
                </p>
                {election?.electionDate && (
                  <p className="text-white/90 text-lg mb-4">
                    {new Date(election.electionDate).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                )}
                
                {/* Year Level Restriction Info */}
                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 inline-block">
                  <p className="text-white/90 text-sm flex items-center">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Eligible Year Levels: {yearLevels.map(level => ballotAPI.getYearLevelText(level)).join(', ')}
                  </p>
                </div>

                {/* Position Order Info */}
                <div className="mt-3">
                  <p className="text-white/80 text-sm">
                    Position {availablePositions.findIndex(p => p._id === positionId) + 1} of {availablePositions.length} • 
                    Order: {currentPosition.positionOrder}
                  </p>
                </div>
              </div>

              {/* Candidates Grid - Centered */}
              <div className="flex items-center justify-center">
                <div
                  className={`grid gap-8 justify-items-center ${
                    ballotPreview.candidates?.length === 1
                      ? "grid-cols-1"
                      : ballotPreview.candidates?.length === 2
                        ? "grid-cols-2 max-w-2xl"
                        : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                  }`}
                >
                  {ballotPreview.candidates?.map((candidate) => {
                    const selected = isSelected(candidate._id)
                    
                    return (
                      <div
                        key={candidate._id}
                        onClick={() => handleVoteSelection(candidate._id)}
                        className={`relative cursor-pointer transition-all duration-300 hover:shadow-xl transform hover:scale-105 w-64 rounded-lg overflow-hidden ${
                          selected
                            ? "ring-4 ring-white shadow-2xl scale-105"
                            : "shadow-lg hover:shadow-xl"
                        }`}
                        style={{ minHeight: "320px" }}
                      >
                        {/* Main candidate card with dark green background when selected */}
                        <div className={`h-full flex flex-col transition-all duration-300 ${
                          selected ? "bg-[#15803d]" : "bg-white"
                        }`}>
                          
                          {/* Image container with check icon overlay */}
                          <div className="relative w-full h-48 bg-gray-200 overflow-hidden flex-shrink-0">
                            <CampaignPicture candidate={candidate} />
                            
                            {/* Check icon overlay - top right */}
                            {selected && (
                              <div className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center z-30 shadow-lg">
                                <Check className="w-5 h-5 text-[#15803d] font-bold stroke-[3]" />
                              </div>
                            )}
                          </div>

                          {/* Candidate info section */}
                          <div className="flex-1 p-4 text-center flex flex-col justify-end">
                            <div
                              className={`-mx-4 -mb-4 p-3 transition-all duration-300 ${
                                selected
                                  ? "bg-[#15803d] text-white"
                                  : "bg-green-600 text-white hover:bg-green-700"
                              }`}
                            >
                              <p className="text-sm font-bold truncate">
                                {candidate.candidateNumber ? `${candidate.candidateNumber}. ` : ""}
                                {candidate.name || "Unknown Candidate"}
                              </p>
                              <p className="text-xs opacity-90 mt-1">
                                {candidate.schoolId ? `ID: ${candidate.schoolId}` : "No ID"}
                              </p>
                              <p className="text-xs opacity-90">
                                {candidate.yearLevel ? ballotAPI.getYearLevelText(candidate.yearLevel) : ""}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Selection Info */}
              <div className="mt-8 text-center">
                <p className="text-white text-lg">
                  {selectedVote ? "Candidate Selected" : "Select 1 candidate"}
                </p>
                {selectedVote && (
                  <p className="text-white/80 text-sm mt-2">
                    Click "Test Submit" to simulate ballot submission
                  </p>
                )}
                
                {/* Ballot Status Message */}
                <div className="mt-4">
                  <p className={`text-sm font-medium ${
                    ballotStatus === 'open' ? 'text-green-200' :
                    ballotStatus === 'preview' ? 'text-blue-200' :
                    'text-red-200'
                  }`}>
                    {ballotStatus === 'open' ? '🟢 This position is currently open for voting' :
                     ballotStatus === 'preview' ? '🔵 Preview mode - voters will see this ballot when opened' :
                     '🔴 This position is currently closed for voting'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !ballotPreview && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-12">
            <div className="text-center">
              <Loader2 className="animate-spin w-12 h-12 mx-auto text-[#001f65] mb-4" />
              <h3 className="text-lg font-semibold text-[#001f65] mb-2">Loading Ballot Preview</h3>
              <p className="text-[#001f65]/70">Please wait while we prepare the departmental ballot preview...</p>
            </div>
          </div>
        )}

        {/* No Position Selected State */}
        {!isLoading && !currentPosition && availablePositions.length > 0 && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-12">
            <div className="text-center">
              <Vote className="w-16 h-16 mx-auto text-[#001f65] mb-4" />
              <h3 className="text-xl font-bold text-[#001f65] mb-2">Select a Position</h3>
              <p className="text-[#001f65]/70 mb-6">Choose a position from the dropdown above to preview its ballot.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
                {availablePositions.map((position, index) => (
                  <button
                    key={position._id}
                    onClick={() => handlePositionChange(position._id)}
                    className="p-4 bg-green-100 hover:bg-green-200 border border-green-300 rounded-lg transition-colors text-left"
                  >
                    <h4 className="font-semibold text-green-800">{position.positionName}</h4>
                    <p className="text-green-600 text-sm mt-1">Order: {position.positionOrder}</p>
                    {position.description && (
                      <p className="text-green-700 text-xs mt-2">{position.description}</p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* No Data State */}
        {!isLoading && availablePositions.length === 0 && !error && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-12">
            <div className="text-center">
              <Vote className="w-16 h-16 mx-auto text-[#001f65] mb-4" />
              <h3 className="text-xl font-bold text-[#001f65] mb-2">No Positions Available</h3>
              <p className="text-[#001f65]/70 mb-6">No positions are currently available for voting in this departmental election.</p>
              <button
                onClick={fetchElectionData}
                className="px-4 py-2 bg-[#001f65] hover:bg-[#003399] text-white rounded-lg transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        )}

        {/* Position Management Summary */}
        {availablePositions.length > 0 && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
            <h4 className="text-lg font-semibold text-[#001f65] mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Position-Based Voting Management
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availablePositions.map((position, index) => (
                <div
                  key={position._id}
                  className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                    position._id === positionId
                      ? "bg-green-100 border-green-300 shadow-md"
                      : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                  }`}
                  onClick={() => handlePositionChange(position._id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">
                      Position {index + 1}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      position._id === positionId 
                        ? "bg-green-200 text-green-800" 
                        : "bg-gray-200 text-gray-600"
                    }`}>
                      {position._id === positionId ? "Current" : "Available"}
                    </span>
                  </div>
                  <h5 className="font-semibold text-gray-800 mb-1">{position.positionName}</h5>
                  <p className="text-xs text-gray-500">Order: {position.positionOrder}</p>
                  
                  {/* Position-specific status */}
                  {position._id === positionId && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${
                        ballotStatus === 'open' ? 'bg-green-200 text-green-800' :
                        ballotStatus === 'preview' ? 'bg-blue-200 text-blue-800' :
                        'bg-red-200 text-red-800'
                      }`}>
                        {ballotStatus === 'open' ? '🟢 Open' :
                         ballotStatus === 'preview' ? '🔵 Preview' :
                         '🔴 Closed'}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                Total Positions: {availablePositions.length} | 
                Current: {(availablePositions.findIndex(p => p._id === positionId) + 1) || 0} |
                Candidates: {ballotPreview?.candidates?.length || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Each position has its own ballot release schedule and year level restrictions
              </p>
            </div>
          </div>
        )}
      </div>
    </DepartmentalLayout>
  )
}