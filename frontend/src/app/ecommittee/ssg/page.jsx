"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { electionsAPI } from "@/lib/api/elections"
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
  ChevronRight,
  Calendar
} from "lucide-react"

export default function SSGPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [elections, setElections] = useState([])
  const [selectedElection, setSelectedElection] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
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
      const response = await electionsAPI.getAll({ type: 'ssg' })
      setElections(response.elections || [])
    } catch (error) {
      console.error("Error fetching elections:", error)
      setElections([])
    }
  }

  const handleElectionClick = (election) => {
    setSelectedElection(election)
    router.push(`/ecommittee/ssg/status?electionId=${election.id}`)
  }

  const handleSidebarNavigation = (path) => {
    const electionParam = selectedElection ? `?electionId=${selectedElection.id}` : ''
    router.push(`${path}${electionParam}`)
    setSidebarOpen(false)
  }

  const handleBackToElections = () => {
    setSelectedElection(null)
    setSidebarOpen(false)
    router.push('/ecommittee/ssg')
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    router.push("/adminlogin")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  const sidebarItems = [
    { 
      icon: Home, 
      label: "Home", 
      path: "/ecommittee/ssg" 
    },
    { 
      icon: CheckCircle, 
      label: "Status", 
      path: "/ecommittee/ssg/status" 
    },
    { 
      icon: Users, 
      label: "Candidates", 
      path: "/ecommittee/ssg/candidates" 
    },
    { 
      icon: Clipboard, 
      label: "Party List", 
      path: "/ecommittee/ssg/partylist" 
    },
    { 
      icon: MapPin, 
      label: "Position", 
      path: "/ecommittee/ssg/position" 
    },
    { 
      icon: User, 
      label: "Voters", 
      path: "/ecommittee/ssg/voters" 
    },
    { 
      icon: TrendingUp, 
      label: "Voter Turnout", 
      path: "/ecommittee/ssg/voterTurnout" 
    },
    { 
      icon: BarChart3, 
      label: "Statistics", 
      path: "/ecommittee/ssg/statistics" 
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && selectedElection && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
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
              {sidebarItems.map((item) => {
                const IconComponent = item.icon
                return (
                  <button
                    key={item.path}
                    onClick={() => handleSidebarNavigation(item.path)}
                    className="w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors text-gray-600 hover:bg-purple-50 hover:text-purple-700"
                  >
                    <IconComponent className="w-5 h-5" />
                    <span className="ml-3">{item.label}</span>
                  </button>
                )
              })}
            </nav>

            <div className="pt-6 space-y-2">
              <button
                onClick={handleBackToElections}
                className="w-full flex items-center px-4 py-3 text-left rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-3" />
                Back to Elections
              </button>
              
              <button
                onClick={() => router.push('/ecommittee/dashboard')}
                className="w-full flex items-center px-4 py-3 text-left rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <LayoutDashboard className="w-5 h-5 mr-3" />
                Dashboard
              </button>

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

      {/* Main Content */}
      <div className={`transition-all duration-300 ${selectedElection ? 'lg:ml-64' : ''}`}>
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-white/20">
          <div className="px-4 lg:px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                {selectedElection && (
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="lg:hidden p-2 rounded-lg hover:bg-gray-100 mr-3"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                )}
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">
                    {selectedElection ? selectedElection.title : 'SSG Elections'}
                  </h1>
                  <p className="text-gray-600">Welcome, {user?.username}</p>
                </div>
              </div>
              
              {!selectedElection && (
                <button
                  onClick={() => router.push('/ecommittee/dashboard')}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Dashboard
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="p-4 lg:p-6">
          {!selectedElection ? (
            // Elections Grid
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-2">SSG Elections</h2>
                <p className="text-gray-600">Select an election to manage</p>
              </div>

              {elections.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <Calendar className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Elections Found</h3>
                  <p className="text-gray-500">There are no SSG elections available at the moment.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {elections.map((election) => (
                    <div
                      key={election.id}
                      onClick={() => handleElectionClick(election)}
                      className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-200 cursor-pointer hover:from-blue-700 hover:to-blue-800 group relative overflow-hidden"
                    >
                      {/* Background Pattern */}
                      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                      
                      <div className="relative z-10">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-white mb-2 leading-tight">
                              {election.title}
                            </h3>
                            <p className="text-blue-100 text-sm mb-4 line-clamp-2">
                              {election.description || 'No description available'}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3 mb-6">
                          <div className="flex items-center text-sm text-blue-100">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            <span>Status: </span>
                            <span className="ml-1 font-medium capitalize text-white">
                              {election.status || 'Draft'}
                            </span>
                          </div>
                          
                          <div className="flex items-center text-sm text-blue-100">
                            <Calendar className="w-4 h-4 mr-2" />
                            <span>Created: </span>
                            <span className="ml-1 font-medium text-white">
                              {election.createdAt ? new Date(election.createdAt).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-blue-500/30">
                          <div className="text-xs text-blue-200">
                            SSG Election
                          </div>
                          <div className="flex items-center text-white text-sm font-medium group-hover:translate-x-1 transition-transform duration-200">
                            <span>Manage</span>
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Selected Election Content (this will be replaced by specific pages)
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Election Management</h2>
              <p className="text-gray-600">
                You are now managing: <strong>{selectedElection.title}</strong>
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Use the sidebar to navigate to different sections of this election.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}