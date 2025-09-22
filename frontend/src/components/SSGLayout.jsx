import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ssgElectionsAPI } from "@/lib/api/ssgElections"
import BackgroundWrapper from '@/components/BackgroundWrapper'
import { 
  Home, 
  Users, 
  Clipboard, 
  User, 
  Vote,
  TrendingUp, 
  BarChart3,
  Menu,
  X,
  LayoutDashboard,
  LogOut,
  Settings,
  Loader2,
  ArrowLeft,
  AlertCircle
} from "lucide-react"

// SSG Layout Component for consistent sidebar and header
export default function SSGLayout({ 
  children, 
  ssgElectionId, 
  title = "SSG Management", 
  subtitle = "Manage Election", 
  activeItem = "", 
  showBackButton = true,
  headerAction = null
}) {
  const [user, setUser] = useState(null)
  const [ssgElection, setElection] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)
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

      console.log('SSGLayout - ssgElectionId:', ssgElectionId)

      // Try to get election from localStorage first for better UX
      if (ssgElectionId) {
        const storedElection = localStorage.getItem('selectedSSGElection')
        console.log('SSGLayout - stored election:', storedElection)
        
        if (storedElection) {
          try {
            const parsed = JSON.parse(storedElection)
            console.log('SSGLayout - parsed stored election:', parsed)
            if (parsed._id === ssgElectionId || parsed.id === ssgElectionId) {
              setElection(parsed)
              setLoading(false)
              return
            }
          } catch (e) {
            console.warn('SSGLayout - error parsing stored election:', e)
            localStorage.removeItem('selectedSSGElection')
          }
        }
        
        fetchElection()
      } else {
        setLoading(false)
      }
    } catch (parseError) {
      console.error("Error parsing user data:", parseError)
      router.push("/adminlogin")
      return
    }
  }, [router, ssgElectionId])

  const fetchElection = async () => {
    try {
      setLoading(true)
      setError('')
      
      const response = await ssgElectionsAPI.getById(ssgElectionId)
      
      // Handle different response structures
      let electionData
      if (response.success && response.data) {
        electionData = response.data
      } else if (response.election) {
        electionData = response.election
      } else if (response._id || response.ssgElectionId) {
        electionData = response
      } else {
        throw new Error('Invalid response structure from API')
      }
      
      setElection(electionData)
      
      // Store only essential election data to avoid localStorage quota issues
      const essentialElectionData = {
        _id: electionData._id,
        id: electionData.id,
        ssgElectionId: electionData.ssgElectionId,
        electionYear: electionData.electionYear,
        title: electionData.title,
        status: electionData.status,
        electionDate: electionData.electionDate,
        ballotOpenTime: electionData.ballotOpenTime,
        ballotCloseTime: electionData.ballotCloseTime,
        ballotStatus: electionData.ballotStatus
      }

      // Try to store essential data, but don't fail if localStorage is full
      try {
        localStorage.setItem('selectedSSGElection', JSON.stringify(essentialElectionData))
        console.log('Successfully stored essential election data')
      } catch (storageError) {
        console.warn('Failed to store election in localStorage (quota exceeded), but continuing:', storageError)
        // Clear old data and try again
        try {
          localStorage.removeItem('selectedSSGElection')
          localStorage.setItem('selectedSSGElection', JSON.stringify(essentialElectionData))
        } catch (retryError) {
          console.warn('Still failed after clearing, app will work without localStorage')
        }
      }
      
    } catch (error) {
      console.error("Error fetching election:", error)
      let errorMessage = "Failed to load election data"
      
      if (error.response?.status === 404) {
        errorMessage = "Election not found"
      } else if (error.response?.status === 403) {
        errorMessage = "You don't have permission to view this election"
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    localStorage.removeItem("selectedSSGElection")
    router.push("/adminlogin")
  }

  const handleBackToElections = () => {
    localStorage.removeItem("selectedSSGElection")
    router.push('/ecommittee/ssg')
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-500/20 text-green-700 border-green-300'
      case 'upcoming':
        return 'bg-yellow-500/20 text-yellow-700 border-yellow-300'
      case 'completed':
        return 'bg-blue-500/20 text-blue-700 border-blue-300'
      case 'draft':
        return 'bg-gray-500/20 text-gray-700 border-gray-300'
      default:
        return 'bg-gray-500/20 text-gray-700 border-gray-300'
    }
  }

  // Sidebar items
  const sidebarItems = [
    { 
      icon: LayoutDashboard, 
      label: "Main Dashboard", 
      path: "/ecommittee/dashboard" 
    },
    { 
      icon: Home, 
      label: "SSG Elections", 
      onClick: handleBackToElections
    },
    { 
      icon: Settings, 
      label: "Status", 
      path: `/ecommittee/ssg/status?ssgElectionId=${ssgElectionId}`,
      active: activeItem === 'status'
    },
    { 
      icon: Clipboard, 
      label: "Position - Partylist", 
      path: `/ecommittee/ssg/partylist-position?ssgElectionId=${ssgElectionId}`,
      active: activeItem === 'partylist'
    },
    { 
      icon: Users, 
      label: "Candidates", 
      path: `/ecommittee/ssg/candidates?ssgElectionId=${ssgElectionId}`,
      active: activeItem === 'candidates'
    },
    { 
      icon: User, 
      label: "Voter Participants", 
      path: `/ecommittee/ssg/participants?ssgElectionId=${ssgElectionId}`,
      active: activeItem === 'voters'
    },
    { 
      icon: Vote, 
      label: "Ballots", 
      path: `/ecommittee/ssg/ballot?ssgElectionId=${ssgElectionId}`,
      active: activeItem === 'ballots'
    },
    { 
      icon: TrendingUp, 
      label: "Voter Turnout", 
      path: `/ecommittee/ssg/voterTurnout?ssgElectionId=${ssgElectionId}`,
      active: activeItem === 'voterTurnout'
    },
    { 
      icon: BarChart3, 
      label: "Statistics", 
      path: `/ecommittee/ssg/statistics?ssgElectionId=${ssgElectionId}`,
      active: activeItem === 'statistics'
    }
  ]

  if (loading && ssgElectionId) {
    return (
      <BackgroundWrapper>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20">
            <Loader2 className="animate-spin rounded-full h-12 w-12 mx-auto text-white" />
            <p className="mt-4 text-white font-medium">Loading election data...</p>
          </div>
        </div>
      </BackgroundWrapper>
    )
  }

  if (error && ssgElectionId) {
    return (
      <BackgroundWrapper>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20 max-w-md">
            <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Error Loading Election</h3>
            <p className="text-white/80 mb-6">{error}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => fetchElection()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={handleBackToElections}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Back to Elections
              </button>
            </div>
          </div>
        </div>
      </BackgroundWrapper>
    )
  }

  return (
    <BackgroundWrapper>
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && ssgElectionId && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Only show when ssgElectionId exists */}
      {ssgElectionId && (
        <div className={`fixed left-0 top-0 h-full w-64 z-50 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
        style={{
          background: 'linear-gradient(135deg, #001f65 0%, #6895fd 100%)'
        }}>
          <div className="p-6 flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">Election Committee</h2>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm text-white/70 truncate">{ssgElection?.title || 'SSG Election'}</p>

                </div>
                <p className="text-xs text-white/60 mt-1">ID: {ssgElection?.ssgElectionId || ssgElectionId}</p>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ssgElection?.status).replace('border-', 'bg-').replace('text-', 'text-white')}`}>
                    {ssgElection?.status?.toUpperCase() || 'UNKNOWN'}
                  </span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5 text-white" />
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
                    className={`w-full flex items-center justify-between px-4 py-3 text-left rounded-lg transition-colors ${
                      item.active 
                        ? 'bg-white/20 text-white' 
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center">
                      <IconComponent className="w-5 h-5" />
                      <span className="ml-3">{item.label}</span>
                    </div>
                  </button>
                )
              })}
            </nav>

            <div className="pt-6">
              <button
                onClick={handleLogout}
                className="w-full flex items-center px-4 py-3 text-left rounded-lg text-red-300 hover:bg-red-500/20 transition-colors"
              >
                <LogOut className="w-5 h-5 mr-3" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header - Mobile */}
      <div className={`${ssgElectionId ? 'lg:hidden' : ''} bg-[#b0c8fe]/95 backdrop-blur-sm shadow-lg border-b border-[#b0c8fe]/30 px-4 py-4`}>
        <div className="flex items-center justify-between">
          {ssgElectionId && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6 text-[#001f65]" />
            </button>
          )}
          <div className="text-center flex-1">
            <h1 className="text-lg font-bold text-[#001f65]">{title}</h1>
            <p className="text-xs text-[#001f65]/60">{ssgElection?.title || subtitle}</p>
          </div>
          {showBackButton && (
            <button
              onClick={handleBackToElections}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-[#001f65]" />
            </button>
          )}
          {headerAction && (
            <div className="ml-2">
              {headerAction}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className={`${ssgElectionId ? 'lg:ml-64' : ''} min-h-screen`}>
        <div className="p-4 lg:p-6 pt-20 lg:pt-6">
          {/* Header - Desktop */}
          {ssgElectionId && (
            <div className="hidden lg:flex items-center justify-between mb-8">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gradient-to-br from-[#001f65] to-[#003399] rounded-lg flex items-center justify-center mr-3 shadow-lg">
                  {activeItem === 'candidates' && <Users className="w-5 h-5 text-white" />}
                  {activeItem === 'status' && <Settings className="w-5 h-5 text-white" />}
                  {activeItem === 'partylist' && <Clipboard className="w-5 h-5 text-white" />}
                  {activeItem === 'voters' && <User className="w-5 h-5 text-white" />}
                  {activeItem === 'ballots' && <Vote className="w-5 h-5 text-white" />}
                  {activeItem === 'voterTurnout' && <TrendingUp className="w-5 h-5 text-white" />}
                  {activeItem === 'statistics' && <BarChart3 className="w-5 h-5 text-white" />}
                  {!activeItem && <Settings className="w-5 h-5 text-white" />}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">{title}</h1>
                  <p className="text-white/80 text-sm">{ssgElection?.title || 'Loading...'} - {subtitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {headerAction}
                {showBackButton && (
                  <button
                    onClick={handleBackToElections}
                    className="flex items-center px-4 py-2 text-sm text-white hover:bg-white/10 rounded-lg transition-colors border border-white/20 bg-white/5 backdrop-blur-sm"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Elections
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Content with election data passed as prop */}
          {typeof children === 'function' ? children(ssgElection) : children}
        </div>
      </div>
    </BackgroundWrapper>
  )
}