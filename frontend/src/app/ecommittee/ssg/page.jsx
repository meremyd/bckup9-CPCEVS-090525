"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ssgElectionsAPI } from "@/lib/api/ssgElections"
import SSGLayout from "@/components/SSGLayout"
import BackgroundWrapper from '@/components/BackgroundWrapper'
import Swal from 'sweetalert2'
import { 
  Users, 
  Clipboard, 
  User, 
  TrendingUp, 
  Vote,
  Building2,
  Loader2,
  ChevronRight,
  Settings,
  Plus,
  X,
  Save,
  AlertCircle,
  Trash2,
  LayoutDashboard,
  LogOut,
  FileText
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
    positions: 0,
    partylists: 0,
    participants: 0,
    turnout: 0,
    ballots: 0
  })
  const [formData, setFormData] = useState({
    ssgElectionId: '',
    electionYear: new Date().getFullYear(),
    title: '',
    status: 'upcoming',
    electionDate: '',
    ballotOpenTime: '',
    ballotCloseTime: ''
  })

  const [error, setError] = useState('')
  const router = useRouter()

  // Helper function to format time for display (24-hour to 12-hour)
  const formatTimeDisplay = (time24) => {
    if (!time24) return 'Not set'
    
    try {
      const [hours, minutes] = time24.split(':').map(Number)
      const period = hours >= 12 ? 'PM' : 'AM'
      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
      
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
    } catch (error) {
      return 'Invalid time'
    }
  }

  // Helper function to validate time format and relationship
  const validateBallotTimes = (openTime, closeTime) => {
    if (!openTime || !closeTime) return { isValid: true }

    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    
    if (!timeRegex.test(openTime)) {
      return { isValid: false, error: 'Ballot open time must be in HH:MM format (e.g., 08:00)' }
    }
    
    if (!timeRegex.test(closeTime)) {
      return { isValid: false, error: 'Ballot close time must be in HH:MM format (e.g., 17:00)' }
    }

    const [openHours, openMinutes] = openTime.split(':').map(Number)
    const [closeHours, closeMinutes] = closeTime.split(':').map(Number)
    
    const openTimeInMinutes = openHours * 60 + openMinutes
    const closeTimeInMinutes = closeHours * 60 + closeMinutes
    
    if (closeTimeInMinutes <= openTimeInMinutes) {
      return { isValid: false, error: 'Ballot close time must be after ballot open time' }
    }

    return { isValid: true }
  }

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
      setElections(response.data || response.elections || response || [])
    } catch (error) {
      console.error("Error fetching elections:", error)
      setElections([])
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
      const ssgElectionId = selectedElection._id || selectedElection.id
      console.log('Using ssgElectionId:', ssgElectionId)
      
      let counts = {
        candidates: 0,
        positions: 0,
        partylists: 0,
        participants: 0,
        turnout: 0,
        ballots: 0
      }

      const extractCount = (response, fallbackKeys = ['length', 'total', 'count']) => {
        console.log('Extracting count from:', response)
        
        if (Array.isArray(response)) {
          return response.length
        }
        
        if (response?.data) {
          if (Array.isArray(response.data)) {
            return response.data.length
          }
          
          for (const key of fallbackKeys) {
            if (response.data[key] !== undefined) {
              return Number(response.data[key]) || 0
            }
          }
        }
        
        if (response?.summary) {
          for (const key of fallbackKeys) {
            if (response.summary[key] !== undefined) {
              return Number(response.summary[key]) || 0
            }
          }
        }
        
        for (const key of fallbackKeys) {
          if (response?.[key] !== undefined) {
            return Number(response[key]) || 0
          }
        }
        
        return 0
      }

      const fetchPromises = [
        ssgElectionsAPI.getCandidates(ssgElectionId).catch(error => {
          console.error('Failed to fetch candidates:', error)
          return { data: [], summary: { totalCandidates: 0 } }
        }),
        
        ssgElectionsAPI.getPositions(ssgElectionId).catch(error => {
          console.error('Failed to fetch positions:', error)
          return { data: [], summary: { totalPositions: 0 } }
        }),
        
        ssgElectionsAPI.getPartylists(ssgElectionId).catch(error => {
          console.error('Failed to fetch partylists:', error)
          return { data: [], summary: { totalPartylists: 0 } }
        }),
        
        ssgElectionsAPI.getVoterParticipants(ssgElectionId, { limit: 1 }).catch(error => {
          console.error('Failed to fetch participants:', error)
          return { data: { summary: { totalParticipants: 0 } } }
        }),
        
        ssgElectionsAPI.getVoterTurnout(ssgElectionId).catch(error => {
          console.error('Failed to fetch turnout:', error)
          return { data: { overall: { turnoutPercentage: 0 } } }
        }),
        
        ssgElectionsAPI.getBallots(ssgElectionId, { limit: 1 }).catch(error => {
          console.error('Failed to fetch ballots:', error)
          return { data: [], statistics: { totalBallots: 0 } }
        })
      ]

      console.log('Fetching all data in parallel...')
      const [
        candidatesResponse,
        positionsResponse,
        partylistsResponse,
        participantsResponse,
        turnoutResponse,
        ballotsResponse
      ] = await Promise.all(fetchPromises)

      counts.candidates = extractCount(candidatesResponse, ['totalCandidates', 'total', 'length', 'count'])
      if (candidatesResponse?.data?.candidates) {
        counts.candidates = candidatesResponse.data.candidates.length
      }

      counts.positions = extractCount(positionsResponse, ['totalPositions', 'total', 'length', 'count'])
      if (positionsResponse?.data?.positions) {
        counts.positions = positionsResponse.data.positions.length
      }

      counts.partylists = extractCount(partylistsResponse, ['totalPartylists', 'total', 'length', 'count'])
      if (partylistsResponse?.data?.partylists) {
        counts.partylists = partylistsResponse.data.partylists.length
      }

      counts.participants = extractCount(participantsResponse, ['totalParticipants', 'totalItems', 'total', 'count'])
      if (participantsResponse?.data?.summary?.totalParticipants) {
        counts.participants = participantsResponse.data.summary.totalParticipants
      }

      if (turnoutResponse?.data?.overall?.turnoutPercentage) {
        counts.turnout = Math.round(Number(turnoutResponse.data.overall.turnoutPercentage))
      } else if (turnoutResponse?.data?.turnoutPercentage) {
        counts.turnout = Math.round(Number(turnoutResponse.data.turnoutPercentage))
      } else {
        counts.turnout = 0
      }

      counts.ballots = extractCount(ballotsResponse, ['totalBallots', 'totalItems', 'total', 'count'])
      if (ballotsResponse?.data?.statistics?.totalBallots) {
        counts.ballots = ballotsResponse.data.statistics.totalBallots
      }

      console.log('Final calculated counts:', counts)
      setCardCounts(counts)

    } catch (error) {
      console.error("Critical error in fetchCardCounts:", error)
      setCardCounts({
        candidates: 0,
        positions: 0,
        partylists: 0,
        participants: 0,
        turnout: 0,
        ballots: 0
      })
    } finally {
      setCountsLoading(false)
      console.log('=== FINISHED CARD COUNTS FETCH ===')
    }
  }

  const handleElectionClick = (election) => {
  console.log('Election clicked:', election)
  setSelectedElection(election)
  
  // Store essential data for SSGLayout to use
  try {
    const essentialElectionData = {
      _id: election._id,
      id: election.id,
      ssgElectionId: election.ssgElectionId,
      electionYear: election.electionYear,
      title: election.title,
      status: election.status,
      electionDate: election.electionDate,
      ballotOpenTime: election.ballotOpenTime,
      ballotCloseTime: election.ballotCloseTime
    }
    localStorage.setItem('selectedSSGElection', JSON.stringify(essentialElectionData))
  } catch (error) {
    console.warn('Failed to store in localStorage, but app will continue working:', error)
  }
}


  const handleBackToElections = () => {
  setSelectedElection(null)
  // No localStorage cleanup needed
  setCardCounts({
    candidates: 0,
    positions: 0,
    partylists: 0,
    participants: 0,
    turnout: 0,
    ballots: 0
  })
}

  const handleAddElection = () => {
    setShowAddForm(true)
    setFormData({
      ssgElectionId: '',
      electionYear: new Date().getFullYear(),
      title: '',
      status: 'upcoming',
      electionDate: '',
      ballotOpenTime: '',
      ballotCloseTime: ''
    })
    setError('')
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    setFormLoading(true)
    setError('')

    // Validate ballot times
    const timeValidation = validateBallotTimes(formData.ballotOpenTime, formData.ballotCloseTime)
    if (!timeValidation.isValid) {
      setError(timeValidation.error)
      setFormLoading(false)
      return
    }

    try {
      await ssgElectionsAPI.create(formData)
      await fetchElections()
      setShowAddForm(false)
      setFormData({
        ssgElectionId: '',
        electionYear: new Date().getFullYear(),
        title: '',
        status: 'upcoming',
        electionDate: '',
        ballotOpenTime: '',
        ballotCloseTime: ''
      })

      Swal.fire({
        title: 'Success!',
        text: 'SSG Election created successfully',
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

  const handleDeleteElection = async (ssgElectionId, e) => {
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

        await ssgElectionsAPI.delete(ssgElectionId)
        await fetchElections()
        
        if (selectedElection && (selectedElection._id === ssgElectionId || selectedElection.id === ssgElectionId)) {
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
      title: "Positions",
      icon: FileText,
      color: "bg-[#b0c8fe]/35",
      hoverColor: "hover:bg-[#b0c8fe]/25",
      borderColor: "border-[#b0c8fe]/45",
      shadowColor: "shadow-[#b0c8fe]/25",
      textColor: "text-[#001f65]",
      description: "Manage election positions",
      count: cardCounts.positions,
      path: `/ecommittee/ssg/partylist-position?ssgElectionId=${selectedElection?._id || selectedElection?.id}`
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
      path: `/ecommittee/ssg/partylist?ssgElectionId=${selectedElection?._id || selectedElection?.id}`
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
      count: cardCounts.participants,
      path: `/ecommittee/ssg/voterTurnout?ssgElectionId=${selectedElection?._id || selectedElection?.id}`
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
      path: `/ecommittee/ssg/turnout?ssgElectionId=${selectedElection?._id || selectedElection?.id}`
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
    }
  ]

  if (selectedElection) {
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
            {/* Display ballot times if available */}
            {(selectedElection.ballotOpenTime || selectedElection.ballotCloseTime) && (
              <div className="mt-2 space-y-1">
                {selectedElection.ballotOpenTime && (
                  <p className="text-white/60 text-xs">
                    Ballot opens: {formatTimeDisplay(selectedElection.ballotOpenTime)}
                  </p>
                )}
                {selectedElection.ballotCloseTime && (
                  <p className="text-white/60 text-xs">
                    Ballot closes: {formatTimeDisplay(selectedElection.ballotCloseTime)}
                  </p>
                )}
              </div>
            )}
          </div>

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
                        <div className={`p-4 rounded-full ${card.color} mb-6 shadow-lg border border-[#b0c8fe]/20`}>
                          <div className={card.textColor}>
                            <IconComponent className="w-8 h-8 sm:w-10 md:w-12" />
                          </div>
                        </div>
                        
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
                    type="date"
                    required
                    value={formData.electionDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, electionDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* FIXED: Using time input instead of datetime-local */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ballot Open Time
                  </label>
                  <input
                    type="time"
                    value={formData.ballotOpenTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, ballotOpenTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    When voters can start casting ballots on the election date (optional)
                  </p>
                </div>

                {/* FIXED: Using time input instead of datetime-local */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ballot Close Time
                  </label>
                  <input
                    type="time"
                    value={formData.ballotCloseTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, ballotCloseTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    When voting ends on the election date (optional)
                  </p>
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
                          {/* Display ballot times in cards */}
                          {(election.ballotOpenTime || election.ballotCloseTime) && (
                            <div className="mt-2 space-y-1">
                              {election.ballotOpenTime && (
                                <p className="text-blue-200 text-xs">
                                  Opens: {formatTimeDisplay(election.ballotOpenTime)}
                                </p>
                              )}
                              {election.ballotCloseTime && (
                                <p className="text-blue-200 text-xs">
                                  Closes: {formatTimeDisplay(election.ballotCloseTime)}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Action Icons */}
                          <div className="flex justify-center gap-4 mt-auto">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                // Store the election data before navigating
                                const essentialElectionData = {
                                  _id: election._id,
                                  id: election.id,
                                  ssgElectionId: election.ssgElectionId,
                                  electionYear: election.electionYear,
                                  title: election.title,
                                  status: election.status,
                                  electionDate: election.electionDate,
                                  ballotOpenTime: election.ballotOpenTime,
                                  ballotCloseTime: election.ballotCloseTime
                                }
                                try {
                                  localStorage.setItem('selectedSSGElection', JSON.stringify(essentialElectionData))
                                } catch (error) {
                                  console.warn('Failed to store in localStorage:', error)
                                }
                                // Now navigate to status page
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