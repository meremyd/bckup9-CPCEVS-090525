"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { departmentalElectionsAPI } from "@/lib/api/departmentalElections"
import { ballotAPI } from "@/lib/api/ballots"
import { electionParticipationAPI } from "@/lib/api/electionParticipation"
import VoterLayout from '@/components/VoterLayout'
import Swal from 'sweetalert2'
import {
  Vote,
  Loader2,
  ArrowLeft,
  Clock,
  Calendar,
  AlertCircle,
  LogOut,
  CheckCircle,
  X,
  Trophy,
  Receipt,
  Download
} from "lucide-react"

export default function VoterDepartmentalElectionInfoPage() {
  const [election, setElection] = useState(null)
  const [positions, setPositions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [voter, setVoter] = useState(null)
  const [isOfficer, setIsOfficer] = useState(false)
  const [participationStatus, setParticipationStatus] = useState(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [receiptData, setReceiptData] = useState(null)
  const [loadingReceipt, setLoadingReceipt] = useState(false)

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

      const voterData = JSON.parse(localStorage.getItem("voter") || "{}")
      setVoter(voterData)
      setIsOfficer(!!voterData.isClassOfficer)

      if (!electionId) {
        setError("No election ID provided")
        setLoading(false)
        return
      }

      await loadElectionAndCheckParticipation(voterData)
    } catch (error) {
      setError("Authentication error occurred")
      setLoading(false)
    }
  }

  const loadElectionAndCheckParticipation = async (voterData) => {
    try {
      setLoading(true)
      
      // Get election info
      const electionResponse = await departmentalElectionsAPI.getForVoters(electionId)
      const electionData = electionResponse?.data?.election || electionResponse?.election
      if (!electionData) {
        setError("Election not found")
        setLoading(false)
        return
      }
      setElection(electionData)

      // Officer check
      if (!voterData.isClassOfficer) {
        setIsOfficer(false)
        setLoading(false)
        return
      }
      setIsOfficer(true)

      // Participation status
      try {
        const participationResponse = await electionParticipationAPI.checkDepartmentalStatus(electionId)
        setParticipationStatus(participationResponse)
        if (!participationResponse?.hasParticipated && ['active', 'upcoming'].includes(electionData.status)) {
          setShowConfirmModal(true)
          setLoading(false)
          return
        }
      } catch (participationError) {
        if (participationError.response?.status === 404 && ['active', 'upcoming'].includes(electionData.status)) {
          setShowConfirmModal(true)
          setLoading(false)
          return
        }
      }

      await loadAvailablePositions()
      setLoading(false)
    } catch (error) {
      setError("Failed to load election information")
      setLoading(false)
    }
  }

  const loadAvailablePositions = async () => {
  try {
    // Fetch ALL positions for the election (not just available)
    const response = await ballotAPI.voter.getAvailablePositionsForVoting(electionId)
    
    // Get voting status for each position
    const positionsWithStatus = await Promise.all(
      response.availablePositions.map(async (pos) => {
        try {
          const ballotStatus = await ballotAPI.voter.getVoterDepartmentalBallotStatus(electionId, pos._id)
          return {
            ...pos,
            hasVoted: ballotStatus.hasVoted,
            canVote: ballotStatus.canVote
          }
        } catch (error) {
          return {
            ...pos,
            hasVoted: false,
            canVote: false
          }
        }
      })
    )
    
    setPositions(positionsWithStatus)
  } catch (error) {
    console.error("Error loading positions:", error)
    setPositions([])
  }
}

  const handleConfirmParticipation = async (willParticipate) => {
    if (isProcessing) return

    if (!willParticipate) {
      Swal.fire({
        icon: 'info',
        title: 'Participation Declined',
        text: 'You chose not to participate in this election.',
        confirmButtonColor: '#001f65'
      }).then(() => {
        router.push('/voter/departmental/elections')
      })
      return
    }

    try {
      setIsProcessing(true)
      Swal.fire({
        title: 'Confirming Participation...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading()
        }
      })

      await electionParticipationAPI.confirmDepartmentalParticipation(electionId)
      const updatedStatus = await electionParticipationAPI.checkDepartmentalStatus(electionId)
      setParticipationStatus(updatedStatus)
      setShowConfirmModal(false)
      await loadAvailablePositions()
      Swal.fire({
        icon: 'success',
        title: 'Participation Confirmed',
        text: 'You can now view the election details and vote when ballots open.',
        confirmButtonColor: '#001f65'
      })
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to confirm participation'
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonColor: '#001f65'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleVoteClick = (positionId) => {
    router.push(`/voter/departmental/ballot?electionId=${electionId}&positionId=${positionId}`)
  }

  const handleResultsClick = () => {
    router.push(`/voter/departmental/results?id=${electionId}`)
  }

  const handleOpenReceipt = async () => {
    setLoadingReceipt(true)
    setShowReceiptModal(true)
    
    try {
      const data = await electionParticipationAPI.getDepartmentalVotingReceiptDetails(electionId)
      setReceiptData(data)
    } catch (error) {
      console.error("Error loading voting receipt:", error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load voting receipt',
        confirmButtonColor: '#001f65'
      })
      setShowReceiptModal(false)
    } finally {
      setLoadingReceipt(false)
    }
  }

  const handleDownloadReceipt = async () => {
    try {
      Swal.fire({
        title: 'Generating Receipt...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading()
        }
      })

      const blob = await electionParticipationAPI.exportDepartmentalVotingReceiptPDF(electionId)
      
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Departmental_Voting_Receipt_${receiptData?.voter?.schoolId || 'voter'}_${election?.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      Swal.fire({
        icon: 'success',
        title: 'Receipt Downloaded',
        text: 'Your voting receipt has been downloaded successfully',
        confirmButtonColor: '#001f65',
        timer: 2000
      })
    } catch (error) {
      console.error("Error downloading receipt:", error)
      Swal.fire({
        icon: 'error',
        title: 'Download Failed',
        text: 'Failed to download voting receipt',
        confirmButtonColor: '#001f65'
      })
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

  const formatTime = (time24) => {
    if (!time24) return ''
    try {
      const date = new Date(time24)
      const hours = date.getHours()
      const minutes = date.getMinutes()
      const period = hours >= 12 ? 'PM' : 'AM'
      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
    } catch (error) {
      return 'Invalid time'
    }
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    } catch (error) {
      return 'Invalid date'
    }
  }

  // UI Rendering
  if (loading) {
    return (
      <VoterLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20">
            <Loader2 className="animate-spin rounded-full h-12 w-12 mx-auto text-white" />
            <p className="mt-4 text-white font-medium">Loading election details...</p>
          </div>
        </div>
      </VoterLayout>
    )
  }

  if (error) {
    return (
      <VoterLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-xl max-w-md mx-auto border border-white/20">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Error</h2>
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

  // If the voter is not an officer, show info and restrict access
  if (!isOfficer) {
    return (
      <VoterLayout>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-xl max-w-md mx-auto border border-white/20">
            <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Not Allowed</h2>
            <p className="text-gray-600 mb-4 text-center">
              You are not a class officer. Only class officers can vote in departmental elections.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleResultsClick}
                className="w-full bg-[#001f65] hover:bg-[#003399] text-white px-6 py-2 rounded-lg transition-colors"
              >
                View Election Result
              </button>
              <button
                onClick={() => router.push('/voter/departmental/elections')}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Back to Elections
              </button>
            </div>
          </div>
        </div>
      </VoterLayout>
    )
  }

  // Participation Modal
  if (showConfirmModal && election) {
    return (
      <VoterLayout>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl max-w-lg w-full p-8 border border-white/20">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-[#001f65] to-[#003399] rounded-full flex items-center justify-center mx-auto mb-4">
                <Vote className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-[#001f65] mb-2">Confirm Participation</h2>
              <p className="text-gray-600">Would you like to participate in this departmental election?</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 mb-6">
              <h3 className="font-bold text-[#001f65] mb-2">{election.title}</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>{new Date(election.electionDate).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleConfirmParticipation(false)}
                disabled={isProcessing}
                className="flex-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg transition-colors font-medium"
              >
                No, Cancel
              </button>
              <button
                onClick={() => handleConfirmParticipation(true)}
                disabled={isProcessing}
                className="flex-1 bg-[#001f65] hover:bg-[#003399] disabled:bg-[#001f65]/60 text-white px-6 py-3 rounded-lg transition-colors font-medium flex items-center justify-center"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="animate-spin w-5 h-5 mr-2" />
                    Processing...
                  </>
                ) : (
                  'Yes, Participate'
                )}
              </button>
            </div>
          </div>
        </div>
      </VoterLayout>
    )
  }

  // Main Info Page for Officers
  return (
    <VoterLayout>
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-sm shadow-lg border-b border-white/30 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center min-w-0">
            <button
              onClick={() => router.push('/voter/departmental/elections')}
              className="mr-2 sm:mr-3 p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-[#001f65]" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-[#001f65] truncate">{election?.title}</h1>
              <p className="text-xs text-[#001f65]/70">Election Year {election?.electionYear}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleResultsClick}
              className="p-2 text-[#001f65] hover:bg-blue-50 rounded-lg transition-colors border border-blue-200 bg-white/60 backdrop-blur-sm"
              title="View Results"
            >
              <Trophy className="w-5 h-5" />
            </button>
            <button
              onClick={handleOpenReceipt}
              className="p-2 text-[#001f65] hover:bg-blue-50 rounded-lg transition-colors border border-blue-200 bg-white/60 backdrop-blur-sm"
              title="View Voting Receipt"
            >
              <Receipt className="w-5 h-5" />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center px-2 sm:px-4 py-2 text-xs sm:text-sm text-red-600 hover:bg-red-50/80 rounded-lg transition-colors border border-red-200 bg-white/60 backdrop-blur-sm"
            >
              <LogOut className="w-4 h-4 mr-0 sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 lg:p-6">
        <div className="min-h-[calc(100vh-120px)] max-w-6xl mx-auto">

          {/* Election Info Banner - More Compact */}
          <div className="rounded-2xl p-4 sm:p-6 mb-6">
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl font-bold text-[#001f65] mb-3">{election?.title}</h2>
              <div className="inline-block">
                <div className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-sm sm:text-base font-bold mb-3 sm:mb-4 bg-blue-500/20 text-blue-700 border border-blue-500">
                  {election?.status}
                </div>
              </div>
              <div className="space-y-2 text-[#001f65] text-sm">
                <div className="flex items-center justify-center flex-wrap gap-1">
                  <span className="font-semibold">Election ID:</span>
                  <span>{election?.deptElectionId}</span>
                </div>
                <div className="flex items-center justify-center flex-wrap gap-1">
                  <Calendar className="w-4 h-4" />
                  <span className="font-semibold">Election Date:</span>
                  <span className="text-center text-xs sm:text-sm">
                    {new Date(election?.electionDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      weekday: 'long'
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Available Positions Section - Responsive Grid */}
          <div className="mb-8">
            {positions.length === 0 ? (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center border border-white/20">
                <AlertCircle className="w-12 h-12 text-white/60 mx-auto mb-3" />
                <p className="text-white/80">No available positions for voting in this election</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
            {positions.map((position) => {
                // Determine button state and message
                let buttonContent
                let buttonClass = "w-full px-4 py-2 rounded-lg transition-all duration-300 text-sm font-bold flex items-center justify-center gap-2"
                
                if (position.hasVoted) {
                // Voter has completed voting for this position
                buttonContent = (
                    <>
                    <CheckCircle className="w-4 h-4" />
                    Voted
                    </>
                )
                buttonClass += " bg-green-600 text-white cursor-default"
                } else if (position.isCurrentlyOpen) {
                // Ballot is open - can vote
                buttonContent = (
                    <>
                    <Vote className="w-4 h-4" />
                    Vote Now
                    </>
                )
                buttonClass += " bg-gradient-to-r from-[#001f65] to-[#003399] hover:from-[#003399] hover:to-[#001f65] text-white shadow-lg cursor-pointer"
                } else if (position.ballotOpenTime && position.ballotCloseTime) {
                const now = new Date()
                const openTime = new Date(position.ballotOpenTime)
                const closeTime = new Date(position.ballotCloseTime)
                
                if (now > closeTime) {
                    // Ballot has closed
                    buttonContent = (
                    <>
                        <X className="w-4 h-4" />
                        Ballot Closed
                    </>
                    )
                    buttonClass += " bg-red-500/20 text-red-300 border border-red-300/20 cursor-default"
                } else {
                    // Ballot not open yet
                    buttonContent = (
                    <>
                        <Clock className="w-4 h-4" />
                        Ballot Not Open Yet
                    </>
                    )
                    buttonClass += " bg-yellow-500/20 text-yellow-300 border border-yellow-300/20 cursor-default"
                }
                } else {
                // No timing set
                buttonContent = "Ballot Not Available"
                buttonClass += " bg-gray-500/20 text-gray-300 border border-gray-300/20 cursor-default"
                }
                
                return (
                <div
                    key={position._id}
                    className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/20 shadow-lg flex flex-col"
                >
                    <h3 className="text-base sm:text-lg font-bold text-white text-center mb-2">
                    {position.positionName}
                    </h3>
                    
                    {/* Ballot Timing Info */}
                    {position.ballotOpenTime && position.ballotCloseTime && (
                    <div className="bg-white/10 rounded-lg p-2 mb-3 text-xs text-white/90">
                        <div className="flex items-center justify-center gap-1 mb-1">
                        <Clock className="w-3 h-3" />
                        <span className="font-semibold">Ballot Hours</span>
                        </div>
                        <div className="text-center">
                        {formatTime(position.ballotOpenTime)} - {formatTime(position.ballotCloseTime)}
                        </div>
                    </div>
                    )}
                    
                    <div className="flex flex-col items-center mt-auto w-full">
                    <button
                        onClick={() => position.isCurrentlyOpen && !position.hasVoted ? handleVoteClick(position._id) : null}
                        disabled={!position.isCurrentlyOpen || position.hasVoted}
                        className={buttonClass}
                    >
                        {buttonContent}
                    </button>
                    </div>
                </div>
                )
            })}
            </div>
            )}
          </div>

        </div>
      </div>

      {/* Receipt Modal */}
      {showReceiptModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowReceiptModal(false)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-[#001f65] to-[#003399] rounded-full flex items-center justify-center mx-auto mb-4">
                <Receipt className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-[#001f65] mb-2">Voting Receipt</h2>
            </div>

            {loadingReceipt ? (
              <div className="text-center py-8">
                <Loader2 className="animate-spin rounded-full h-12 w-12 mx-auto text-[#001f65]" />
                <p className="mt-4 text-gray-600">Loading receipt...</p>
              </div>
            ) : receiptData ? (
              <div className="space-y-4">
                <div className="bg-blue-50 rounded-xl p-4">
                  <h3 className="font-bold text-[#001f65] mb-3">Voter Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span className="font-medium text-right">
                        {receiptData.voter?.fullName || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">School ID:</span>
                      <span className="font-medium">{receiptData.voter?.schoolId || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Department:</span>
                      <span className="font-medium text-right">
                        {receiptData.voter?.department?.departmentCode || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={`rounded-xl p-4 ${receiptData.hasVoted ? 'bg-green-50' : 'bg-gray-50'}`}>
                  <h3 className={`font-bold mb-3 ${receiptData.hasVoted ? 'text-green-800' : 'text-gray-800'}`}>
                    Voting Status
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Status:</span>
                      <span className={`font-bold ${receiptData.hasVoted ? 'text-green-600' : 'text-gray-600'}`}>
                        {receiptData.hasVoted ? 'VOTED' : 'NOT VOTED'}
                      </span>
                    </div>
                    {receiptData.hasVoted && receiptData.submittedAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Voted At:</span>
                        <span className="font-medium text-right text-xs">
                          {formatDateTime(receiptData.submittedAt)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Election:</span>
                      <span className="font-medium text-right text-xs">
                        {receiptData.electionTitle || election?.title}
                      </span>
                    </div>
                  </div>
                </div>

                {receiptData.hasVoted ? (
                  <button
                    onClick={handleDownloadReceipt}
                    className="w-full bg-[#001f65] hover:bg-[#003399] text-white px-6 py-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Download Receipt (PDF)
                  </button>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                    <p className="text-yellow-800 text-sm">
                      You haven't completed voting in this election yet.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                <p className="text-gray-600">Failed to load voting receipt</p>
              </div>
            )}
          </div>
        </div>
      )}

    </VoterLayout>
  )
}