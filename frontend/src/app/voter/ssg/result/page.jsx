"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { votingAPI } from "@/lib/api/voting"
import { ssgElectionsAPI } from "@/lib/api/ssgElections"
import { departmentsAPI } from "@/lib/api/departments"
import VoterLayout from '@/components/VoterLayout'
import SSGNavbar from '@/components/SSGNavbar'
import Swal from 'sweetalert2'
import { 
  Trophy,
  Loader2,
  Users,
  Award,
  Building2,
  ChevronRight
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

  const getCandidateDisplay = (candidate, index) => {
    const isCompleted = election?.status === 'completed'
    
    if (isCompleted) {
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

  const renderPositionResults = (positions, title, showDepartmentName = false) => {
    if (positions.length === 0) return null

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
              const display = getCandidateDisplay(candidate, index)
              const voteCount = showDepartmentName ? candidate.departmentVoteCount : candidate.voteCount
              const totalVotes = showDepartmentName ? position.totalDepartmentVotes : position.totalVotes
              
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
            <p className="text-sm text-blue-200/80">Live Election Results</p>
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

              {renderPositionResults(groupedDepartmentPositions.presidential, 'PRESIDENTIAL RACE', true)}
              {renderPositionResults(groupedDepartmentPositions.vicePresidential, 'VICE PRESIDENTIAL RACE', true)}
              {renderPositionResults(groupedDepartmentPositions.senatorial, 'SENATORIAL RACE', true)}
            </div>
          )}

          {/* Overall Results */}
          {!selectedDepartment && (
            <>
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-6 border border-white/20">
                <h2 className="text-2xl font-bold text-white text-center">Overall Election Results</h2>
              </div>

              {renderPositionResults(groupedPositions.presidential, 'PRESIDENTIAL RACE')}
              {renderPositionResults(groupedPositions.vicePresidential, 'VICE PRESIDENTIAL RACE')}
              {renderPositionResults(groupedPositions.senatorial, 'SENATORIAL RACE')}
            </>
          )}

        </div>
      </div>
    </VoterLayout>
  )
}