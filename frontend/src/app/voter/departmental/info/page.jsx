"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { departmentalElectionsAPI } from "@/lib/api/departmentalElections"
import { ballotAPI } from "@/lib/api/ballots"
import { electionParticipationAPI } from "@/lib/api/electionParticipation"
import { positionsAPI } from "@/lib/api/positions"
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
  const [refreshing, setRefreshing] = useState(false)
  

  const router = useRouter()
  const searchParams = useSearchParams()
  const electionId = searchParams.get('id')

 useEffect(() => {
  checkAuthAndLoadData()
}, [electionId, searchParams]) 

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
      
      const electionResponse = await departmentalElectionsAPI.getForVoters(electionId)
      const electionData = electionResponse?.data?.election || electionResponse?.election
      if (!electionData) {
        setError("Election not found")
        setLoading(false)
        return
      }
      setElection(electionData)

      if (!voterData.isClassOfficer) {
        setIsOfficer(false)
        setLoading(false)
        return
      }
      setIsOfficer(true)

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

      await loadAllPositionsWithStatus(voterData)
      setLoading(false)
    } catch (error) {
      setError("Failed to load election information")
      setLoading(false)
    }
  }

const loadAllPositionsWithStatus = async (voterData = voter) => {
  try {
    setRefreshing(true)
    
    const allPositionsResponse = await positionsAPI.voter.departmental.getByElection(electionId)
    const allPositions = allPositionsResponse?.data?.positions || []
    
    // Filter positions by voter's year level eligibility
    const eligiblePositionIds = allPositions
      .filter(pos => {
        if (!pos.description) return true
        
        const yearLevelMatch = pos.description.match(/Year levels?: (.*?)(?:\n|$)/)
        if (!yearLevelMatch) return true
        
        const restrictionText = yearLevelMatch[1]
        if (restrictionText.includes('All year levels')) return true
        
        const allowedLevels = []
        if (restrictionText.includes('1st')) allowedLevels.push(1)
        if (restrictionText.includes('2nd')) allowedLevels.push(2)
        if (restrictionText.includes('3rd')) allowedLevels.push(3)
        if (restrictionText.includes('4th')) allowedLevels.push(4)
        
        return allowedLevels.length === 0 || allowedLevels.includes(voterData.yearLevel)
      })
      .map(pos => pos._id.toString())
    
    const positionsWithStatus = await Promise.all(
      allPositions.map(async (pos) => {
        const isEligible = eligiblePositionIds.includes(pos._id.toString())
        
        try {
          // ✅ FIX: Get ballot status from backend (includes isCurrentlyOpen)
          const ballotStatus = await ballotAPI.voter.getVoterDepartmentalBallotStatus(electionId, pos._id)
          
          // ✅ FIX: Use backend's calculation of isCurrentlyOpen
          const isCurrentlyOpen = ballotStatus.position?.isCurrentlyOpen || false
          
          console.log(`✅ Ballot Status for ${pos.positionName}:`, {
            isCurrentlyOpen,
            ballotOpenTime: ballotStatus.position?.ballotOpenTime,
            ballotCloseTime: ballotStatus.position?.ballotCloseTime,
            canVote: ballotStatus.canVote,
            hasVoted: ballotStatus.hasVoted
          })
          
          let yearLevelRestriction = null
          if (pos.description) {
            const yearLevelMatch = pos.description.match(/Year levels?: (.*?)(?:\n|$)/)
            if (yearLevelMatch && !yearLevelMatch[1].includes('All year levels')) {
              yearLevelRestriction = yearLevelMatch[1]
            }
          }
          
          return {
            ...pos,
            hasVoted: ballotStatus.hasVoted || false,
            canVote: ballotStatus.canVote || false,
            isCurrentlyOpen, // ✅ From backend
            isEligible,
            yearLevelRestriction,
            ballotOpenTime: ballotStatus.position?.ballotOpenTime || pos.ballotOpenTime,
            ballotCloseTime: ballotStatus.position?.ballotCloseTime || pos.ballotCloseTime
          }
        } catch (error) {
          console.error(`Error getting status for position ${pos._id}:`, error)
          
          let yearLevelRestriction = null
          if (pos.description) {
            const yearLevelMatch = pos.description.match(/Year levels?: (.*?)(?:\n|$)/)
            if (yearLevelMatch && !yearLevelMatch[1].includes('All year levels')) {
              yearLevelRestriction = yearLevelMatch[1]
            }
          }
          
          return {
            ...pos,
            hasVoted: false,
            canVote: false,
            isCurrentlyOpen: false, // Safe default
            isEligible,
            yearLevelRestriction
          }
        }
      })
    )
    
    setPositions(positionsWithStatus)
  } catch (error) {
    console.error("Error loading positions:", error)
    setPositions([])
  } finally {
    setRefreshing(false)
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
      await loadAllPositionsWithStatus()
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
      // ✅ FIX #5: Don't allow download with zero votes
      if (!receiptData || !receiptData.hasVoted || receiptData.votingProgress?.votedPositions === 0) {
        await Swal.fire({
          icon: 'warning',
          title: 'No Votes Cast',
          html: `
            <div class="text-left space-y-3">
              <p class="mb-2"><strong>⚠️ You haven't cast any votes yet.</strong></p>
              <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p class="text-sm">You must vote for at least one position before downloading your receipt.</p>
              </div>
            </div>
          `,
          confirmButtonColor: '#001f65',
          confirmButtonText: 'Understood'
        })
        return
      }

      // Check if voting is incomplete (but allow download anyway)
      if (receiptData && !receiptData.hasVotedAll && receiptData.votingProgress?.votedPositions > 0) {
        const result = await Swal.fire({
          icon: 'warning',
          title: 'Incomplete Voting',
          html: `
            <div class="text-left space-y-3">
              <p class="mb-2"><strong>⚠️ You have not completed voting for all eligible positions yet.</strong></p>
              <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p class="text-sm font-semibold mb-2">Voting Progress:</p>
                <ul class="text-sm space-y-1">
                  <li>✓ Voted: ${receiptData.votingProgress?.votedPositions || 0} positions</li>
                  <li>⚠ Remaining: ${receiptData.votingProgress?.remainingPositions || 0} positions</li>
                  <li>📊 Total Eligible: ${receiptData.votingProgress?.totalPositions || 0} positions</li>
                </ul>
              </div>
              <p class="text-sm text-gray-600 mt-2">Your receipt will show the votes you've cast so far.</p>
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: 'Download Receipt',
          cancelButtonText: 'Cancel',
          confirmButtonColor: '#001f65',
          cancelButtonColor: '#6B7280',
          customClass: {
            popup: 'swal-wide'
          }
        })

        if (!result.isConfirmed) {
          return
        }
      }

      // Show generating message
      Swal.fire({
        title: 'Generating Receipt...',
        html: 'Please wait while we prepare your voting receipt.',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          Swal.showLoading()
        }
      })

      // Download the PDF
      const blob = await electionParticipationAPI.exportDepartmentalVotingReceiptPDF(electionId)
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      const fileName = `Departmental_Voting_Receipt_${receiptData?.voter?.schoolId || 'voter'}_${election?.title.replace(/[^a-zA-Z0-9]/g, '_') || 'Election'}.pdf`
      link.download = fileName
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Clean up the URL
      setTimeout(() => {
        window.URL.revokeObjectURL(url)
      }, 100)
      
      // Success message
      Swal.fire({
        icon: 'success',
        title: 'Receipt Downloaded',
        html: `
          <p>Your voting receipt has been downloaded successfully!</p>
          <p class="text-sm text-gray-600 mt-2">File: ${fileName}</p>
        `,
        confirmButtonColor: '#001f65',
        timer: 3000,
        timerProgressBar: true
      })
      
    } catch (error) {
      console.error("Error downloading receipt:", error)
      
      let errorMessage = 'Failed to download voting receipt. Please try again.'
      
      if (error.response) {
        errorMessage = error.response.data?.message || `Server error (${error.response.status})`
      } else if (error.request) {
        errorMessage = 'No response from server. Please check your connection.'
      } else {
        errorMessage = error.message || 'An unexpected error occurred.'
      }
      
      Swal.fire({
        icon: 'error',
        title: 'Download Failed',
        html: `
          <p>${errorMessage}</p>
          <p class="text-sm text-gray-600 mt-2">If the problem persists, please contact support.</p>
        `,
        confirmButtonColor: '#001f65',
        showCancelButton: true,
        confirmButtonText: 'Try Again',
        cancelButtonText: 'Close'
      }).then((result) => {
        if (result.isConfirmed) {
          handleDownloadReceipt()
        }
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

const formatTime = (dateTime) => {
  if (!dateTime) return ''
  try {
    // ✅ FIX: Parse the Date object correctly
    const date = new Date(dateTime)
    
    // ✅ Format as 12-hour time with AM/PM in local time
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  } catch (error) {
    console.error('Error formatting time:', error)
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

const getPositionStatus = (position) => {
  // Check eligibility first
  if (!position.isEligible) {
    return {
      message: 'Not Eligible',
      icon: <AlertCircle className="w-4 h-4" />,
      buttonClass: 'bg-gray-400/40 text-gray-300 border border-gray-400/40 cursor-not-allowed',
      canClick: false,
      showTiming: false,
      isIneligible: true
    }
  }
  
  if (position.hasVoted) {
    return {
      message: 'Voted',
      icon: <CheckCircle className="w-4 h-4" />,
      buttonClass: 'bg-green-600 text-white cursor-default',
      canClick: false,
      showTiming: true,
      isIneligible: false
    }
  }
  
  // ✅ This should now work correctly
  if (position.isCurrentlyOpen) {
    return {
      message: 'Vote Now',
      icon: <Vote className="w-4 h-4" />,
      buttonClass: 'bg-gradient-to-r from-[#001f65] to-[#003399] hover:from-[#003399] hover:to-[#001f65] text-white shadow-lg cursor-pointer',
      canClick: true,
      showTiming: true,
      isIneligible: false
    }
  }
  
  // Check if closed
  const now = new Date()
  if (position.ballotCloseTime && now > new Date(position.ballotCloseTime)) {
    return {
      message: 'Ballot Closed',
      icon: <X className="w-4 h-4" />,
      buttonClass: 'bg-red-500/20 text-red-300 border border-red-300/20 cursor-default',
      canClick: false,
      showTiming: true,
      isIneligible: false
    }
  }
  
  // Default: Not open yet
  return {
    message: 'Ballot Not Open Yet',
    icon: <Clock className="w-4 h-4" />,
    buttonClass: 'bg-yellow-500/20 text-yellow-300 border border-yellow-300/20 cursor-default',
    canClick: false,
    showTiming: true,
    isIneligible: false
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

          {refreshing && (
  <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-center gap-3">
    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
    <span className="text-blue-800 font-medium">Refreshing status...</span>
  </div>
)}

          {/* Election Info Banner */}
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

          {/* ✅ FIX #1: Position Cards with Year Level Restrictions */}
          <div className="mb-8">
            {positions.length === 0 ? (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center border border-white/20">
                <AlertCircle className="w-12 h-12 text-white/60 mx-auto mb-3" />
                <p className="text-white/80">No positions found for this election</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
                {positions.map((position) => {
                  const status = getPositionStatus(position)
                  
                  return (
                    <div
                      key={position._id}
                      className={`rounded-2xl p-4 border shadow-lg flex flex-col ${
                        status.isIneligible 
                          ? 'bg-gray-500/20 border-gray-400/30' 
                          : 'bg-white/20 border-white/20'
                      } backdrop-blur-sm`}
                    >
                      <h3 className={`text-base sm:text-lg font-bold text-center mb-2 ${
                        status.isIneligible ? 'text-gray-300' : 'text-white'
                      }`}>
                        {position.positionName}
                      </h3>
                      
                      {/* ✅ FIX #1: Year Level Restriction Message (Inside Card) */}
                      {status.isIneligible && position.yearLevelRestriction && (
                        <div className="bg-gray-600/40 border border-gray-500/40 rounded-lg p-2 mb-3">
                          <p className="text-xs text-gray-200 text-center font-medium">
                            ⚠️ Only {position.yearLevelRestriction} year can vote for this position
                          </p>
                        </div>
                      )}
                      
                      {/* ✅ Ballot Timing Info (Only show if eligible and showTiming is true) */}
                      {status.showTiming && position.ballotOpenTime && position.ballotCloseTime && (
                        <div className={`rounded-lg p-2 mb-3 text-xs ${
                          status.isIneligible 
                            ? 'bg-gray-600/20 text-gray-300' 
                            : 'bg-white/10 text-white/90'
                        }`}>
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
                          onClick={() => status.canClick ? handleVoteClick(position._id) : null}
                          disabled={!status.canClick}
                          className={`w-full px-4 py-2 rounded-lg transition-all duration-300 text-sm font-bold flex items-center justify-center gap-2 ${status.buttonClass}`}
                        >
                          {status.icon}
                          {status.message}
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
              <p className="text-sm text-gray-600">Departmental Election</p>
            </div>

            {loadingReceipt ? (
              <div className="text-center py-8">
                <Loader2 className="animate-spin rounded-full h-12 w-12 mx-auto text-[#001f65]" />
                <p className="mt-4 text-gray-600">Loading receipt...</p>
              </div>
            ) : receiptData ? (
              <div className="space-y-4">
                
                {/* Election Information */}
                <div className="bg-blue-50 rounded-xl p-4">
                  <h3 className="font-bold text-[#001f65] mb-3">Election Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Election:</span>
                      <span className="font-medium text-right">
                        {receiptData.election?.title || election?.title || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Department:</span>
                      <span className="font-medium text-right">
                        {receiptData.election?.department?.departmentCode || 
                         receiptData.voter?.department?.departmentCode || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Voter Information */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-bold text-gray-800 mb-3">Voter Information</h3>
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
                  </div>
                </div>

                {/* ✅ FIX #2: Voting Progress (only eligible positions) */}
                <div className={`rounded-xl p-4 border-2 ${
                  receiptData.hasVotedAll 
                    ? 'bg-green-50 border-green-300' 
                    : receiptData.votingProgress?.votedPositions > 0
                      ? 'bg-yellow-50 border-yellow-300'
                      : 'bg-gray-50 border-gray-300'
                }`}>
                  <h3 className={`font-bold mb-3 ${
                    receiptData.hasVotedAll 
                      ? 'text-green-800' 
                      : receiptData.votingProgress?.votedPositions > 0
                        ? 'text-yellow-800'
                        : 'text-gray-800'
                  }`}>
                    Voting Progress
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Eligible Positions:</span>
                      <span className="font-bold text-lg">{receiptData.votingProgress?.totalPositions || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Voted Positions:</span>
                      <span className={`font-bold text-lg ${
                        receiptData.votingProgress?.votedPositions > 0 ? 'text-blue-600' : 'text-gray-600'
                      }`}>
                        {receiptData.votingProgress?.votedPositions || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Remaining:</span>
                      <span className={`font-bold text-lg ${
                        receiptData.votingProgress?.remainingPositions > 0 ? 'text-orange-600' : 'text-green-600'
                      }`}>
                        {receiptData.votingProgress?.remainingPositions || 0}
                      </span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${
                            receiptData.hasVotedAll ? 'bg-green-500' : 'bg-yellow-500'
                          }`}
                          style={{ 
                            width: `${((receiptData.votingProgress?.votedPositions || 0) / (receiptData.votingProgress?.totalPositions || 1)) * 100}%` 
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1 text-center">
                        {Math.round(((receiptData.votingProgress?.votedPositions || 0) / (receiptData.votingProgress?.totalPositions || 1)) * 100)}% Complete
                      </p>
                    </div>

                    {/* Status Badge */}
                    <div className="flex justify-center mt-3">
                      <div className={`px-4 py-2 rounded-full font-bold text-sm ${
                        receiptData.hasVotedAll 
                          ? 'bg-green-100 text-green-700 border-2 border-green-300' 
                          : receiptData.votingProgress?.votedPositions > 0
                            ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-300'
                            : 'bg-gray-100 text-gray-700 border-2 border-gray-300'
                      }`}>
                        {receiptData.hasVotedAll 
                          ? '✓ VOTING COMPLETED' 
                          : receiptData.votingProgress?.votedPositions > 0
                            ? '⚠ VOTING IN PROGRESS'
                            : '○ NOT STARTED'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Warning if voting not complete */}
                {!receiptData.hasVotedAll && receiptData.votingProgress?.votedPositions > 0 && (
                  <div className="bg-orange-50 border-l-4 border-orange-400 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-semibold text-orange-800 mb-1">
                          Voting Incomplete
                        </p>
                        <p className="text-orange-700">
                          You have voted for <strong>{receiptData.votingProgress?.votedPositions}</strong> out of <strong>{receiptData.votingProgress?.totalPositions}</strong> eligible positions. 
                          Please continue voting to complete your ballot.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Not Started Warning */}
                {!receiptData.hasVotedAll && receiptData.votingProgress?.votedPositions === 0 && (
                  <div className="bg-gray-50 border-l-4 border-gray-400 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-semibold text-gray-800 mb-1">
                          No Votes Cast Yet
                        </p>
                        <p className="text-gray-700">
                          You haven't voted for any positions yet. Start voting when ballots become available.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Last Updated */}
                {receiptData.lastVotedAt && (
                  <div className="text-center text-xs text-gray-500">
                    Last updated: {formatDateTime(receiptData.lastVotedAt)}
                  </div>
                )}

                {/* Download Button */}
                <button
                  onClick={handleDownloadReceipt}
                  className="w-full bg-[#001f65] hover:bg-[#003399] text-white px-6 py-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Download Receipt (PDF)
                </button>

                {/* Info Note */}
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-blue-800">
                    <strong>Note:</strong> The downloaded PDF will contain detailed information about your votes.
                  </p>
                </div>

              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                <p className="text-gray-600">Failed to load voting receipt</p>
                <button
                  onClick={handleOpenReceipt}
                  className="mt-4 text-[#001f65] hover:underline text-sm font-medium"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </VoterLayout>
  )
}