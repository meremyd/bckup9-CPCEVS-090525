"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { departmentalElectionsAPI } from "@/lib/api/departmentalElections"
import { candidatesAPI } from "@/lib/api/candidates"
import { ballotAPI } from "@/lib/api/ballots"
import { votersAPI } from "@/lib/api/voters"
import { departmentsAPI } from "@/lib/api/departments"
import DepartmentalLayout from "@/components/DepartmentalLayout"
import BackgroundWrapper from '@/components/BackgroundWrapper'
import Swal from 'sweetalert2'
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
  Plus,
  Edit,
  Trash2,
  Save,
  AlertCircle,
  Vote,
  Building2,
  Loader2,
  ChevronRight,
  Settings,
  UserCheck,
  GraduationCap,
} from "lucide-react"

export default function DepartmentalPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [elections, setElections] = useState([])
  const [filteredElections, setFilteredElections] = useState([])
  const [departments, setDepartments] = useState([])
  const [selectedDepartment, setSelectedDepartment] = useState(null)
  const [selectedElection, setSelectedElection] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [countsLoading, setCountsLoading] = useState(false)
  const [cardCounts, setCardCounts] = useState({
    candidates: 0,
    position: 0,
    officers: 0,
    voterTurnout: 0
  })
  const [formData, setFormData] = useState({
    deptElectionId: '',
    electionYear: new Date().getFullYear(),
    title: '',
    status: 'upcoming',
    electionDate: '',
    departmentId: ''
  })
  const [error, setError] = useState('')
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

      if (parsedUser.userType !== "election_committee") {
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
        voterTurnout: 0
      }

      // Fetch candidates - Updated to handle the actual response structure
      console.log('Fetching candidates...')
      try {
        const candidatesResponse = await candidatesAPI.departmental.getByElection(deptElectionId)
        console.log('Candidates response:', candidatesResponse)
        
        // Handle the nested data structure from the API
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

      
console.log('Fetching positions...')
try {
  const electionResponse = await departmentalElectionsAPI.getById(deptElectionId)
  console.log('Election details response:', electionResponse)
  
  // The positions should be included in the election details response
  if (electionResponse?.positions) {
    counts.position = Array.isArray(electionResponse.positions) 
      ? electionResponse.positions.length 
      : 0
  } else {
    // If positions aren't included, we'll get them from candidates response
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
        
        // Use the eligibleToVote count if available, otherwise use officersCount
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

  const handleAddElection = () => {
    setShowAddForm(true)
    setFormData({
      deptElectionId: '',
      electionYear: new Date().getFullYear(),
      title: '',
      status: 'upcoming',
      electionDate: '',
      departmentId: selectedDepartment?._id || ''
    })
    setError('')
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    setFormLoading(true)
    setError('')

    try {
      await departmentalElectionsAPI.create(formData)
      await fetchElections()
      setShowAddForm(false)
      setFormData({
        deptElectionId: '',
        electionYear: new Date().getFullYear(),
        title: '',
        status: 'upcoming',
        electionDate: '',
        departmentId: ''
      })

      Swal.fire({
        title: 'Success!',
        text: 'Departmental Election created successfully',
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3b82f6'
      })
    } catch (error) {
      setError(error.message || 'Failed to create election')
      
      Swal.fire({
        title: 'Error!',
        text: error.message || 'Failed to create election',
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#ef4444'
      })
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteElection = async (deptElectionId, e) => {
    e.stopPropagation()
    
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This will permanently delete the election and all associated data. This action cannot be undone!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
      reverseButtons: true
    })

    if (result.isConfirmed) {
      try {
        Swal.fire({
          title: 'Deleting...',
          text: 'Please wait while we delete the election',
          allowOutsideClick: false,
          allowEscapeKey: false,
          showConfirmButton: false,
          didOpen: () => {
            Swal.showLoading()
          }
        })

        await departmentalElectionsAPI.delete(deptElectionId)
        await fetchElections()
        
        if (selectedElection && (selectedElection._id === deptElectionId || selectedElection.id === deptElectionId)) {
          handleBackToElections()
        }

        Swal.fire({
          title: 'Deleted!',
          text: 'The election has been successfully deleted.',
          icon: 'success',
          confirmButtonText: 'OK',
          confirmButtonColor: '#10b981'
        })
      } catch (error) {
        console.error('Error deleting election:', error)
        
        Swal.fire({
          title: 'Error!',
          text: error.message || 'Failed to delete election. Please try again.',
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#ef4444'
        })
      }
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    localStorage.removeItem("selectedDepartmentalElection")
    router.push("/adminlogin")
  }

  const handleBackToDashboard = () => {
    router.push('/ecommittee/dashboard')
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

  const electionManagementCards = [
  { 
    title: "Candidates",
    icon: Users,
    color: "bg-[#b0c8fe]/35",
    hoverColor: "hover:bg-[#b0c8fe]/25",
    borderColor: "border-[#b0c8fe]/45",
    shadowColor: "shadow-[#b0c8fe]/25",
    textColor: "text-[#001f65]",
    description: "Manage election candidates",
    count: cardCounts.candidates,
    path: `/ecommittee/departmental/candidates?deptElectionId=${selectedElection?._id || selectedElection?.id}`
  },
  { 
    title: "Class Officers",
    icon: UserCheck,
    color: "bg-[#b0c8fe]/40",
    hoverColor: "hover:bg-[#b0c8fe]/30",
    borderColor: "border-[#b0c8fe]/50",
    shadowColor: "shadow-[#b0c8fe]/30",
    textColor: "text-[#001f65]",
    description: "Manage class officers",
    count: cardCounts.officers,
    path: `/ecommittee/departmental/officers?deptElectionId=${selectedElection?._id || selectedElection?.id}`
  },
  { 
    title: "Position",
    icon: Clipboard,
    color: "bg-[#b0c8fe]/30",
    hoverColor: "hover:bg-[#b0c8fe]/20",
    borderColor: "border-[#b0c8fe]/40",
    shadowColor: "shadow-[#b0c8fe]/20",
    textColor: "text-[#001f65]",
    description: "Manage election positions",
    count: cardCounts.position,
    path: `/ecommittee/departmental/position?deptElectionId=${selectedElection?._id || selectedElection?.id}`
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
    path: `/ecommittee/departmental/voterTurnout?deptElectionId=${selectedElection?._id || selectedElection?.id}`
  }
]

  if (selectedElection) {
    // Use DepartmentalLayout for election management view
    return (
      <DepartmentalLayout
        deptElectionId={selectedElection._id || selectedElection.id}
        title={selectedElection.title}
        subtitle="Election Management"
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
                {electionManagementCards.map((card, index) => {
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
                          <ChevronRight className="w-4 h-4 mr-1" />
                          <span className="hidden sm:inline">Click to manage</span>
                          <span className="sm:hidden">Tap to open</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </DepartmentalLayout>
    )
  }

  return (
    <BackgroundWrapper>
      {/* Add Election Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">Create New Departmental Election</h3>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Departmental Election ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.deptElectionId}
                    onChange={(e) => setFormData(prev => ({ ...prev, deptElectionId: e.target.value }))}
                    placeholder="e.g., DEPT2024-001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department *
                  </label>
                  <select
                    required
                    value={formData.departmentId}
                    onChange={(e) => setFormData(prev => ({ ...prev, departmentId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept._id || dept.id} value={dept._id || dept.id}>
                        {dept.departmentCode} - {dept.degreeProgram}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Election Year *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.electionYear}
                    onChange={(e) => setFormData(prev => ({ ...prev, electionYear: parseInt(e.target.value) }))}
                    min="2024"
                    max="2030"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Election Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Departmental Election 2024"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Election Date *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.electionDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, electionDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {formLoading ? (
                      <Loader2 className="animate-spin rounded-full h-4 w-4" />
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Create Election
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
<div className="bg-[#b0c8fe]/95 backdrop-blur-sm shadow-lg border-b border-[#b0c8fe]/30 px-4 sm:px-6 py-4">
  <div className="flex items-center justify-between">
    <div className="flex items-center">
      <div className="w-8 h-8 bg-gradient-to-br from-[#001f65] to-[#003399] rounded-lg flex items-center justify-center mr-3 shadow-lg">
        <GraduationCap className="w-5 h-5 text-white" />
      </div>
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#001f65]">Election Committee Dashboard</h1>
        <p className="text-xs text-[#001f65]/70">Departmental Elections</p>
      </div>
    </div>
    
    <div className="flex items-center space-x-1 sm:space-x-2">
      {/* Navigation Links */}
      <div 
        onClick={() => router.push('/ecommittee/dashboard')}
        className="flex items-center px-2 sm:px-3 py-2 text-xs sm:text-sm text-[#001f65] hover:bg-[#001f65]/10 rounded-lg transition-colors cursor-pointer"
      >
        <Home className="w-4 h-4 mr-1 sm:mr-1.5" />
        <span className="hidden lg:inline">Home</span>
      </div>
      <div 
        onClick={() => router.push('/ecommittee/voters')}
        className="flex items-center px-2 sm:px-3 py-2 text-xs sm:text-sm text-[#001f65] hover:bg-[#001f65]/10 rounded-lg transition-colors cursor-pointer"
      >
        <Users className="w-4 h-4 mr-1 sm:mr-1.5" />
        <span className="hidden lg:inline">Voters</span>
      </div>
      <div 
        onClick={() => router.push('/ecommittee/ssg')}
        className="flex items-center px-2 sm:px-3 py-2 text-xs sm:text-sm text-[#001f65] hover:bg-[#001f65]/10 rounded-lg transition-colors cursor-pointer"
      >
        <Vote className="w-4 h-4 mr-1 sm:mr-1.5" />
        <span className="hidden lg:inline">SSG</span>
      </div>
      <div 
        onClick={() => router.push('/ecommittee/departmental')}
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
                  // Only show add election card when no elections and no department selected
                  <div className="flex justify-center">
                    <div
                      onClick={handleAddElection}
                      className="w-full max-w-xs bg-white/10 backdrop-blur-sm rounded-2xl border-2 border-dashed border-white/30 p-8 hover:bg-white/20 hover:border-white/50 transition-all duration-200 cursor-pointer group flex flex-col items-center justify-center text-center aspect-[3/4]"
                    >
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
                        <Plus className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">Add Election</h3>
                      <p className="text-blue-100 text-sm">Create a new departmental election</p>
                    </div>
                  </div>
                ) : filteredElections.length === 0 && selectedDepartment ? (
                  // Show message and add button when no elections for selected department
                  <div className="text-center">
                    <div className="mb-6">
                      <h3 className="text-xl font-bold text-white mb-2">No Elections Found</h3>
                      <p className="text-blue-100">No elections found for {selectedDepartment.departmentCode} - {selectedDepartment.degreeProgram}</p>
                    </div>
                    <div
                      onClick={handleAddElection}
                      className="inline-block bg-white/10 backdrop-blur-sm rounded-2xl border-2 border-dashed border-white/30 p-8 hover:bg-white/20 hover:border-white/50 transition-all duration-200 cursor-pointer group"
                    >
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform duration-200">
                        <Plus className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">Add Election</h3>
                      <p className="text-blue-100 text-sm">Create election for {selectedDepartment.departmentCode}</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center">
                    {/* Add Election Card */}
                    <div
                      onClick={handleAddElection}
                      className="w-full max-w-xs bg-white/10 backdrop-blur-sm rounded-2xl border-2 border-dashed border-white/30 p-8 hover:bg-white/20 hover:border-white/50 transition-all duration-200 cursor-pointer group flex flex-col items-center justify-center text-center aspect-[3/4]"
                    >
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
                        <Plus className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">Add Election</h3>
                      <p className="text-blue-100 text-sm">
                        {selectedDepartment ? 
                          `Create election for ${selectedDepartment.departmentCode}` : 
                          'Create a new departmental election'
                        }
                      </p>
                    </div>

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
                          <div className="flex justify-end mb-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(election.status)}`}>
                              {election.status || 'upcoming'}
                            </span>
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

                          {/* Action Icons */}
                          <div className="flex justify-center gap-4 mt-auto">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/ecommittee/departmental/status?deptElectionId=${election._id || election.id}`)
                              }}
                              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                              title="Manage Election Status"
                            >
                              <Settings className="w-5 h-5 text-white" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteElection(election._id || election.id, e)}
                              className="w-10 h-10 bg-red-500/30 rounded-full flex items-center justify-center hover:bg-red-500/50 transition-colors"
                              title="Delete Election"
                            >
                              <Trash2 className="w-5 h-5 text-white" />
                            </button>
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