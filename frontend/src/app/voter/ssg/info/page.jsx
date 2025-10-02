"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ssgElectionsAPI } from "@/lib/api/ssgElections"
import { partylistsAPI } from "@/lib/api/partylists"
import { electionParticipationAPI } from "@/lib/api/electionParticipation"
import VoterLayout from '@/components/VoterLayout'
import Swal from 'sweetalert2'
import { 
  Vote,
  Loader2,
  ArrowLeft,
  Users,
  Clock,
  Calendar,
  CheckCircle,
  AlertCircle,
  Info,
  Receipt,
  Download,
  LogOut,
  X
} from "lucide-react"

export default function VoterSSGElectionInfoPage() {
  const [election, setElection] = useState(null)
  const [partylists, setPartylists] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [voter, setVoter] = useState(null)
  const [participationStatus, setParticipationStatus] = useState(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [ballotStatus, setBallotStatus] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [votingStatus, setVotingStatus] = useState(null)
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

      const voterData = JSON.parse(localStorage.getItem("voterData") || "{}")
      setVoter(voterData)

      if (!electionId) {
        setError("No election ID provided")
        setLoading(false)
        return
      }

      await loadElectionAndCheckParticipation()
    } catch (error) {
      console.error("Auth check error:", error)
      setError("Authentication error occurred")
      setLoading(false)
    }
  }

  const loadElectionAndCheckParticipation = async () => {
    try {
      setLoading(true)
      
      const electionResponse = await ssgElectionsAPI.getForVoters(electionId)
      const electionData = electionResponse?.data?.election || electionResponse?.election
      
      if (!electionData) {
        setError("Election not found")
        setLoading(false)
        return
      }

      setElection(electionData)

      const status = ssgElectionsAPI.getBallotStatus(electionData)
      setBallotStatus(status)

      try {
        const participationResponse = await electionParticipationAPI.checkSSGStatus(electionId)
        setParticipationStatus(participationResponse)
        
        const hasParticipated = participationResponse?.hasParticipated || false
        const isActiveOrUpcoming = ['active', 'upcoming'].includes(electionData.status)
        
        if (isActiveOrUpcoming && !hasParticipated) {
          setShowConfirmModal(true)
          setLoading(false)
          return
        }
        
        await loadPartylistsData()
        
      } catch (participationError) {
        console.error("Error checking participation:", participationError)
        
        if (participationError.response?.status === 404) {
          const isActiveOrUpcoming = ['active', 'upcoming'].includes(electionData.status)
          if (isActiveOrUpcoming) {
            setShowConfirmModal(true)
            setLoading(false)
            return
          }
        }
        
        await loadPartylistsData()
      }

      setLoading(false)
    } catch (error) {
      console.error("Error loading election data:", error)
      setError("Failed to load election information")
      setLoading(false)
    }
  }

  const loadPartylistsData = async () => {
    try {
      const partylistsResponse = await partylistsAPI.voter.getBySSGElection(electionId)
      setPartylists(partylistsResponse?.data?.partylists || partylistsResponse?.partylists || [])
    } catch (error) {
      console.error("Error loading partylists:", error)
      setPartylists([])
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
        router.push('/voter/ssg/elections')
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

      await electionParticipationAPI.confirmSSGParticipation(electionId)
      
      const updatedStatus = await electionParticipationAPI.checkSSGStatus(electionId)
      setParticipationStatus(updatedStatus)
      
      setShowConfirmModal(false)
      
      await loadPartylistsData()
      
      Swal.fire({
        icon: 'success',
        title: 'Participation Confirmed',
        text: 'You can now view the election details and vote when ballots open.',
        confirmButtonColor: '#001f65'
      })
        
    } catch (error) {
      console.error("Error confirming participation:", error)
      
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

  const handlePartylistClick = (partylist) => {
    router.push(`/voter/ssg/partylist?id=${partylist._id}&electionId=${electionId}`)
  }

  const handleBallotClick = () => {
    router.push(`/voter/ssg/ballot?id=${electionId}`)
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

  const handleOpenReceipt = async () => {
    setLoadingReceipt(true)
    setShowReceiptModal(true)
    
    try {
      const status = await electionParticipationAPI.getSSGVotingStatus(electionId)
      setVotingStatus(status)
    } catch (error) {
      console.error("Error loading voting status:", error)
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

      const blob = await electionParticipationAPI.exportSSGVotingReceiptPDF(electionId)
      
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `SSG_Voting_Receipt_${voter?.schoolId}_${election?.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
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

  const formatTime = (time24) => {
    if (!time24) return ''
    try {
      const [hours, minutes] = time24.split(':').map(Number)
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

  // Updated function to get button status message
  const getButtonStatusMessage = () => {
    if (!election || !ballotStatus) return { message: '', canVote: false, bgColor: 'bg-gray-500' }

    // Check if voter has already voted
    if (participationStatus?.hasVoted) {
      return {
        message: 'You have already voted in this election. Thank you for participating!',
        canVote: false,
        bgColor: 'bg-green-500'
      }
    }

    // Check if voter has participated
    if (!participationStatus?.hasParticipated) {
      return {
        message: 'You must confirm participation to vote in this election.',
        canVote: false,
        bgColor: 'bg-gray-500'
      }
    }

    const now = new Date()
    const electionDate = new Date(election.electionDate)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const electionDay = new Date(electionDate.getFullYear(), electionDate.getMonth(), electionDate.getDate())

    // Election is upcoming (date is in the future)
    if (electionDay > today) {
      const daysUntil = Math.ceil((electionDay - today) / (1000 * 60 * 60 * 24))
      return {
        message: `This election is upcoming. Voting starts in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}.`,
        canVote: false,
        bgColor: 'bg-blue-500'
      }
    }

    // Election day is today
    if (electionDay.getTime() === today.getTime()) {
      // Check ballot times
      if (election.ballotOpenTime && election.ballotCloseTime) {
        const [openHours, openMinutes] = election.ballotOpenTime.split(':').map(Number)
        const [closeHours, closeMinutes] = election.ballotCloseTime.split(':').map(Number)
        
        const openDateTime = new Date(electionDate)
        openDateTime.setHours(openHours, openMinutes, 0, 0)
        
        const closeDateTime = new Date(electionDate)
        closeDateTime.setHours(closeHours, closeMinutes, 0, 0)

        // Before ballot open time
        if (now < openDateTime) {
          const timeDiff = openDateTime - now
          const hoursUntil = Math.floor(timeDiff / (1000 * 60 * 60))
          const minutesUntil = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
          return {
            message: `SSG election ballot will be open in ${hoursUntil}h ${minutesUntil}m`,
            canVote: false,
            bgColor: 'bg-yellow-500'
          }
        }

        // After ballot close time
        if (now > closeDateTime) {
          return {
            message: 'The election has ended.',
            canVote: false,
            bgColor: 'bg-gray-500'
          }
        }

        // Within ballot hours - can vote
        return {
          message: 'Ballot is now open. Click to vote!',
          canVote: true,
          bgColor: 'bg-green-500'
        }
      }

      // No specific ballot times, can vote all day
      return {
        message: 'Ballot is now open. Click to vote!',
        canVote: true,
        bgColor: 'bg-green-500'
      }
    }

    // Election date has passed
    if (election.status === 'completed' || electionDay < today) {
      return {
        message: 'The election has ended.',
        canVote: false,
        bgColor: 'bg-gray-500'
      }
    }

    // Default fallback
    return {
      message: 'Voting is not currently available.',
      canVote: false,
      bgColor: 'bg-gray-500'
    }
  }

  const buttonStatus = getButtonStatusMessage()

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
              onClick={() => router.push('/voter/ssg/elections')}
              className="w-full bg-[#001f65] hover:bg-[#003399] text-white px-6 py-2 rounded-lg transition-colors"
            >
              Back to Elections
            </button>
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
              <p className="text-gray-600">
                Would you like to participate in this SSG election?
              </p>
            </div>

            <div className="bg-blue-50 rounded-xl p-4 mb-6">
              <h3 className="font-bold text-[#001f65] mb-2">{election.title}</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>{new Date(election.electionDate).toLocaleDateString()}</span>
                </div>
                {election.ballotOpenTime && election.ballotCloseTime && (
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>
                      {formatTime(election.ballotOpenTime)} - {formatTime(election.ballotCloseTime)}
                    </span>
                  </div>
                )}
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
      {/* Header with Logout and Receipt */}
      <div className="bg-white/95 backdrop-blur-sm shadow-lg border-b border-white/30 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => router.push('/voter/ssg/elections')}
              className="mr-3 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-[#001f65]" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#001f65]">{election?.title}</h1>
              <p className="text-xs text-[#001f65]/70">Election Year {election?.electionYear}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenReceipt}
              className="p-2 text-[#001f65] hover:bg-blue-50 rounded-lg transition-colors border border-blue-200 bg-white/60 backdrop-blur-sm"
              title="View Voting Receipt"
            >
              <Receipt className="w-5 h-5" />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center px-3 sm:px-4 py-2 text-xs sm:text-sm text-red-600 hover:bg-red-50/80 rounded-lg transition-colors border border-red-200 bg-white/60 backdrop-blur-sm"
            >
              <LogOut className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 lg:p-6">
        <div className="min-h-[calc(100vh-120px)] max-w-6xl mx-auto">

          {/* Election Info Banner */}
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-8 mb-8 border border-white/20">
            <div className="text-center">
              <h2 className="text-4xl font-bold text-white mb-6">{election?.title}</h2>
              <div className="inline-block">
                <div className={`px-6 py-3 rounded-full text-lg font-bold mb-6 ${
                  ballotStatus?.status === 'open' ? 'bg-green-500/30 text-green-100' :
                  ballotStatus?.status === 'scheduled' ? 'bg-yellow-500/30 text-yellow-100' :
                  'bg-gray-500/30 text-gray-100'
                }`}>
                  {election?.status}
                </div>
              </div>
              <div className="space-y-4 text-white/90 text-lg">
                <div className="flex items-center justify-center">
                  <span className="font-semibold mr-2">Election ID:</span>
                  <span>{election?.ssgElectionId}</span>
                </div>
                <div className="flex items-center justify-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  <span className="font-semibold mr-2">Election Date:</span>
                  <span>
                    {new Date(election?.electionDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      weekday: 'long'
                    })}
                  </span>
                </div>
                {election?.ballotOpenTime && election?.ballotCloseTime && (
                  <div className="flex items-center justify-center">
                    <Clock className="w-5 h-5 mr-2" />
                    <span className="font-semibold mr-2">Ballot Hours:</span>
                    <span>
                      {formatTime(election.ballotOpenTime)} - {formatTime(election.ballotCloseTime)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Partylists Section */}
          <div className="mb-8">
            {partylists.length === 0 ? (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center border border-white/20">
                <AlertCircle className="w-12 h-12 text-white/60 mx-auto mb-3" />
                <p className="text-white/80">No partylists available for this election</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {partylists.map((partylist) => (
                  <div
                    key={partylist._id}
                    onClick={() => handlePartylistClick(partylist)}
                    className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 hover:bg-white/30 transition-all duration-200 cursor-pointer group border border-white/20 shadow-lg"
                  >
                    <div className="aspect-square bg-white rounded-xl mb-4 overflow-hidden flex items-center justify-center">
                      {partylist.logo ? (
                        <img
                          src={partylistsAPI.voter.getLogoUrl(partylist._id)}
                          alt={partylist.partylistName}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <Users className="w-16 h-16 text-gray-400" />
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-white text-center mb-2">
                      {partylist.partylistName}
                    </h3>
                    <p className="text-blue-100 text-sm text-center">
                      Click to view details
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Vote Now / Status Button */}
          <div className="flex justify-center">
            {buttonStatus.canVote ? (
              <button
                onClick={handleBallotClick}
                className="bg-gradient-to-r from-[#001f65] to-[#003399] hover:from-[#003399] hover:to-[#001f65] text-white px-12 py-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl font-bold text-lg flex items-center gap-3"
              >
                <Vote className="w-6 h-6" />
                Vote Now
              </button>
            ) : (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/20 max-w-2xl">
                <Clock className="w-12 h-12 text-white/60 mx-auto mb-3" />
                <p className="text-white font-medium text-lg">
                  {buttonStatus.message}
                </p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Receipt Modal */}
      {showReceiptModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 relative">
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
            ) : votingStatus ? (
              <div className="space-y-4">
                <div className="bg-blue-50 rounded-xl p-4">
                  <h3 className="font-bold text-[#001f65] mb-3">Voter Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span className="font-medium">{voter?.firstName} {voter?.lastName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">School ID:</span>
                      <span className="font-medium">{voter?.schoolId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Department:</span>
                      <span className="font-medium">{voter?.department?.departmentCode || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className={`rounded-xl p-4 ${votingStatus.hasVoted ? 'bg-green-50' : 'bg-gray-50'}`}>
                  <h3 className={`font-bold mb-3 ${votingStatus.hasVoted ? 'text-green-800' : 'text-gray-800'}`}>
                    Voting Status
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Status:</span>
                      <span className={`font-bold ${votingStatus.hasVoted ? 'text-green-600' : 'text-gray-600'}`}>
                        {votingStatus.hasVoted ? 'VOTED' : 'NOT VOTED'}
                      </span>
                    </div>
                    {votingStatus.hasVoted && votingStatus.submittedAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Voted At:</span>
                        <span className="font-medium">{formatDateTime(votingStatus.submittedAt)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Election:</span>
                      <span className="font-medium">{election?.title}</span>
                    </div>
                  </div>
                </div>

                {votingStatus.hasVoted && (
                  <button
                    onClick={handleDownloadReceipt}
                    className="w-full bg-[#001f65] hover:bg-[#003399] text-white px-6 py-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Download Receipt (PDF)
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                <p className="text-gray-600">Failed to load voting status</p>
              </div>
            )}
          </div>
        </div>
      )}

    </VoterLayout>
  )
}