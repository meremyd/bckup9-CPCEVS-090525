"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { votingAPI } from "@/lib/api/voting"
import { ssgElectionsAPI } from "@/lib/api/ssgElections"
import VoterLayout from '@/components/VoterLayout'
import Swal from 'sweetalert2'
import { 
  Trophy,
  Loader2,
  ArrowLeft,
  LogOut,
  Users,
  Award,
  TrendingUp
} from "lucide-react"

export default function VoterSSGResultsPage() {
  const [election, setElection] = useState(null)
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedPosition, setSelectedPosition] = useState(null)
  
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
      console.error("Auth check error:", error)
      setError("Authentication error occurred")
      setLoading(false)
    }
  }

  const loadResults = async () => {
    try {
      setLoading(true)
      
      // Get election details
      const electionResponse = await ssgElectionsAPI.getForVoters(electionId)
      const electionData = electionResponse?.data?.election || electionResponse?.election
      
      if (!electionData) {
        setError("Election not found")
        setLoading(false)
        return
      }

      setElection(electionData)

      // Get live results
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

  const getPositionCategory = (positionName) => {
    const name = positionName.toLowerCase()
    if (name.includes('president') && !name.includes('vice')) return 'presidential'
    if (name.includes('vice')) return 'vice-presidential'
    return 'senatorial'
  }

  const groupPositionsByCategory = () => {
    if (!results?.positions) return { presidential: [], vicePresidential: [], senatorial: [] }
    
    const grouped = {
      presidential: [],
      vicePresidential: [],
      senatorial: []
    }
    
    results.positions.forEach(pos => {
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

  const getRankSuffix = (rank) => {
    if (rank === 1) return 'st'
    if (rank === 2) return 'nd'
    if (rank === 3) return 'rd'
    return 'th'
  }

  const getWinnerBadgeColor = (rank) => {
    if (rank === 1) return 'bg-yellow-500'
    if (rank === 2) return 'bg-gray-400'
    if (rank === 3) return 'bg-amber-600'
    return 'bg-blue-500'
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

  const groupedPositions = groupPositionsByCategory()

  return (
    <VoterLayout>
      {/* Navbar */}
      <div className="bg-white/95 backdrop-blur-sm shadow-lg border-b border-white/30 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center min-w-0">
            <button
              onClick={() => router.push(`/voter/ssg/info?id=${electionId}`)}
              className="mr-2 sm:mr-3 p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-[#001f65]" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-[#001f65] truncate">{election?.title}</h1>
              <p className="text-xs text-[#001f65]/70">Election Results</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center px-2 sm:px-4 py-2 text-xs sm:text-sm text-red-600 hover:bg-red-50/80 rounded-lg transition-colors border border-red-200 bg-white/60 backdrop-blur-sm flex-shrink-0"
          >
            <LogOut className="w-4 h-4 mr-0 sm:mr-2" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

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
            <p className="text-sm text-blue-200/80">Live Election Results</p>
            {results?.viewerInfo?.hasVoted && (
              <div className="inline-block mt-3 px-4 py-2 bg-green-500/20 border-2 border-green-500 rounded-full">
                <p className="text-green-100 font-semibold text-sm">✓ You have voted in this election</p>
              </div>
            )}
          </div>

          {/* Presidential Race */}
          {groupedPositions.presidential.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4 text-center">PRESIDENTIAL RACE</h2>
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
              
              {groupedPositions.presidential.map((position) => (
                <div key={position.position._id} className="space-y-3">
                  {position.candidates.map((candidate, index) => (
                    <div 
                      key={candidate._id}
                      className="bg-white/95 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-lg border border-white/20 hover:shadow-xl transition-shadow"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <div className={`flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 ${index === 0 ? 'bg-red-600' : index === 1 ? 'bg-blue-600' : 'bg-gray-600'} text-white rounded-lg flex items-center justify-center`}>
                            <span className="text-2xl sm:text-3xl font-bold">{index + 1}</span>
                          </div>
                          
                          <div className="min-w-0 flex-1">
                            <h3 className="text-lg sm:text-xl font-bold text-[#001f65] truncate">
                              {candidate.name}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {candidate.partylist || 'Independent'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right flex-shrink-0 ml-4">
                          <div className="text-2xl sm:text-3xl font-bold text-[#001f65]">
                            {candidate.voteCount.toLocaleString()}
                          </div>
                          {position.totalVotes > 0 && (
                            <div className="text-sm text-gray-500">
                              {candidate.percentage}%
                            </div>
                          )}
                          {index === 0 && candidate.voteCount > 0 && (
                            <div className="mt-1">
                              <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded">
                                LEADING
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Vice Presidential Race */}
          {groupedPositions.vicePresidential.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4 text-center">VICE PRESIDENTIAL RACE</h2>
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
              
              {groupedPositions.vicePresidential.map((position) => (
                <div key={position.position._id} className="space-y-3">
                  {position.candidates.map((candidate, index) => (
                    <div 
                      key={candidate._id}
                      className="bg-white/95 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-lg border border-white/20 hover:shadow-xl transition-shadow"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <div className={`flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 ${index === 0 ? 'bg-red-600' : index === 1 ? 'bg-blue-600' : 'bg-gray-600'} text-white rounded-lg flex items-center justify-center`}>
                            <span className="text-2xl sm:text-3xl font-bold">{index + 1}</span>
                          </div>
                          
                          <div className="min-w-0 flex-1">
                            <h3 className="text-lg sm:text-xl font-bold text-[#001f65] truncate">
                              {candidate.name}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {candidate.partylist || 'Independent'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right flex-shrink-0 ml-4">
                          <div className="text-2xl sm:text-3xl font-bold text-[#001f65]">
                            {candidate.voteCount.toLocaleString()}
                          </div>
                          {position.totalVotes > 0 && (
                            <div className="text-sm text-gray-500">
                              {candidate.percentage}%
                            </div>
                          )}
                          {index === 0 && candidate.voteCount > 0 && (
                            <div className="mt-1">
                              <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded">
                                LEADING
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Senatorial Race (Other Positions) */}
          {groupedPositions.senatorial.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4 text-center">OTHER POSITIONS</h2>
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
              
              {groupedPositions.senatorial.map((position) => (
                <div key={position.position._id} className="mb-6">
                  <h3 className="text-xl font-bold text-white mb-3 text-center">
                    {position.position.positionName}
                  </h3>
                  <div className="space-y-3">
                    {position.candidates.map((candidate, index) => (
                      <div 
                        key={candidate._id}
                        className="bg-white/95 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-lg border border-white/20 hover:shadow-xl transition-shadow"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 min-w-0 flex-1">
                            <div className={`flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 ${index === 0 ? 'bg-red-600' : index === 1 ? 'bg-blue-600' : 'bg-gray-600'} text-white rounded-lg flex items-center justify-center`}>
                              <span className="text-2xl sm:text-3xl font-bold">{index + 1}</span>
                            </div>
                            
                            <div className="min-w-0 flex-1">
                              <h3 className="text-lg sm:text-xl font-bold text-[#001f65] truncate">
                                {candidate.name}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {candidate.partylist || 'Independent'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="text-right flex-shrink-0 ml-4">
                            <div className="text-2xl sm:text-3xl font-bold text-[#001f65]">
                              {candidate.voteCount.toLocaleString()}
                            </div>
                            {position.totalVotes > 0 && (
                              <div className="text-sm text-gray-500">
                                {candidate.percentage}%
                              </div>
                            )}
                            {index === 0 && candidate.voteCount > 0 && (
                              <div className="mt-1">
                                <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded">
                                  LEADING
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </VoterLayout>
  )
}