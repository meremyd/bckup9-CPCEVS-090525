"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ssgElectionsAPI } from "@/lib/api/ssgElections"
import { candidatesAPI } from "@/lib/api/candidates"
import { partylistsAPI } from "@/lib/api/partylists"
import { ballotAPI } from "@/lib/api/ballots"
import { votersAPI } from "@/lib/api/voters"
import SSGLayout from "@/components/SSGLayout"
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
  Settings
} from "lucide-react"

export default function SSGPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [elections, setElections] = useState([])
  const [selectedElection, setSelectedElection] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [countsLoading, setCountsLoading] = useState(false)
  const [cardCounts, setCardCounts] = useState({
    candidates: 0,
    partylists: 0,
    voters: 0,
    turnout: 0,
    ballots: 0,
    statistics: 0
  })
  const [formData, setFormData] = useState({
    ssgElectionId: '',
    electionYear: new Date().getFullYear(),
    title: '',
    status: 'upcoming',
    electionDate: ''
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
      const response = await ssgElectionsAPI.getAll()
      console.log('Elections API response:', response)
      setElections(response.elections || response.data || response)
    } catch (error) {
      console.error("Error fetching elections:", error)
      setElections([])
    }
  }

  // Fixed fetchCardCounts function
  const fetchCardCounts = async () => {
    if (!selectedElection) {
      console.log('No selected election, skipping count fetch')
      return
    }

    setCountsLoading(true)
    console.log('=== STARTING CARD COUNTS FETCH ===')
    console.log('Selected election:', selectedElection)

    try {
      const ssgElectionId = selectedElection._id || selectedElection.id
      console.log('Using ssgElectionId:', ssgElectionId)
      
      let counts = {
        candidates: 0,
        partylists: 0,
        voters: 0,
        turnout: 0,
        ballots: 0,
        statistics: 0
      }

      // Helper function to safely get count from response
      const getCount = (response, countKeys = ['length', 'total', 'count']) => {
        console.log('Getting count from response:', response)
        
        if (Array.isArray(response)) {
          console.log('Response is array, length:', response.length)
          return response.length
        }
        
        for (const key of countKeys) {
          if (response[key] !== undefined) {
            const value = Array.isArray(response[key]) ? response[key].length : Number(response[key]) || 0
            console.log(`Found count in ${key}:`, value)
            return value
          }
        }
        
        // Check for data arrays
        const dataKeys = ['data', 'candidates', 'partylists', 'voters', 'ballots']
        for (const key of dataKeys) {
          if (response[key] && Array.isArray(response[key])) {
            console.log(`Found array in ${key}, length:`, response[key].length)
            return response[key].length
          }
        }
        
        console.log('No count found, returning 0')
        return 0
      }

      // Fetch candidates
      console.log('Fetching candidates...')
      try {
        const candidatesResponse = await candidatesAPI.ssg.getByElection(ssgElectionId)
        console.log('Candidates response:', candidatesResponse)
        counts.candidates = getCount(candidatesResponse)
        console.log('Candidates count:', counts.candidates)
      } catch (candidatesError) {
        console.error('Failed to fetch candidates:', candidatesError)
        
        // Try fallback method
        try {
          console.log('Trying fallback candidates method...')
          const fallbackResponse = await candidatesAPI.getByElection(ssgElectionId, 'ssg')
          console.log('Fallback candidates response:', fallbackResponse)
          counts.candidates = getCount(fallbackResponse)
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError)
          counts.candidates = 0
        }
      }

      // Fetch partylists
      console.log('Fetching partylists...')
      try {
        const partylistsResponse = await partylistsAPI.getBySSGElection(ssgElectionId)
        console.log('Partylists response:', partylistsResponse)
        counts.partylists = getCount(partylistsResponse)
        console.log('Partylists count:', counts.partylists)
      } catch (partylistsError) {
        console.error('Failed to fetch partylists:', partylistsError)
        counts.partylists = 0
      }

      // Fetch voters
      console.log('Fetching voters...')
      try {
        const votersResponse = await votersAPI.getRegistered({ limit: 1 })
        console.log('Voters response:', votersResponse)
        counts.voters = getCount(votersResponse, ['total', 'count'])
        console.log('Voters count:', counts.voters)
      } catch (votersError) {
        console.error('Failed to fetch voters:', votersError)
        counts.voters = 0
      }

      // Fetch ballots
      console.log('Fetching ballots...')
      try {
        const ballotsResponse = await ballotAPI.getAllSSGBallots({ 
          electionId: ssgElectionId,
          limit: 1 
        })
        console.log('Ballots response:', ballotsResponse)
        counts.ballots = getCount(ballotsResponse, ['total', 'count'])
        console.log('Ballots count:', counts.ballots)
      } catch (ballotsError) {
        console.error('Failed to fetch ballots:', ballotsError)
        counts.ballots = 0
      }

      // Set statistics count (using candidates count)
      counts.statistics = counts.candidates

      // Calculate turnout percentage
      if (counts.voters > 0) {
        counts.turnout = Math.round((counts.ballots / counts.voters) * 100)
      } else {
        counts.turnout = 0
      }

      console.log('Final counts:', counts)
      setCardCounts(counts)

    } catch (error) {
      console.error("Critical error in fetchCardCounts:", error)
      setCardCounts({
        candidates: 0,
        partylists: 0,
        voters: 0,
        turnout: 0,
        ballots: 0,
        statistics: 0
      })
    } finally {
      setCountsLoading(false)
      console.log('=== FINISHED CARD COUNTS FETCH ===')
    }
  }

  const handleElectionClick = (election) => {
    console.log('Election clicked:', election)
    setSelectedElection(election)
    // Store selected election in localStorage for persistence
    localStorage.setItem('selectedSSGElection', JSON.stringify(election))
  }

  const handleBackToElections = () => {
    setSelectedElection(null)
    // Clear selected election from localStorage
    localStorage.removeItem('selectedSSGElection')
    // Reset counts when going back
    setCardCounts({
      candidates: 0,
      partylists: 0,
      voters: 0,
      turnout: 0,
      ballots: 0,
      statistics: 0
    })
  }

  const handleAddElection = () => {
    setShowAddForm(true)
    setFormData({
      ssgElectionId: '',
      electionYear: new Date().getFullYear(),
      title: '',
      status: 'upcoming',
      electionDate: ''
    })
    setError('')
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    setFormLoading(true)
    setError('')

    try {
      await ssgElectionsAPI.create(formData)
      await fetchElections()
      setShowAddForm(false)
      setFormData({
        ssgElectionId: '',
        electionYear: new Date().getFullYear(),
        title: '',
        status: 'upcoming',
        electionDate: ''
      })

      // Show success alert
      Swal.fire({
        title: 'Success!',
        text: 'SSG Election created successfully',
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3b82f6'
      })
    } catch (error) {
      setError(error.message || 'Failed to create election')
      
      // Show error alert
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

  const handleDeleteElection = async (ssgElectionId, e) => {
    e.stopPropagation()
    
    // Show confirmation alert using SweetAlert
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
        // Show loading state
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

        await ssgElectionsAPI.delete(ssgElectionId)
        await fetchElections()
        
        // If deleted election was selected, clear selection
        if (selectedElection && (selectedElection._id === ssgElectionId || selectedElection.id === ssgElectionId)) {
          handleBackToElections()
        }

        // Show success alert
        Swal.fire({
          title: 'Deleted!',
          text: 'The election has been successfully deleted.',
          icon: 'success',
          confirmButtonText: 'OK',
          confirmButtonColor: '#10b981'
        })
      } catch (error) {
        console.error('Error deleting election:', error)
        
        // Show error alert
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
    localStorage.removeItem("selectedSSGElection")
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

  // Election management cards data (reordered)
  const electionManagementCards = [
    { 
      title: "Candidates",
      icon: Users,
      color: "bg-[#b0c8fe]/30",
      hoverColor: "hover:bg-[#b0c8fe]/20",
      borderColor: "border-[#b0c8fe]/40",
      shadowColor: "shadow-[#b0c8fe]/20",
      textColor: "text-[#001f65]",
      description: "Manage election candidates",
      count: cardCounts.candidates,
      path: `/ecommittee/ssg/candidates?ssgElectionId=${selectedElection?._id || selectedElection?.id}`
    },
    { 
      title: "Partylist",
      icon: Clipboard,
      color: "bg-[#b0c8fe]/40",
      hoverColor: "hover:bg-[#b0c8fe]/30",
      borderColor: "border-[#b0c8fe]/50",
      shadowColor: "shadow-[#b0c8fe]/30",
      textColor: "text-[#001f65]",
      description: "Manage party lists",
      count: cardCounts.partylists,
      path: `/ecommittee/ssg/partylist-position?ssgElectionId=${selectedElection?._id || selectedElection?.id}`
    },
    { 
      title: "Voter Participants",
      icon: User,
      color: "bg-[#b0c8fe]/45",
      hoverColor: "hover:bg-[#b0c8fe]/35",
      borderColor: "border-[#b0c8fe]/55",
      shadowColor: "shadow-[#b0c8fe]/35",
      textColor: "text-[#001f65]",
      description: "View registered voters",
      count: cardCounts.voters,
      path: `/ecommittee/ssg/participants?ssgElectionId=${selectedElection?._id || selectedElection?.id}`
    },
    { 
      title: "Voter Turnout",
      icon: TrendingUp,
      color: "bg-[#b0c8fe]/35",
      hoverColor: "hover:bg-[#b0c8fe]/25",
      borderColor: "border-[#b0c8fe]/45",
      shadowColor: "shadow-[#b0c8fe]/25",
      textColor: "text-[#001f65]",
      description: "Monitor voting activity",
      count: `${cardCounts.turnout}%`,
      path: `/ecommittee/ssg/voterTurnout?ssgElectionId=${selectedElection?._id || selectedElection?.id}`
    },
    { 
      title: "Ballots",
      icon: Vote,
      color: "bg-[#b0c8fe]/42",
      hoverColor: "hover:bg-[#b0c8fe]/32",
      borderColor: "border-[#b0c8fe]/52",
      shadowColor: "shadow-[#b0c8fe]/32",
      textColor: "text-[#001f65]",
      description: "Manage voting ballots",
      count: cardCounts.ballots,
      path: `/ecommittee/ssg/ballot?ssgElectionId=${selectedElection?._id || selectedElection?.id}`
    },
    { 
      title: "Statistics",
      icon: BarChart3,
      color: "bg-[#b0c8fe]/38",
      hoverColor: "hover:bg-[#b0c8fe]/28",
      borderColor: "border-[#b0c8fe]/48",
      shadowColor: "shadow-[#b0c8fe]/28",
      textColor: "text-[#001f65]",
      description: "View election analytics",
      count: cardCounts.statistics,
      path: `/ecommittee/ssg/statistics?ssgElectionId=${selectedElection?._id || selectedElection?.id}`
    }
  ]

  if (selectedElection) {
    // Use SSGLayout for election management view
    return (
      <SSGLayout
        ssgElectionId={selectedElection._id || selectedElection.id}
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
            <p className="text-white/60 text-sm">Election ID: {selectedElection.ssgElectionId}</p>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
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

          {/* Debug info - remove this in production */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-8 bg-black/20 backdrop-blur-sm rounded-lg p-4 max-w-2xl mx-auto">
              <h4 className="text-white font-bold mb-2">Debug Info:</h4>
              <pre className="text-white/80 text-xs overflow-auto">
                {JSON.stringify({ 
                  selectedElection: selectedElection?._id || selectedElection?.id,
                  cardCounts,
                  countsLoading 
                }, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </SSGLayout>
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
                <h3 className="text-xl font-bold text-gray-800">Create New SSG Election</h3>
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
                    SSG Election ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.ssgElectionId}
                    onChange={(e) => setFormData(prev => ({ ...prev, ssgElectionId: e.target.value }))}
                    placeholder="e.g., SSG2024-001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
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
                    placeholder="e.g., SSG Election 2024"
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

      {/* Header - Only show when no election is selected */}
      <div className="bg-[#b0c8fe]/95 backdrop-blur-sm shadow-lg border-b border-[#b0c8fe]/30 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-br from-[#001f65] to-[#003399] rounded-lg flex items-center justify-center mr-3 shadow-lg">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#001f65]">Election Committee Dashboard</h1>
              <p className="text-xs text-[#001f65]/70">SSG Elections</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleBackToDashboard}
              className="flex items-center px-2 sm:px-4 py-2 text-xs sm:text-sm text-[#001f65] hover:bg-[#b0c8fe]/30 rounded-lg transition-colors border border-[#001f65]/20 bg-white/60 backdrop-blur-sm"
            >
              <LayoutDashboard className="w-4 h-4 mr-1 sm:mr-2" />
              Dashboard
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center px-2 sm:px-4 py-2 text-xs sm:text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200 bg-white/60 backdrop-blur-sm"
            >
              <LogOut className="w-4 h-4 mr-1 sm:mr-2" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Elections Grid */}
      <div className="p-4 lg:p-6">
        <div className="min-h-[calc(100vh-120px)] flex flex-col justify-center">
          {/* Title */}
          <div className="text-center mb-8">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2">SSG Elections</h2>
            <p className="text-white/80">Select an election to manage or create a new one</p>
          </div>

          {/* Elections Grid */}
          <div className="flex justify-center">
            <div className="w-full max-w-6xl">
              {elections.length === 0 ? (
                // Only show add election card when no elections
                <div className="flex justify-center">
                  <div
                    onClick={handleAddElection}
                    className="w-full max-w-xs bg-white/10 backdrop-blur-sm rounded-2xl border-2 border-dashed border-white/30 p-8 hover:bg-white/20 hover:border-white/50 transition-all duration-200 cursor-pointer group flex flex-col items-center justify-center text-center aspect-[3/4]"
                  >
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
                      <Plus className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Add Election</h3>
                    <p className="text-blue-100 text-sm">Create a new SSG election</p>
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
                    <p className="text-blue-100 text-sm">Create a new SSG election</p>
                  </div>

                  {/* Election Cards */}
                  {elections.map((election) => (
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
                            {election.title || `SSG Election ${election.electionYear}`}
                          </h3>
                          <p className="text-blue-100 text-sm mb-2">
                            {election.electionYear}
                          </p>
                          {election.electionDate && (
                            <p className="text-blue-200 text-xs">
                              {new Date(election.electionDate).toLocaleDateString()}
                            </p>
                          )}
                          <p className="text-blue-200 text-xs mt-1">
                            ID: {election.ssgElectionId}
                          </p>
                        </div>

                        {/* Action Icons */}
                        <div className="flex justify-center gap-4 mt-auto">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/ecommittee/ssg/status?ssgElectionId=${election._id || election.id}`)
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
    </BackgroundWrapper>
  )
}
            