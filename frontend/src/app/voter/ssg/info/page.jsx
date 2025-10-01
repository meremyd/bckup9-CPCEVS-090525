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
  Info
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
      
      // Load election details first
      const electionResponse = await ssgElectionsAPI.getForVoters(electionId)
      const electionData = electionResponse?.data?.election || electionResponse?.election
      
      if (!electionData) {
        setError("Election not found")
        setLoading(false)
        return
      }

      setElection(electionData)

      // Check ballot status
      const status = ssgElectionsAPI.getBallotStatus(electionData)
      setBallotStatus(status)

      // Check participation status for THIS specific election ONLY
      try {
        console.log('Checking participation for election:', electionId)
        const participationResponse = await electionParticipationAPI.checkSSGStatus(electionId)
        console.log('Participation response:', participationResponse)
        
        setParticipationStatus(participationResponse)
        
        // hasParticipated should be for THIS election only
        const hasParticipated = participationResponse?.hasParticipated || false
        const isActiveOrUpcoming = ['active', 'upcoming'].includes(electionData.status)
        
        console.log('Has participated in THIS election:', hasParticipated)
        console.log('Election status:', electionData.status)
        
        // Show confirmation modal only if:
        // 1. Election is active or upcoming
        // 2. Voter hasn't participated yet in THIS specific election
        if (isActiveOrUpcoming && !hasParticipated) {
          console.log('Showing confirmation modal')
          setShowConfirmModal(true)
          setLoading(false)
          return // Don't load other data yet
        }
        
        // If participated or election is completed, load the rest
        console.log('Loading partylists')
        await loadPartylistsData()
        
      } catch (participationError) {
        console.error("Error checking participation:", participationError)
        
        // If 404 or not found, voter hasn't participated in THIS election
        if (participationError.response?.status === 404) {
          const isActiveOrUpcoming = ['active', 'upcoming'].includes(electionData.status)
          if (isActiveOrUpcoming) {
            console.log('404 - Showing confirmation modal')
            setShowConfirmModal(true)
            setLoading(false)
            return
          }
        }
        
        // For other errors or completed elections, still load partylists
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
        router.push('/voter/ssg')
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

      console.log('Confirming participation for election:', electionId)
      
      // Confirm participation in THIS specific election
      await electionParticipationAPI.confirmSSGParticipation(electionId)
      
      console.log('Participation confirmed, refreshing status')
      
      // Update participation status
      const updatedStatus = await electionParticipationAPI.checkSSGStatus(electionId)
      setParticipationStatus(updatedStatus)
      
      // Hide modal
      setShowConfirmModal(false)
      
      // Load partylists now
      await loadPartylistsData()
      
      Swal.fire({
        icon: 'success',
        title: 'Participation Confirmed',
        text: 'You can now view the election details and vote when ballots open.',
        confirmButtonColor: '#001f65'
      })
        
    } catch (error) {
      console.error("Error confirming participation:", error)
      console.error("Error response:", error.response?.data)
      
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

  // Loading state
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

  // Error state
  if (error) {
    return (
      <VoterLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-xl max-w-md mx-auto border border-white/20">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Error</h2>
            <p className="text-gray-600 mb-4 text-center">{error}</p>
            <button
              onClick={() => router.push('/voter/ssg')}
              className="w-full bg-[#001f65] hover:bg-[#003399] text-white px-6 py-2 rounded-lg transition-colors"
            >
              Back to Elections
            </button>
          </div>
        </div>
      </VoterLayout>
    )
  }

  // Confirmation Modal
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

  // Main content
  return (
    <VoterLayout>
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-sm shadow-lg border-b border-white/30 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => router.push('/voter/ssg')}
              className="mr-3 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-[#001f65]" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#001f65]">{election?.title}</h1>
              <p className="text-xs text-[#001f65]/70">Election Year {election?.electionYear}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 lg:p-6">
        <div className="min-h-[calc(100vh-120px)] max-w-6xl mx-auto">
          
          {/* Participation Confirmed Badge */}
          {participationStatus?.hasParticipated && (
            <div className="bg-green-500/20 backdrop-blur-sm rounded-xl p-4 mb-6 border border-green-500/30">
              <div className="flex items-center text-green-100">
                <CheckCircle className="w-5 h-5 mr-2" />
                <span className="font-medium">You are registered to participate in this election</span>
              </div>
            </div>
          )}
          
          {/* Election Info Banner */}
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-white/20">
            <div className="flex items-start gap-4">
              <Info className="w-6 h-6 text-white flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-bold text-white text-lg mb-2">Election Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-white/90">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span className="text-sm">
                      {new Date(election?.electionDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  {election?.ballotOpenTime && election?.ballotCloseTime && (
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      <span className="text-sm">
                        {formatTime(election.ballotOpenTime)} - {formatTime(election.ballotCloseTime)}
                      </span>
                    </div>
                  )}
                </div>
                {ballotStatus && (
                  <div className="mt-3 flex items-center">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      ballotStatus.status === 'open' ? 'bg-green-500/20 text-green-100' :
                      ballotStatus.status === 'scheduled' ? 'bg-yellow-500/20 text-yellow-100' :
                      'bg-red-500/20 text-red-100'
                    }`}>
                      {ballotStatus.message}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Partylists Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
              <Users className="w-6 h-6 mr-2" />
              Participating Partylists
            </h2>
            
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
                          className="w-full h-full object-cover"
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

          {/* Ballot Button */}
          {ballotStatus?.status === 'open' && participationStatus?.hasParticipated && (
            <div className="flex justify-center">
              <button
                onClick={handleBallotClick}
                className="bg-gradient-to-r from-[#001f65] to-[#003399] hover:from-[#003399] hover:to-[#001f65] text-white px-12 py-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl font-bold text-lg flex items-center gap-3"
              >
                <Vote className="w-6 h-6" />
                Proceed to Ballot
              </button>
            </div>
          )}

          {/* Ballot Status Message */}
          {(ballotStatus?.status !== 'open' || !participationStatus?.hasParticipated) && (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/20">
              <Clock className="w-12 h-12 text-white/60 mx-auto mb-3" />
              <p className="text-white font-medium text-lg">
                {!participationStatus?.hasParticipated 
                  ? 'You must confirm participation to vote in this election.'
                  : ballotStatus?.status === 'scheduled' 
                    ? 'Voting will open soon. Please check back later.'
                    : 'Voting for this election has ended.'}
              </p>
            </div>
          )}

        </div>
      </div>
    </VoterLayout>
  )
}