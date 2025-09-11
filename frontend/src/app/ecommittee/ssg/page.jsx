"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ssgElectionsAPI } from "@/lib/api/ssgElections"
import BackgroundWrapper from '@/components/BackgroundWrapper'
import { 
  Home, 
  CheckCircle, 
  Users, 
  Clipboard, 
  MapPin, 
  User, 
  TrendingUp, 
  BarChart3,
  Menu,
  X,
  ArrowLeft,
  LayoutDashboard,
  LogOut,
  Calendar,
  Plus,
  Edit,
  Trash2,
  Save,
  AlertCircle,
  Vote,
  Building2
} from "lucide-react"

export default function SSGPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [elections, setElections] = useState([])
  const [selectedElection, setSelectedElection] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    electionYear: new Date().getFullYear()
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

  const fetchElections = async () => {
    try {
      const response = await ssgElectionsAPI.getAll()
      setElections(response.elections || response.data || response)
    } catch (error) {
      console.error("Error fetching elections:", error)
      setElections([])
    }
  }

  const handleElectionClick = (election) => {
    setSelectedElection(election)
  }

  const handleAddElection = () => {
    setShowAddForm(true)
    setFormData({
      title: '',
      description: '',
      startDate: '',
      endDate: '',
      electionYear: new Date().getFullYear()
    })
    setError('')
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    setFormLoading(true)
    setError('')

    try {
      // Validate dates
      const startDate = new Date(formData.startDate)
      const endDate = new Date(formData.endDate)
      
      if (startDate >= endDate) {
        throw new Error('End date must be after start date')
      }

      await ssgElectionsAPI.create(formData)
      await fetchElections()
      setShowAddForm(false)
      setFormData({
        title: '',
        description: '',
        startDate: '',
        endDate: '',
        electionYear: new Date().getFullYear()
      })
    } catch (error) {
      setError(error.message || 'Failed to create election')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteElection = async (electionId, e) => {
    e.stopPropagation()
    
    if (window.confirm('Are you sure you want to delete this election? This action cannot be undone.')) {
      try {
        await ssgElectionsAPI.delete(electionId)
        await fetchElections()
      } catch (error) {
        console.error('Error deleting election:', error)
        alert('Failed to delete election. Please try again.')
      }
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    router.push("/adminlogin")
  }

  const handleBackToDashboard = () => {
    router.push('/ecommittee/dashboard')
  }

  const handleBackToElections = () => {
    setSelectedElection(null)
    setSidebarOpen(false)
  }

  if (loading) {
    return (
      <BackgroundWrapper>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
            <p className="mt-4 text-white">Loading...</p>
          </div>
        </div>
      </BackgroundWrapper>
    )
  }

  // Election management cards data
  const electionManagementCards = [
    { 
      title: "Candidates",
      icon: Users,
      color: "bg-blue-500/20",
      hoverColor: "hover:bg-blue-500/30",
      description: "Manage election candidates"
    },
    { 
      title: "Positions",
      icon: MapPin,
      color: "bg-green-500/20",
      hoverColor: "hover:bg-green-500/30",
      description: "Configure election positions"
    },
    { 
      title: "Partylist",
      icon: Clipboard,
      color: "bg-purple-500/20",
      hoverColor: "hover:bg-purple-500/30",
      description: "Manage party lists"
    },
    { 
      title: "Voter Participants",
      icon: User,
      color: "bg-orange-500/20",
      hoverColor: "hover:bg-orange-500/30",
      description: "View registered voters"
    },
    { 
      title: "Voter Turnout",
      icon: TrendingUp,
      color: "bg-red-500/20",
      hoverColor: "hover:bg-red-500/30",
      description: "Monitor voting activity"
    },
    { 
      title: "Ballots",
      icon: Vote,
      color: "bg-indigo-500/20",
      hoverColor: "hover:bg-indigo-500/30",
      description: "Manage voting ballots"
    },
    { 
      title: "Statistics",
      icon: BarChart3,
      color: "bg-cyan-500/20",
      hoverColor: "hover:bg-cyan-500/30",
      description: "View election analytics"
    }
  ]

  const sidebarItems = [
    { 
      icon: LayoutDashboard, 
      label: "Main Dashboard", 
      path: "/ecommittee/dashboard" 
    },
    { 
      icon: Home, 
      label: "Home", 
      onClick: handleBackToElections
    },
    { 
      icon: Users, 
      label: "Candidates", 
      path: `/ecommittee/ssg/candidates?electionId=${selectedElection?._id}` 
    },
    { 
      icon: MapPin, 
      label: "Positions", 
      path: `/ecommittee/ssg/position?electionId=${selectedElection?._id}` 
    },
    { 
      icon: Clipboard, 
      label: "Partylist", 
      path: `/ecommittee/ssg/partylist?electionId=${selectedElection?._id}` 
    },
    { 
      icon: User, 
      label: "Voter Participants", 
      path: `/ecommittee/ssg/voters?electionId=${selectedElection?._id}` 
    },
    { 
      icon: TrendingUp, 
      label: "Voter Turnout", 
      path: `/ecommittee/ssg/voterTurnout?electionId=${selectedElection?._id}` 
    },
    { 
      icon: Vote, 
      label: "Ballots", 
      path: `/ecommittee/ssg/ballot?electionId=${selectedElection?._id}` 
    },
    { 
      icon: BarChart3, 
      label: "Statistics", 
      path: `/ecommittee/ssg/statistics?electionId=${selectedElection?._id}` 
    }
  ]

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
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of the election"
                    rows={3}
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.startDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.endDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
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
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && selectedElection && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Only show when election is selected */}
      {selectedElection && (
        <div className={`fixed left-0 top-0 h-full w-64 bg-white/95 backdrop-blur-sm shadow-lg border-r z-50 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}>
          <div className="p-6 flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800">SSG Elections</h2>
                <p className="text-sm text-gray-600 truncate">{selectedElection.title}</p>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="space-y-2 flex-1">
              {sidebarItems.map((item, index) => {
                const IconComponent = item.icon
                return (
                  <button
                    key={index}
                    onClick={() => {
                      if (item.path) {
                        router.push(item.path)
                      } else if (item.onClick) {
                        item.onClick()
                      }
                      setSidebarOpen(false)
                    }}
                    className="w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors text-gray-600 hover:bg-purple-50 hover:text-purple-700"
                  >
                    <IconComponent className="w-5 h-5" />
                    <span className="ml-3">{item.label}</span>
                  </button>
                )
              })}
            </nav>

            <div className="pt-6">
              <button
                onClick={handleLogout}
                className="w-full flex items-center px-4 py-3 text-left rounded-lg text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-5 h-5 mr-3" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header - Dashboard style navbar */}
      <div className="bg-[#b0c8fe]/95 backdrop-blur-sm shadow-lg border-b border-[#b0c8fe]/30 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {selectedElection && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-[#b0c8fe]/30 mr-3"
              >
                <Menu className="w-5 h-5 text-[#001f65]" />
              </button>
            )}
            <div className="w-8 h-8 bg-gradient-to-br from-[#001f65] to-[#003399] rounded-lg flex items-center justify-center mr-3 shadow-lg">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#001f65]">
                {selectedElection ? selectedElection.title : 'SSG Elections'}
              </h1>
              <p className="text-xs text-[#001f65]/70">Welcome, {user?.username}</p>
            </div>
          </div>
          
          <button
            onClick={handleBackToDashboard}
            className="flex items-center px-2 sm:px-4 py-2 text-xs sm:text-sm text-[#001f65] hover:bg-[#b0c8fe]/30 rounded-lg transition-colors border border-[#001f65]/20 bg-white/60 backdrop-blur-sm"
          >
            <LayoutDashboard className="w-4 h-4 mr-1 sm:mr-2" />
            Election Committee Dashboard
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${selectedElection ? 'lg:ml-64' : ''} min-h-screen`}>
        <div className="p-4 lg:p-6">
          {!selectedElection ? (
            // Elections Grid
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
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                election.status === 'active' 
                                  ? 'bg-green-500/20 text-green-100' 
                                  : election.status === 'upcoming'
                                  ? 'bg-yellow-500/20 text-yellow-100'
                                  : 'bg-gray-500/20 text-gray-100'
                              }`}>
                                {election.status || 'draft'}
                              </span>
                            </div>

                            {/* Election Info */}
                            <div className="flex-1 flex flex-col justify-center text-center mb-6">
                              <h3 className="text-2xl font-bold text-white mb-2 leading-tight">
                                {election.title || `SSG Election ${election.electionYear}`}
                              </h3>
                              <p className="text-blue-100 text-sm mb-2">
                                {election.electionYear}
                              </p>
                              {election.description && (
                                <p className="text-blue-200 text-xs line-clamp-2">
                                  {election.description}
                                </p>
                              )}
                            </div>

                            {/* Dates */}
                            <div className="text-center mb-4">
                              <p className="text-blue-100 text-xs">
                                {election.startDate ? new Date(election.startDate).toLocaleDateString() : 'No date set'} - 
                                {election.endDate ? new Date(election.endDate).toLocaleDateString() : 'No date set'}
                              </p>
                            </div>

                            {/* Action Icons */}
                            <div className="flex justify-center gap-4 mt-auto">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleElectionClick(election)
                                }}
                                className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                                title="Manage Election"
                              >
                                <Edit className="w-5 h-5 text-white" />
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
          ) : (
            // Election Management Cards
            <div className="min-h-[calc(100vh-120px)] flex flex-col justify-center">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Election Management</h2>
                <p className="text-white/80">Managing: {selectedElection.title}</p>
              </div>

              <div className="flex justify-center">
                <div className="w-full max-w-6xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center">
                    {electionManagementCards.map((card, index) => {
                      const IconComponent = card.icon
                      return (
                        <div
                          key={index}
                          onClick={() => {
                            const paths = {
                              "Candidates": `/ecommittee/ssg/candidates?electionId=${selectedElection._id}`,
                              "Positions": `/ecommittee/ssg/position?electionId=${selectedElection._id}`,
                              "Partylist": `/ecommittee/ssg/partylist?electionId=${selectedElection._id}`,
                              "Voter Participants": `/ecommittee/ssg/voters?electionId=${selectedElection._id}`,
                              "Voter Turnout": `/ecommittee/ssg/voterTurnout?electionId=${selectedElection._id}`,
                              "Ballots": `/ecommittee/ssg/ballot?electionId=${selectedElection._id}`,
                              "Statistics": `/ecommittee/ssg/statistics?electionId=${selectedElection._id}`
                            }
                            router.push(paths[card.title])
                          }}
                          className={`w-full max-w-xs ${card.color} backdrop-blur-sm rounded-2xl shadow-lg p-6 ${card.hoverColor} transition-all duration-200 cursor-pointer group relative overflow-hidden aspect-[3/4] flex flex-col border border-white/20`}
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                          
                          <div className="relative z-10 flex-1 flex flex-col justify-center items-center text-center">
                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
                              <IconComponent className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">{card.title}</h3>
                            <p className="text-white/80 text-sm">{card.description}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </BackgroundWrapper>
  )
}