"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { votingAPI } from "@/lib/api/voting"
import { ssgElectionsAPI } from "@/lib/api/ssgElections"
import { departmentsAPI } from "@/lib/api/departments"
import { electionParticipationAPI } from "@/lib/api/electionParticipation"
import VoterLayout from '@/components/VoterLayout'
import SSGNavbar from '@/components/SSGNavbar'
import Swal from 'sweetalert2'
import { 
  Trophy,
  Loader2,
  Users,
  Award,
  Building2,
  ChevronRight,
  Download,
  X,
  AlertCircle
} from "lucide-react"

export default function VoterSSGResultsPage() {
  const [election, setElection] = useState(null)
  const [results, setResults] = useState(null)
  const [departments, setDepartments] = useState([])
  const [selectedDepartment, setSelectedDepartment] = useState(null)
  const [departmentResults, setDepartmentResults] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingDepartment, setLoadingDepartment] = useState(false)
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
      await loadDepartments()
    } catch (error) {
      console.error("Auth check error:", error)
      setError("Authentication error occurred")
      setLoading(false)
    }
  }

  const loadResults = async () => {
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

      const resultsResponse = await votingAPI.getSSGElectionLiveResultsForVoter(electionId)
      
      if (resultsResponse?.success) {
        setResults(resultsResponse.data)
      } else {
        setError(resultsResponse?.message || "Could not load results")
      }

      setLoading(false)
    } catch (error) {
      console.error("Error loading results:", error)
      
      if (error.response?.status === 403) {
        setError("You must vote first or wait for the election to complete to view results")
      } else {
        setError("Failed to load election results")
      }
      
      setLoading(false)
    }
  }

  const loadDepartments = async () => {
    try {
      const response = await departmentsAPI.getAll()
      const depts = response?.data || response?.departments || []
      setDepartments(depts)
    } catch (error) {
      console.error("Error loading departments:", error)
    }
  }

  const loadDepartmentResults = async (departmentId) => {
    try {
      setLoadingDepartment(true)
      setSelectedDepartment(departmentId)
      
      const response = await votingAPI.getSSGElectionResultsByDepartmentForVoter(electionId, departmentId)
      
      if (response?.success) {
        setDepartmentResults(response.data)
      }
      
      setLoadingDepartment(false)
    } catch (error) {
      console.error("Error loading department results:", error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load department results'
      })
      setLoadingDepartment(false)
    }
  }

  const handleOpenReceipt = async () => {
    setLoadingReceipt(true)
    setShowReceiptModal(true)
    
    try {
      const data = await electionParticipationAPI.getSSGVotingReceiptDetails(electionId)
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

      const blob = await electionParticipationAPI.exportSSGVotingReceiptPDF(electionId)
      
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `SSG_Voting_Receipt_${receiptData?.voter?.schoolId || 'voter'}_${election?.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
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

  // FIXED: Check if election is completed
  const isElectionCompleted = election?.status === 'completed'

  // FIXED: Updated function to show anonymous labels when election is ongoing
  const getCandidateDisplay = (candidate, index, isCompleted = false) => {
    // If election is ongoing (not completed), always show anonymous labels
    if (!isCompleted) {
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      return {
        name: `Candidate ${alphabet[index] || index + 1}`,
        partylist: ' '
      }
    }

    // If election is completed, show actual names
    const shouldShowName = isCompleted && (candidate.name && candidate.name !== 'Unknown Candidate')
    
    if (shouldShowName && candidate.name) {
      return {
        name: candidate.name,
        partylist: candidate.partylist || 'Independent'
      }
    } else {
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      return {
        name: `Candidate ${alphabet[index] || index + 1}`,
        partylist: ' '
      }
    }
  }

  const getPositionCategory = (positionName) => {
    const name = positionName.toLowerCase()
    if (name.includes('president') && !name.includes('vice')) return 'presidential'
    if (name.includes('vice')) return 'vice-presidential'
    return 'senatorial'
  }

  const groupPositionsByCategory = (positions) => {
    if (!positions) return { presidential: [], vicePresidential: [], senatorial: [] }
    
    const grouped = {
      presidential: [],
      vicePresidential: [],
      senatorial: []
    }
    
    positions.forEach(pos => {
      const category = getPositionCategory(pos.position.positionName)
      if (category === 'presidential') {
        grouped.presidential.push(pos)
      } else if (category === 'vice-presidential') {
        grouped.vicePresidential.push(pos)
      } else {
        grouped.senatorial.push(pos)
      }
    })
    
    return grouped
  }

  const renderPositionResults = (positions, title, showDepartmentName = false, isCompleted = null) => {
    if (positions.length === 0) return null

    // FIXED: Determine if names should be shown based on election completion status
    const shouldShowNames = isCompleted !== null ? isCompleted : isElectionCompleted

    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4 text-center">
          {title}
          {showDepartmentName && selectedDepartment && (
            <span className="block text-lg text-blue-200 mt-2">
              {departments.find(d => d._id === selectedDepartment)?.departmentCode}
            </span>
          )}
        </h2>
        <p className="text-center text-blue-100 mb-6 text-sm">
          As of {new Date().toLocaleString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true 
          })}
        </p>
        
        {positions.map((position) => (
          <div key={position.position._id} className="space-y-3 mb-6">
            {position.candidates.map((candidate, index) => {
              // FIXED: Pass the actual completion status
              const display = getCandidateDisplay(candidate, index, shouldShowNames)
              
              const voteCount = showDepartmentName ? 
                (candidate.departmentVoteCount || candidate.voteCount) : 
                candidate.voteCount
              
              const totalVotes = showDepartmentName ? 
                (position.totalDepartmentVotes || position.totalVotes) : 
                position.totalVotes
              
              return (
                <div 
                  key={candidate._id}
                  className="bg-white/95 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-lg border border-white/20 hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className={`flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 ${
                        index === 0 ? 'bg-red-600' : 
                        index === 1 ? 'bg-blue-600' : 
                        'bg-gray-600'
                      } text-white rounded-lg flex items-center justify-center`}>
                        <span className="text-2xl sm:text-3xl font-bold">{index + 1}</span>
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg sm:text-xl font-bold text-[#001f65] truncate">
                          {display.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {display.partylist}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right flex-shrink-0 ml-4">
                      <div className="text-2xl sm:text-3xl font-bold text-[#001f65]">
                        {voteCount.toLocaleString()}
                      </div>
                      {totalVotes > 0 && (
                        <div className="text-sm text-gray-500">
                          {candidate.percentage}%
                        </div>
                      )}
                      {index === 0 && voteCount > 0 && (
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
            })}
          </div>
        ))}
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
            <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Access Restricted</h2>
            <p className="text-gray-600 mb-4 text-center">{error}</p>
            <button
              onClick={() => router.push(`/voter/ssg/info?id=${electionId}`)}
              className="w-full bg-[#001f65] hover:bg-[#003399] text-white px-6 py-2 rounded-lg transition-colors"
            >
              Back to Elections
            </button>
          </div>
        </div>
      </VoterLayout>
    )
  }

  const groupedPositions = groupPositionsByCategory(results?.positions)
  const groupedDepartmentPositions = departmentResults ? groupPositionsByCategory(departmentResults.positions) : null

  return (
    <VoterLayout>
      {/* SSG Navbar */}
      <SSGNavbar
        currentPage="results"
        electionId={electionId}
        pageTitle={election?.title}
        pageSubtitle="Live Results"
        onReceiptClick={handleOpenReceipt}
      />

      {/* Main Content */}
      <div className="p-4 lg:p-6">
        <div className="max-w-7xl mx-auto">
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#001f65] to-[#003399] rounded-full mb-4">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">{election?.title}</h1>
            <p className="text-lg text-blue-100 mb-1">{formatDateTime(election?.electionDate)}</p>
            <p className="text-sm text-blue-200/80">
              {isElectionCompleted ? 'Final Election Results' : 'Live Election Results'}
            </p>
            {!isElectionCompleted && (
              <p className="text-sm text-yellow-200 mt-2 italic">
                ⚠️ Election is ongoing. Candidate names will be revealed when voting is completed.
              </p>
            )}
            {results?.viewerInfo?.hasVoted && (
              <div className="inline-block mt-3 px-4 py-2 bg-green-500/20 border-2 border-green-500 rounded-full">
                <p className="text-green-100 font-semibold text-sm">✓ You have voted in this election</p>
              </div>
            )}
          </div>

          {/* Department Cards */}
          <div className="mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {departments.map((dept) => (
                <button
                  key={dept._id}
                  onClick={() => loadDepartmentResults(dept._id)}
                  className={`bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg border-2 transition-all hover:shadow-xl hover:scale-105 ${
                    selectedDepartment === dept._id 
                      ? 'border-[#001f65] bg-blue-50' 
                      : 'border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex-shrink-0 w-10 h-10 bg-[#001f65] text-white rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <h3 className="font-bold text-[#001f65] text-sm truncate">
                          {dept.departmentCode}
                        </h3>
                        <p className="text-xs text-gray-600 truncate">
                          {dept.college}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#001f65] flex-shrink-0 ml-2" />
                  </div>
                </button>
              ))}
            </div>
            
            {selectedDepartment && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => {
                    setSelectedDepartment(null)
                    setDepartmentResults(null)
                  }}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors border border-white/30"
                >
                  Clear Department Filter
                </button>
              </div>
            )}
          </div>

          {/* Loading Department Results */}
          {loadingDepartment && (
            <div className="text-center py-8">
              <Loader2 className="animate-spin rounded-full h-12 w-12 mx-auto text-white mb-4" />
              <p className="text-white font-medium">Loading department results...</p>
            </div>
          )}

          {/* Department Results */}
          {!loadingDepartment && departmentResults && (
            <div className="mb-12">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-6 border border-white/20">
                <h2 className="text-2xl font-bold text-white text-center mb-2">
                  Department Results
                </h2>
                <p className="text-blue-100 text-center">
                  {departmentResults.department?.departmentCode} - {departmentResults.department?.degreeProgram}
                </p>
              </div>

              {renderPositionResults(
                groupedDepartmentPositions.presidential, 
                'PRESIDENTIAL RACE', 
                true,
                isElectionCompleted
              )}
              {renderPositionResults(
                groupedDepartmentPositions.vicePresidential, 
                'VICE PRESIDENTIAL RACE', 
                true,
                isElectionCompleted
              )}
              {renderPositionResults(
                groupedDepartmentPositions.senatorial, 
                'SENATORIAL RACE', 
                true,
                isElectionCompleted
              )}
            </div>
          )}

          {/* Overall Results */}
          {!selectedDepartment && (
            <>
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-6 border border-white/20">
                <h2 className="text-2xl font-bold text-white text-center">
                  {isElectionCompleted ? 'Final Election Results' : 'Overall Election Results'}
                </h2>
              </div>

              {renderPositionResults(groupedPositions.presidential, 'PRESIDENTIAL RACE')}
              {renderPositionResults(groupedPositions.vicePresidential, 'VICE PRESIDENTIAL RACE')}
              {renderPositionResults(groupedPositions.senatorial, 'SENATORIAL RACE')}
            </>
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
                    {receiptData.voter?.department?.degreeProgram && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Program:</span>
                        <span className="font-medium text-right text-xs">
                          {receiptData.voter.department.degreeProgram}
                        </span>
                      </div>
                    )}
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
                      You haven't voted in this election yet. Vote to generate your receipt.
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