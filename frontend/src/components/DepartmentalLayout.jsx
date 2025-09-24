import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { departmentalElectionsAPI } from "@/lib/api/departmentalElections"
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
  AlertCircle,
  UserCheck
} from "lucide-react"

// Departmental Layout Component for consistent sidebar and header
export default function DepartmentalLayout({ 
  children, 
  deptElectionId, 
  title = "Departmental Management", 
  subtitle = "Manage Election", 
  activeItem = "", 
  showBackButton = true,
  headerAction = null
}) {
  const [user, setUser] = useState(null)
  const [departmentalElection, setElection] = useState(null)
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

      console.log('DepartmentalLayout - deptElectionId:', deptElectionId)

      // Try to get election from localStorage first for better UX
      if (deptElectionId) {
        const storedElection = localStorage.getItem('selectedDepartmentalElection')
        console.log('DepartmentalLayout - stored election:', storedElection)
        
        if (storedElection) {
          try {
            const parsed = JSON.parse(storedElection)
            console.log('DepartmentalLayout - parsed stored election:', parsed)
            if (parsed._id === deptElectionId || parsed.id === deptElectionId) {
              setElection(parsed)
              setLoading(false)
              return
            }
          } catch (e) {
            console.warn('DepartmentalLayout - error parsing stored election:', e)
            localStorage.removeItem('selectedDepartmentalElection')
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
  }, [router, deptElectionId])

  const fetchElection = async () => {
    try {
      setLoading(true)
      setError('')
      
      const response = await departmentalElectionsAPI.getById(deptElectionId)
      
      // Handle different response structures
      let electionData
      if (response.success && response.data) {
        electionData = response.data
      } else if (response.election) {
        electionData = response.election
      } else if (response._id || response.deptElectionId) {
        electionData = response
      } else {
        throw new Error('Invalid response structure from API')
      }
      
      setElection(electionData)
      
      // Store in localStorage for persistence
      localStorage.setItem('selectedDepartmentalElection', JSON.stringify(electionData))
      
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
    localStorage.removeItem("selectedDepartmentalElection")
    router.push("/adminlogin")
  }

  const handleBackToElections = () => {
    localStorage.removeItem("selectedDepartmentalElection")
    router.push('/ecommittee/departmental')
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
      label: "Departmental Elections", 
      onClick: handleBackToElections
    },
    { 
      icon: Settings, 
      label: "Status", 
      path: `/ecommittee/departmental/status?deptElectionId=${deptElectionId}`,
      active: activeItem === 'status'
    },
    { 
      icon: Clipboard, 
      label: "Position", 
      path: `/ecommittee/departmental/position?deptElectionId=${deptElectionId}`,
      active: activeItem === 'position'
    },
    { 
      icon: Users, 
      label: "Candidates", 
      path: `/ecommittee/departmental/candidates?deptElectionId=${deptElectionId}`,
      active: activeItem === 'candidates'
    },
    { 
      icon: UserCheck, 
      label: "Class Officers", 
      path: `/ecommittee/departmental/officers?deptElectionId=${deptElectionId}`,
      active: activeItem === 'officers'
    },
    { 
      icon: Vote, 
      label: "Ballot", 
      path: `/ecommittee/departmental/ballot?deptElectionId=${deptElectionId}`,
      active: activeItem === 'ballot'
    },
    { 
      icon: BarChart3, 
      label: "Statistics", 
      path: `/ecommittee/departmental/statistics?deptElectionId=${deptElectionId}`,
      active: activeItem === 'statistics'
    },
    { 
      icon: TrendingUp, 
      label: "Voter Turnout", 
      path: `/ecommittee/departmental/voterTurnout?deptElectionId=${deptElectionId}`,
      active: activeItem === 'voterTurnout'
    }
  ]

  if (loading && deptElectionId) {
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

  if (error && deptElectionId) {
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
      {sidebarOpen && deptElectionId && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Only show when deptElectionId exists */}
      {deptElectionId && (
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
                  <p className="text-sm text-white/70 truncate">{departmentalElection?.title || 'Departmental Election'}</p>
                </div>
                <p className="text-xs text-white/60 mt-1">ID: {departmentalElection?.deptElectionId || deptElectionId}</p>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(departmentalElection?.status).replace('border-', 'bg-').replace('text-', 'text-white')}`}>
                  {departmentalElection?.status?.toUpperCase() || 'UNKNOWN'}
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
      <div className={`${deptElectionId ? 'lg:hidden' : ''} bg-[#b0c8fe]/95 backdrop-blur-sm shadow-lg border-b border-[#b0c8fe]/30 px-4 py-4`}>
        <div className="flex items-center justify-between">
          {deptElectionId && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6 text-[#001f65]" />
            </button>
          )}
          <div className="text-center flex-1">
            <h1 className="text-lg font-bold text-[#001f65]">{title}</h1>
            <p className="text-xs text-[#001f65]/60">{departmentalElection?.title || subtitle}</p>
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
      <div className={`${deptElectionId ? 'lg:ml-64' : ''} min-h-screen`}>
        <div className="p-4 lg:p-6 pt-20 lg:pt-6">
          {/* Header - Desktop */}
          {deptElectionId && (
            <div className="hidden lg:flex items-center justify-between mb-8">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gradient-to-br from-[#001f65] to-[#003399] rounded-lg flex items-center justify-center mr-3 shadow-lg">
                  {activeItem === 'candidates' && <Users className="w-5 h-5 text-white" />}
                  {activeItem === 'status' && <Settings className="w-5 h-5 text-white" />}
                  {activeItem === 'position' && <Clipboard className="w-5 h-5 text-white" />}
                  {activeItem === 'officers' && <UserCheck className="w-5 h-5 text-white" />}
                  {activeItem === 'ballot' && <Vote className="w-5 h-5 text-white" />}
                  {activeItem === 'statistics' && <BarChart3 className="w-5 h-5 text-white" />}
                  {activeItem === 'voterTurnout' && <TrendingUp className="w-5 h-5 text-white" />}
                  {!activeItem && <Settings className="w-5 h-5 text-white" />}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">{title}</h1>
                  <p className="text-white/80 text-sm">{departmentalElection?.title || 'Loading...'} - {subtitle}</p>
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
          {typeof children === 'function' ? children(departmentalElection) : children}
        </div>
      </div>
    </BackgroundWrapper>
  )
}