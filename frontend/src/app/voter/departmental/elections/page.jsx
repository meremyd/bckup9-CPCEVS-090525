"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { departmentalElectionsAPI } from "@/lib/api/departmentalElections"
import { electionParticipationAPI } from "@/lib/api/electionParticipation"
import VoterLayout from '@/components/VoterLayout'
import VoterNavbar from '@/components/VoterNavbar'
import VoterProfileModal from '@/components/VoterProfileModal'
import RulesRegulationsModal from '@/components/RulesRegulationsModal'
import Swal from 'sweetalert2'
import { 
  GraduationCap,
  Loader2,
  Building2,
  Eye,
  AlertCircle,
  UserCheck,
  Fingerprint
} from "lucide-react"

export default function VoterDepartmentalElectionsPage() {
  const [elections, setElections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [voter, setVoter] = useState(null)
  const [voterDepartment, setVoterDepartment] = useState(null)
  const [votingStatus, setVotingStatus] = useState({})
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showRulesModal, setShowRulesModal] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      try {
        const voterToken = localStorage.getItem("voterToken")
        if (!voterToken) {
          router.push("/voterlogin")
          return
        }

        const voterData = JSON.parse(localStorage.getItem("voterData") || "{}")
        setVoter(voterData)

        await loadElections()
      } catch (error) {
        console.error("Auth check error:", error)
        setError("Authentication error occurred")
      }
    }

    checkAuthAndLoadData()
  }, [router])

  const loadElections = async () => {
    try {
      setLoading(true)
      const response = await departmentalElectionsAPI.getAllForVoters()
      console.log('Departmental Elections response:', response)
      
      let electionsData = []
      if (response?.success && response?.data?.elections) {
        electionsData = response.data.elections
        setVoterDepartment(response.data.voterDepartment)
      } else if (response?.elections) {
        electionsData = response.elections
      } else {
        electionsData = []
      }

      await loadVotingStatus(electionsData)
      
    } catch (error) {
      console.error("Error loading departmental elections:", error)
      if (error.response?.status === 403) {
        setError("You don't have permission to view departmental elections")
      } else {
        setError("Failed to load elections")
      }
      setElections([])
    } finally {
      setLoading(false)
    }
  }

  const loadVotingStatus = async (electionsData) => {
    try {
      const statusPromises = electionsData.map(async (election) => {
        try {
          const statusResponse = await electionParticipationAPI.getDepartmentalVotingStatus(election._id)
          return {
            electionId: election._id,
            hasVoted: statusResponse?.hasVoted || false,
            votingStatus: statusResponse?.votingStatus || 'not_voted'
          }
        } catch (error) {
          console.error(`Error checking voting status for election ${election._id}:`, error)
          return {
            electionId: election._id,
            hasVoted: false,
            votingStatus: 'not_voted'
          }
        }
      })

      const statusResults = await Promise.all(statusPromises)
      
      const statusMap = {}
      statusResults.forEach(result => {
        statusMap[result.electionId] = result.hasVoted
      })
      
      setVotingStatus(statusMap)

      const electionsWithStatus = electionsData.map(election => ({
        ...election,
        hasVoted: statusMap[election._id] || false
      }))
      
      setElections(electionsWithStatus)
      
    } catch (error) {
      console.error("Error loading voting status:", error)
      setElections(electionsData)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-100'
      case 'upcoming':
        return 'bg-yellow-500/20 text-yellow-100'
      case 'completed':
        return 'bg-blue-500/20 text-blue-100'
      default:
        return 'bg-gray-500/20 text-gray-100'
    }
  }

  const getFingerprintColor = (hasVoted) => {
    return hasVoted ? 'text-blue-600' : 'text-gray-400'
  }

  const handleElectionClick = (election) => {
    localStorage.setItem('selectedDeptElectionForVoter', JSON.stringify(election))
    router.push(`/voter/departmental/info?id=${election._id}`)
  }

  if (loading) {
    return (
      <VoterLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20">
            <Loader2 className="animate-spin rounded-full h-12 w-12 mx-auto text-white" />
            <p className="mt-4 text-white font-medium">Loading departmental elections...</p>
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
            <div className="text-red-500 text-6xl mb-4 text-center">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Error</h2>
            <p className="text-gray-600 mb-4 text-center">{error}</p>
            <div className="space-y-2">
              <button
                onClick={loadElections}
                className="w-full bg-[#001f65] hover:bg-[#003399] text-white px-6 py-2 rounded-lg transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => router.push('/voter/dashboard')}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </VoterLayout>
    )
  }

  return (
    <VoterLayout>
      {/* Navbar */}
      <VoterNavbar
        currentPage="departmental"
        pageTitle="Departmental Elections"
        pageSubtitle={voterDepartment ? 
          `${voterDepartment.departmentCode} - ${voterDepartment.degreeProgram}` : 
          'Class Officer Elections'
        }
        pageIcon={<GraduationCap className="w-5 h-5 text-white" />}
        onProfileClick={() => setShowProfileModal(true)}
        onRulesClick={() => setShowRulesModal(true)}
      />

      {/* Main Content */}
      <div className="p-4 lg:p-6">
        <div className="min-h-[calc(100vh-120px)]">
          {/* Title and Info */}
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Departmental Elections</h2>
            <p className="text-white/80">View and participate in your department's class officer elections</p>
            {voterDepartment && (
              <div className="mt-3 inline-flex items-center bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
                <Building2 className="w-4 h-4 mr-2 text-white/80" />
                <span className="text-white/90 text-sm font-medium">
                  {voterDepartment.departmentCode} - {voterDepartment.degreeProgram}
                </span>
              </div>
            )}
          </div>

          {/* Elections Grid */}
          <div className="flex justify-center">
            <div className="w-full max-w-6xl">
              {elections.length === 0 ? (
                <div className="text-center">
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-12 border border-white/20">
                    <AlertCircle className="w-16 h-16 text-white/60 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">No Departmental Elections Available</h3>
                    <p className="text-white/70 mb-4">
                      There are currently no elections available for your department.
                    </p>
                    {voterDepartment && (
                      <div className="bg-white/5 rounded-lg p-4 mt-4">
                        <p className="text-white/60 text-sm">
                          Your department: <span className="font-medium text-white/80">
                            {voterDepartment.departmentCode} - {voterDepartment.degreeProgram}
                          </span>
                        </p>
                      </div>
                    )}
                    <p className="text-white/60 text-sm mt-4">
                      Elections will appear here when they become available for your department.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center">
                  {elections.map((election) => (
                    <div
                      key={election._id}
                      onClick={() => handleElectionClick(election)}
                      className="w-full max-w-xs bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg p-6 hover:bg-white/30 transition-all duration-200 cursor-pointer group relative overflow-hidden aspect-[3/4] flex flex-col"
                    >
                      <div className="absolute top-4 right-4">
                        <Fingerprint className={`w-6 h-6 ${getFingerprintColor(election.hasVoted)} transition-colors duration-300`} />
                      </div>
                      
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                      
                      <div className="relative z-10 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(election.status)}`}>
                            {election.status?.toUpperCase() || 'ACTIVE'}
                          </span>
                          {election.hasVoted && (
                            <div className="bg-green-500/20 text-green-100 rounded-full px-2 py-1">
                              <span className="text-xs font-medium">✓ Voted</span>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 flex flex-col justify-center text-center mb-6">
                          <h3 className="text-xl font-bold text-white mb-2 leading-tight">
                            {election.title || `Departmental Election ${election.electionYear}`}
                          </h3>
                          <p className="text-green-100 text-sm mb-2">
                            {election.departmentId?.departmentCode || 'Unknown Dept'}
                          </p>
                          <p className="text-green-200 text-xs mb-2">
                            {election.electionYear}
                          </p>
                          {election.electionDate && (
                            <p className="text-green-200 text-xs">
                              {new Date(election.electionDate).toLocaleDateString()}
                            </p>
                          )}
                          <p className="text-green-200 text-xs mt-1">
                            ID: {election.deptElectionId}
                          </p>
                        </div>

                        {voter && (
                          <div className="mb-4 p-2 bg-white/5 rounded-lg border border-white/10">
                            {voter.isClassOfficer ? (
                              <div className="flex items-center text-xs text-green-200 justify-center">
                                <UserCheck className="w-3 h-3 mr-1" />
                                <span>Eligible to vote</span>
                              </div>
                            ) : (
                              <div className="flex items-center text-xs text-yellow-200 justify-center">
                                <Eye className="w-3 h-3 mr-1" />
                                <span>Can view results</span>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex justify-center mt-auto">
                          <div className="flex items-center text-green-100 text-sm">
                            <Fingerprint className={`w-4 h-4 mr-1 ${getFingerprintColor(election.hasVoted)}`} />
                            <span>{election.hasVoted ? 'Already Voted' : voter?.isClassOfficer ? 'Click to vote' : 'Click to view'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <VoterProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onProfileUpdate={() => {}}
      />

      <RulesRegulationsModal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
        isFirstLogin={false}
      />
    </VoterLayout>
  )
}