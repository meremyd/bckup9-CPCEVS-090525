"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { departmentalElectionsAPI } from "@/lib/api/departmentalElections"
import { candidatesAPI } from "@/lib/api/candidates"
import { ballotAPI } from "@/lib/api/ballots"
import { departmentsAPI } from "@/lib/api/departments"
import SAODepartmentalLayout from "@/components/SAODepartmentalLayout"
import BackgroundWrapper from '@/components/BackgroundWrapper'
import { 
  Home, 
  CheckCircle, 
  Users, 
  Clipboard, 
  User, 
  TrendingUp, 
  BarChart3,
  Menu,
  X,
  LayoutDashboard,
  LogOut,
  AlertCircle,
  Vote,
  Building2,
  Loader2,
  ChevronRight,
  UserCheck,
  GraduationCap,
  Eye,
  FileText
} from "lucide-react"

export default function SAODepartmentalPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [elections, setElections] = useState([])
  const [filteredElections, setFilteredElections] = useState([])
  const [departments, setDepartments] = useState([])
  const [selectedDepartment, setSelectedDepartment] = useState(null)
  const [selectedElection, setSelectedElection] = useState(null)
  const [countsLoading, setCountsLoading] = useState(false)
  const [cardCounts, setCardCounts] = useState({
    candidates: 0,
    position: 0,
    officers: 0,
    voterTurnout: 0
  })
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("token")
    const userData = localStorage.getItem("user")

    if (!token || !userData) {
      router.push("/adminlogin")
      return
    }

    try {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)

      if (parsedUser.userType !== "sao") {
        router.push("/adminlogin")
        return
      }

      fetchElections()
      fetchDepartments()
    } catch (parseError) {
      console.error("Error parsing user data:", parseError)
      router.push("/adminlogin")
      return
    }

    setLoading(false)
  }, [router])

  useEffect(() => {
    if (selectedElection) {
      console.log('Selected election changed, fetching counts for:', selectedElection)
      fetchCardCounts()
    }
  }, [selectedElection])

  const fetchElections = async () => {
    try {
      const response = await departmentalElectionsAPI.getAll()
      console.log('Departmental Elections API response:', response)
      const electionsData = response.elections || response.data || response
      setElections(electionsData)
      setFilteredElections(electionsData)
    } catch (error) {
      console.error("Error fetching elections:", error)
      setElections([])
      setFilteredElections([])
    }
  }

  const fetchDepartments = async () => {
    try {
      const response = await departmentsAPI.getAll()
      console.log('Departments API response:', response)
      setDepartments(response.departments || response.data || response)
    } catch (error) {
      console.error("Error fetching departments:", error)
      setDepartments([])
    }
  }

  const fetchCardCounts = async () => {
    if (!selectedElection) {
      console.log('No selected election, skipping count fetch')
      return
    }

    setCountsLoading(true)
    console.log('=== STARTING CARD COUNTS FETCH ===')
    console.log('Selected election:', selectedElection)

    try {
      const deptElectionId = selectedElection._id || selectedElection.id
      console.log('Using deptElectionId:', deptElectionId)
      
      let counts = {
        candidates: 0,
        position: 0,
        officers: 0,
        ballot: 0,
        statistics: 0,
        voterTurnout: 0
      }

      // Fetch candidates
      console.log('Fetching candidates...')
      try {
        const candidatesResponse = await candidatesAPI.departmental.getByElection(deptElectionId)
        console.log('Candidates response:', candidatesResponse)
        
        if (candidatesResponse?.data?.candidates) {
          counts.candidates = Array.isArray(candidatesResponse.data.candidates) 
            ? candidatesResponse.data.candidates.length 
            : 0
        } else if (candidatesResponse?.data?.totalCandidates !== undefined) {
          counts.candidates = candidatesResponse.data.totalCandidates
        } else if (Array.isArray(candidatesResponse)) {
          counts.candidates = candidatesResponse.length
        } else {
          counts.candidates = 0
        }
        
        console.log('Candidates count:', counts.candidates)
      } catch (candidatesError) {
        console.error('Failed to fetch candidates:', candidatesError)
        counts.candidates = 0
      }

      // Fetch positions
      console.log('Fetching positions...')
      try {
        const electionResponse = await departmentalElectionsAPI.getById(deptElectionId)
        console.log('Election details response:', electionResponse)
        
        if (electionResponse?.positions) {
          counts.position = Array.isArray(electionResponse.positions) 
            ? electionResponse.positions.length 
            : 0
        } else {
          const candidatesResponse = await candidatesAPI.departmental.getByElection(deptElectionId)
          if (candidatesResponse?.data?.positions) {
            counts.position = Array.isArray(candidatesResponse.data.positions) 
              ? candidatesResponse.data.positions.length 
              : 0
          } else {
            counts.position = 0
          }
        }
        console.log('Positions count:', counts.position)
      } catch (positionsError) {
        console.error('Failed to fetch positions:', positionsError)
        counts.position = 0
      }

      // Fetch officers using the API method
      console.log('Fetching officers count...')
      try {
        const officersResponse = await departmentalElectionsAPI.getOfficersCount(deptElectionId)
        console.log('Officers response:', officersResponse)
        
        counts.officers = officersResponse.eligibleToVote || officersResponse.officersCount || 0
        console.log('Officers count (eligible to vote):', counts.officers)
      } catch (officersError) {
        console.error('Failed to fetch officers:', officersError)
        counts.officers = 0
      }

      
      

      if (counts.officers > 0 && counts.ballot >= 0) {
        counts.voterTurnout = Math.min(100, Math.round((counts.ballot / counts.officers) * 100))
      } else {
        counts.voterTurnout = 0
      }

      console.log('Final counts:', counts)
      setCardCounts(counts)

    } catch (error) {
      console.error("Critical error in fetchCardCounts:", error)
      setCardCounts({
        candidates: 0,
        position: 0,
        officers: 0,
        voterTurnout: 0
      })
    } finally {
      setCountsLoading(false)
      console.log('=== FINISHED CARD COUNTS FETCH ===')
    }
  }

  const handleElectionClick = (election) => {
    console.log('Election clicked:', election)
    setSelectedElection(election)
    localStorage.setItem('selectedDepartmentalElection', JSON.stringify(election))
  }

  const handleBackToElections = () => {
    setSelectedElection(null)
    localStorage.removeItem('selectedDepartmentalElection')
    setCardCounts({
      candidates: 0,
      position: 0,
      officers: 0,
      voterTurnout: 0
    })
  }

  const handleDepartmentClick = (department) => {
    console.log('Department clicked:', department)
    setSelectedDepartment(department)
    
    // Filter elections by department
    const deptElections = elections.filter(election => 
      (election.departmentId?._id === department._id) || 
      (election.departmentId === department._id)
    )
    setFilteredElections(deptElections)
  }

  const handleShowAllElections = () => {
    setSelectedDepartment(null)
    setFilteredElections(elections)
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    localStorage.removeItem("selectedDepartmentalElection")
    router.push("/adminlogin")
  }

  const handleBackToDashboard = () => {
    router.push('/sao/dashboard')
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-100'
      case 'upcoming':
        return 'bg-yellow-500/20 text-yellow-100'
      case 'completed':
        return 'bg-blue-500/20 text-blue-100'
      case 'draft':
        return 'bg-gray-500/20 text-gray-100'
      default:
        return 'bg-gray-500/20 text-gray-100'
    }
  }

  if (loading) {
    return (
      <BackgroundWrapper>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20">
            <Loader2 className="animate-spin rounded-full h-12 w-12 mx-auto text-white" />
            <p className="mt-4 text-white font-medium">Loading elections...</p>
          </div>
        </div>
      </BackgroundWrapper>
    )
  }

  const electionMonitoringCards = [
  { 
    title: "View Candidates",
    icon: Users,
    color: "bg-[#b0c8fe]/35",
    hoverColor: "hover:bg-[#b0c8fe]/25",
    borderColor: "border-[#b0c8fe]/45",
    shadowColor: "shadow-[#b0c8fe]/25",
    textColor: "text-[#001f65]",
    description: "View election candidates",
    count: cardCounts.candidates,
    path: `/sao/departmental/candidates?deptElectionId=${selectedElection?._id || selectedElection?.id}`
  },
  { 
    title: "Class Officers",
    icon: UserCheck,
    color: "bg-[#b0c8fe]/40",
    hoverColor: "hover:bg-[#b0c8fe]/30",
    borderColor: "border-[#b0c8fe]/50",
    shadowColor: "shadow-[#b0c8fe]/30",
    textColor: "text-[#001f65]",
    description: "View class officers",
    count: cardCounts.officers,
    path: `/sao/departmental/voterTurnout?deptElectionId=${selectedElection?._id || selectedElection?.id}`
  },
  { 
    title: "View Position",
    icon: Clipboard,
    color: "bg-[#b0c8fe]/30",
    hoverColor: "hover:bg-[#b0c8fe]/20",
    borderColor: "border-[#b0c8fe]/40",
    shadowColor: "shadow-[#b0c8fe]/20",
    textColor: "text-[#001f65]",
    description: "View election positions",
    count: cardCounts.position,
    path: `/sao/departmental/candidates?deptElectionId=${selectedElection?._id || selectedElection?.id}`
  },
  { 
    title: "Voter Turnout",
    icon: TrendingUp,
    color: "bg-[#b0c8fe]/45",
    hoverColor: "hover:bg-[#b0c8fe]/35",
    borderColor: "border-[#b0c8fe]/55",
    shadowColor: "shadow-[#b0c8fe]/35",
    textColor: "text-[#001f65]",
    description: "Monitor voting activity",
    count: `${cardCounts.voterTurnout}%`,
    path: `/sao/departmental/voterTurnout?deptElectionId=${selectedElection?._id || selectedElection?.id}`
  }
]

  if (selectedElection) {
    // Use SAODepartmentalLayout for election monitoring view
    return (
      <SAODepartmentalLayout
        deptElectionId={selectedElection._id || selectedElection.id}
        title={selectedElection.title}
        subtitle="Election Monitoring"
        activeItem=""
        showBackButton={false}
      >
        <div className="min-h-[60vh] flex flex-col justify-center">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">{selectedElection.title}</h2>
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedElection?.status)}`}>
                {selectedElection?.status || 'upcoming'}
              </span>
            </div>
            <p className="text-white/60 text-sm">Election ID: {selectedElection.deptElectionId}</p>
            <p className="text-white/60 text-sm">Department: {selectedElection.departmentId?.departmentCode || 'Unknown'}</p>
          </div>

          {/* Show loading state for counts */}
          {countsLoading && (
            <div className="text-center mb-4">
              <Loader2 className="animate-spin h-6 w-6 mx-auto text-white/60" />
              <p className="text-white/60 text-sm mt-2">Loading card data...</p>
            </div>
          )}

          <div className="flex justify-center">
            <div className="w-full max-w-6xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 sm:gap-8">
                {electionMonitoringCards.map((card, index) => {
                  const IconComponent = card.icon
                  return (
                    <div
                      key={index}
                      onClick={() => router.push(card.path)}
                      className={`bg-white/90 backdrop-blur-sm rounded-xl shadow-lg cursor-pointer transform hover:scale-105 transition-all duration-300 hover:shadow-2xl ${card.hoverColor} border ${card.borderColor} h-56 lg:h-64 flex flex-col justify-center items-center hover:bg-white/95`}
                    >
                      <div className="p-6 text-center h-full flex flex-col justify-center items-center w-full">
                        {/* Icon */}
                        <div className={`p-4 rounded-full ${card.color} mb-6 shadow-lg border border-[#b0c8fe]/20`}>
                          <div className={card.textColor}>
                            <IconComponent className="w-8 h-8 sm:w-10 md:w-12" />
                          </div>
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 flex flex-col justify-center items-center">
                          <p className="text-base sm:text-lg font-medium text-[#001f65]/80 mb-3 text-center">
                            {card.title}
                          </p>
                          <p className={`text-3xl sm:text-4xl lg:text-5xl font-bold ${card.textColor} mb-6`}>
                            {countsLoading ? (
                              <Loader2 className="animate-spin h-8 w-8 mx-auto" />
                            ) : (
                              typeof card.count === 'number' ? card.count.toLocaleString() : card.count
                            )}
                          </p>
                        </div>

                        {/* Action Indicator */}
                        <div className="flex items-center justify-center text-sm text-[#001f65]/60">
                          <Eye className="w-4 h-4 mr-1" />
                          <span className="hidden sm:inline">Click to view</span>
                          <span className="sm:hidden">Tap to view</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </SAODepartmentalLayout>
    )
  }

  return (
    <BackgroundWrapper>
      {/* Header */}
<div className="bg-[#b0c8fe]/95 backdrop-blur-sm shadow-lg border-b border-[#b0c8fe]/30 px-4 sm:px-6 py-4">
  <div className="flex items-center justify-between">
    <div className="flex items-center">
      <div className="w-8 h-8 bg-gradient-to-br from-[#001f65] to-[#003399] rounded-lg flex items-center justify-center mr-3 shadow-lg">
        <GraduationCap className="w-5 h-5 text-white" />
      </div>
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#001f65]">Student Affairs Office</h1>
        <p className="text-xs text-[#001f65]/70">Departmental Elections Monitoring</p>
      </div>
    </div>
    
    <div className="flex items-center space-x-1 sm:space-x-2">
      {/* Navigation Links */}
      <div 
        onClick={() => router.push('/sao/dashboard')}
        className="flex items-center px-2 sm:px-3 py-2 text-xs sm:text-sm text-[#001f65] hover:bg-[#001f65]/10 rounded-lg transition-colors cursor-pointer"
      >
        <Home className="w-4 h-4 mr-1 sm:mr-1.5" />
        <span className="hidden lg:inline">Home</span>
      </div>
      <div 
        onClick={() => router.push('/sao/voters')}
        className="flex items-center px-2 sm:px-3 py-2 text-xs sm:text-sm text-[#001f65] hover:bg-[#001f65]/10 rounded-lg transition-colors cursor-pointer"
      >
        <Users className="w-4 h-4 mr-1 sm:mr-1.5" />
        <span className="hidden lg:inline">Voters</span>
      </div>
      <div 
        onClick={() => router.push('/sao/ssg')}
        className="flex items-center px-2 sm:px-3 py-2 text-xs sm:text-sm text-[#001f65] hover:bg-[#001f65]/10 rounded-lg transition-colors cursor-pointer"
      >
        <Vote className="w-4 h-4 mr-1 sm:mr-1.5" />
        <span className="hidden lg:inline">SSG</span>
      </div>
      <div 
        onClick={() => router.push('/sao/departmental')}
        className="flex items-center px-2 sm:px-3 py-2 text-xs sm:text-sm text-[#001f65] bg-[#001f65]/10 rounded-lg transition-colors cursor-pointer"
      >
        <GraduationCap className="w-4 h-4 mr-1 sm:mr-1.5" />
        <span className="hidden lg:inline">Departmental</span>
      </div>
      <div className="w-px h-6 bg-[#001f65]/20 mx-1 sm:mx-2"></div>
      <button
        onClick={handleLogout}
        className="flex items-center px-2 sm:px-4 py-2 text-xs sm:text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200 bg-white/60 backdrop-blur-sm"
      >
        <LogOut className="w-4 h-4 mr-1 sm:mr-2" />
        <span className="hidden sm:inline">Logout</span>
      </button>
    </div>
  </div>
</div>

      {/* Main Content */}
      <div className="p-4 lg:p-6">
        <div className="min-h-[calc(100vh-120px)]">
          {/* Departments Cards Section */}
          <div className="mb-12">
            <div className="text-center mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Departmental Elections</h2>
              <p className="text-white/80">Browse elections by department</p>
              
              {selectedDepartment && (
                <div className="mt-4">
                  <button
                    onClick={handleShowAllElections}
                    className="inline-flex items-center px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Show All Elections
                  </button>
                  <p className="text-blue-100 text-sm mt-2">
                    Showing elections for: <span className="font-semibold">{selectedDepartment.departmentCode} - {selectedDepartment.degreeProgram}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Centered Department Cards Container */}
            <div className="flex justify-center">
              <div className="w-full max-w-4xl">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 justify-items-center">
                  {departments.map((department) => (
                    <div
                      key={department._id || department.id}
                      onClick={() => handleDepartmentClick(department)}
                      className={`w-full max-w-[200px] bg-white/20 backdrop-blur-sm rounded-xl shadow-lg p-4 hover:bg-white/30 transition-all duration-200 cursor-pointer group relative overflow-hidden aspect-[4/3] flex flex-col justify-center items-center text-center ${
                        selectedDepartment?._id === department._id ? 'ring-2 ring-white/50 bg-white/30' : ''
                      }`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                      
                      <div className="relative z-10 flex flex-col items-center">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-3">
                          <Building2 className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-sm font-bold text-white mb-1 leading-tight">
                          {department.departmentCode}
                        </h3>
                        <p className="text-xs text-blue-100 leading-tight line-clamp-3 px-2">
                          {department.degreeProgram}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Elections Section */}
          <div className="flex flex-col justify-center">
            {/* Elections Grid */}
            <div className="flex justify-center">
              <div className="w-full max-w-6xl">
                {filteredElections.length === 0 && !selectedDepartment ? (
                  // No elections message
                  <div className="flex justify-center">
                    <div className="w-full max-w-md bg-white/10 backdrop-blur-sm rounded-2xl border border-white/30 p-8 text-center">
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                        <FileText className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">No Elections Available</h3>
                      <p className="text-blue-100 text-sm">There are currently no departmental elections to monitor.</p>
                    </div>
                  </div>
                ) : filteredElections.length === 0 && selectedDepartment ? (
                  // Show message when no elections for selected department
                  <div className="text-center">
                    <div className="mb-6">
                      <h3 className="text-xl font-bold text-white mb-2">No Elections Found</h3>
                      <p className="text-blue-100">No elections found for {selectedDepartment.departmentCode} - {selectedDepartment.degreeProgram}</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center">
                    {/* Election Cards */}
                    {filteredElections.map((election) => (
                      <div
                        key={election._id || election.id}
                        onClick={() => handleElectionClick(election)}
                        className="w-full max-w-xs bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg p-6 hover:bg-white/30 transition-all duration-200 cursor-pointer group relative overflow-hidden aspect-[3/4] flex flex-col"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                        
                        <div className="relative z-10 flex-1 flex flex-col">
                          {/* Status Badge */}
                          <div className="flex justify-between items-start mb-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(election.status)}`}>
                              {election.status || 'upcoming'}
                            </span>
                            <div className="bg-blue-500/20 text-blue-100 rounded-full p-1">
                              <Eye className="w-3 h-3" />
                            </div>
                          </div>

                          {/* Election Info */}
                          <div className="flex-1 flex flex-col justify-center text-center mb-6">
                            <h3 className="text-xl font-bold text-white mb-2 leading-tight">
                              {election.title || `Departmental Election ${election.electionYear}`}
                            </h3>
                            <p className="text-blue-100 text-sm mb-2">
                              {election.departmentId?.departmentCode || 'Unknown Dept'}
                            </p>
                            <p className="text-blue-200 text-xs mb-2">
                              {election.electionYear}
                            </p>
                            {election.electionDate && (
                              <p className="text-blue-200 text-xs">
                                {new Date(election.electionDate).toLocaleDateString()}
                              </p>
                            )}
                            <p className="text-blue-200 text-xs mt-1">
                              ID: {election.deptElectionId}
                            </p>
                          </div>

                          {/* View Indicator */}
                          <div className="flex justify-center mt-auto">
                            <div className="flex items-center text-blue-100 text-sm">
                              <Eye className="w-4 h-4 mr-1" />
                              <span>Click to monitor</span>
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
      </div>
    </BackgroundWrapper>
  )
}