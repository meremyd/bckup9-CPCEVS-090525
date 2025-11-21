"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { votingAPI } from "@/lib/api/voting"
import { electionParticipationAPI } from "@/lib/api/electionParticipation"
import VoterLayout from '@/components/VoterLayout'
import DepartmentalNavbar from '@/components/DepartmentalNavbar'
import Swal from 'sweetalert2'
import {
  Loader2,
  Trophy,
  Award,
  Lock,
  Clock,
  X,
  Download,
  AlertCircle
} from "lucide-react"

export default function VoterDepartmentalResultsPage() {
  const [election, setElection] = useState(null)
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
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
      if (!electionId) {
        setError("No election ID provided")
        setLoading(false)
        return
      }
      await loadResults()
    } catch (error) {
      setError("Authentication error occurred")
      setLoading(false)
    }
  }

  const isBallotOpen = (position) => {
    if (!position?.ballotOpenTime || !position?.ballotCloseTime) {
      return false
    }

    const now = new Date()
    const openTime = new Date(position.ballotOpenTime)
    const closeTime = new Date(position.ballotCloseTime)

    return now >= openTime && now <= closeTime
  }

  const getPositionTimingInfo = (position) => {
    if (!position?.ballotOpenTime || !position?.ballotCloseTime) {
      return {
        status: 'not_scheduled',
        message: 'Ballot timing not set for this position'
      }
    }

    const now = new Date()
    const openTime = new Date(position.ballotOpenTime)
    const closeTime = new Date(position.ballotCloseTime)

    if (now < openTime) {
      const timeDiff = openTime - now
      const hours = Math.floor(timeDiff / (1000 * 60 * 60))
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
      return {
        status: 'scheduled',
        message: `Voting opens in ${hours}h ${minutes}m`,
        openTime: formatTimeDisplay(position.ballotOpenTime),
        closeTime: formatTimeDisplay(position.ballotCloseTime)
      }
    }

    if (now > closeTime) {
      return {
        status: 'closed',
        message: 'Voting has ended',
        openTime: formatTimeDisplay(position.ballotOpenTime),
        closeTime: formatTimeDisplay(position.ballotCloseTime)
      }
    }

    const timeDiff = closeTime - now
    const hours = Math.floor(timeDiff / (1000 * 60 * 60))
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))

    return {
      status: 'open',
      message: `Voting closes in ${hours}h ${minutes}m`,
      openTime: formatTimeDisplay(position.ballotOpenTime),
      closeTime: formatTimeDisplay(position.ballotCloseTime)
    }
  }

  const loadResults = async () => {
    try {
      setLoading(true)
      const resultsResponse = await votingAPI.getDepartmentalElectionLiveResultsForVoter(electionId)
      
      if (resultsResponse?.success) {
        setResults(resultsResponse.data)
        setElection(resultsResponse.data.election)
      } else {
        setError(resultsResponse?.message || "Could not load results")
      }
      setLoading(false)
    } catch (error) {
      console.error('Error loading results:', error)
      setError("Failed to load departmental election results")
      setLoading(false)
    }
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

      Swal.fire({
        title: 'Generating Receipt...',
        html: 'Please wait while we prepare your voting receipt.',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          Swal.showLoading()
        }
      })

      const blob = await electionParticipationAPI.exportDepartmentalVotingReceiptPDF(electionId)
      
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      const fileName = `Departmental_Voting_Receipt_${receiptData?.voter?.schoolId || 'voter'}_${election?.title.replace(/[^a-zA-Z0-9]/g, '_') || 'Election'}.pdf`
      link.download = fileName
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      setTimeout(() => {
        window.URL.revokeObjectURL(url)
      }, 100)
      
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

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      })
    } catch (error) {
      return 'Invalid date'
    }
  }

  const formatTimeDisplay = (timeString) => {
    if (!timeString) return ''
    try {
      if (typeof timeString === 'string' && timeString.match(/^\d{2}:\d{2}$/)) {
        const [hours, minutes] = timeString.split(':').map(Number)
        const period = hours >= 12 ? 'PM' : 'AM'
        const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
        return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
      }
      
      const date = new Date(timeString)
      const hours = date.getHours()
      const minutes = date.getMinutes()
      const period = hours >= 12 ? 'PM' : 'AM'
      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
    } catch (error) {
      return 'Invalid time'
    }
  }

  const calculatePercentage = (voteCount, totalVotes) => {
    if (!totalVotes || totalVotes === 0) return 0
    return ((voteCount / totalVotes) * 100).toFixed(1)
  }

  const renderCandidateCard = (candidate, index, position) => {
    const ballotIsOpen = isBallotOpen(position)
    const totalVotes = position.totalVotes || 0
    
    const percentage = calculatePercentage(candidate.voteCount || 0, totalVotes)
    
    return (
      <div
        key={candidate._id}
        className="bg-white/95 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-lg border border-white/20 hover:shadow-xl transition-shadow mb-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className={`flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 text-white rounded-lg flex items-center justify-center font-bold text-2xl ${
              index === 0 ? 'bg-red-600' : index === 1 ? 'bg-blue-600' : 'bg-gray-600'
            }`}>
              {index + 1}
            </div>

            <div className="min-w-0 flex-1">
              {ballotIsOpen ? (
                <>
                  <p className="text-xs text-amber-600 font-semibold mb-1 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Anonymous
                  </p>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-400">
                    Candidate #{candidate.candidateNumber}
                  </h3>
                  <p className="text-xs text-gray-400">Name revealed after voting closes</p>
                </>
              ) : (
                <>
                  <h3 className="text-lg sm:text-xl font-bold text-[#001f65]">
                    {candidate.name || `Candidate #${candidate.candidateNumber}`}
                  </h3>
                  {candidate.yearLevel && (
                    <p className="text-xs text-gray-500">Year {candidate.yearLevel}</p>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="text-right flex-shrink-0 ml-4">
            <div className="text-2xl font-bold text-[#001f65]">
              {(candidate.voteCount || 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">{percentage}%</div>
            {index === 0 && candidate.voteCount > 0 && !ballotIsOpen && (
              <div className="mt-1">
                <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded">
                  LEADING
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderPositionResults = (position) => {
    const timing = getPositionTimingInfo(position)
    const ballotIsOpen = isBallotOpen(position)

    return (
      <div className="mb-8" key={position._id}>
        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-lg border border-white/20 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-bold text-[#001f65] mb-2">
                {position.positionName}
              </h2>
            </div>
            
            {timing && timing.status !== 'not_scheduled' && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg flex-shrink-0 whitespace-nowrap ${
                ballotIsOpen 
                  ? 'bg-amber-100 text-amber-800' 
                  : timing.status === 'closed'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                <Clock className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium">{timing.message}</span>
              </div>
            )}
          </div>

          {ballotIsOpen && timing && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs sm:text-sm text-amber-800 font-medium flex items-center gap-2">
                <Lock className="w-4 h-4 flex-shrink-0" />
                Results are hidden while voting is open. Candidate names will be revealed when voting closes at {timing.closeTime}.
              </p>
            </div>
          )}

          {!ballotIsOpen && timing && timing.status === 'closed' && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs sm:text-sm text-blue-800 font-medium">
                Voting closed at {timing.closeTime}
              </p>
            </div>
          )}

          {timing && timing.status === 'scheduled' && (
            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-xs sm:text-sm text-gray-800 font-medium">
                Voting opens at {timing.openTime}
              </p>
            </div>
          )}

          {timing && timing.status === 'not_scheduled' && (
            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-xs sm:text-sm text-gray-800 font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 flex-shrink-0" />
                Ballot for this position has not been opened yet. Check back later.
              </p>
            </div>
          )}
        </div>

        {position.candidates.length === 0 ? (
          <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 sm:p-8 shadow-lg border border-white/20 text-center">
            <Award className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium mb-1">No Candidates Yet</p>
            <p className="text-sm text-gray-500">
              Candidates for this position will appear here once registered by the election committee.
            </p>
          </div>
        ) : (
          position.candidates.map((candidate, idx) => renderCandidateCard(candidate, idx, position))
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <VoterLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20">
            <Loader2 className="animate-spin rounded-full h-12 w-12 mx-auto text-white" />
            <p className="mt-4 text-white font-medium">Loading election results...</p>
          </div>
        </div>
      </VoterLayout>
    )
  }

  if (error) {
    return (
      <VoterLayout>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-xl max-w-md mx-auto border border-white/20">
            <Award className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Unable to Load Results</h2>
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

  return (
    <VoterLayout>
      {/* Navbar */}
      <DepartmentalNavbar
        currentPage="results"
        electionId={electionId}
        pageTitle={election?.title}
        pageSubtitle="Live Results"
        onReceiptClick={handleOpenReceipt}
      />

      <div className="p-4 lg:p-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#001f65] to-[#003399] rounded-full mb-4">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">{election?.title}</h1>
            <p className="text-lg text-blue-100 mb-1">{formatDateTime(election?.electionDate)}</p>
            <p className="text-sm text-blue-200/80">Departmental Election Results</p>
          </div>

          {results?.positions && results.positions.length > 0 ? (
            results.positions.map(position => renderPositionResults(position))
          ) : (
            <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 sm:p-8 shadow-lg border border-white/20 text-center">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No Positions Available</p>
              <p className="text-sm text-gray-500 mt-2">
                The election committee will open positions for voting soon. Check back later for live results.
              </p>
            </div>
          )}
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
                <Download className="w-8 h-8 text-white" />
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

                {/* Voting Progress */}
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