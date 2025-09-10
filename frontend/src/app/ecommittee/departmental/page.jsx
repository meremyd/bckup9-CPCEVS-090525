"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { departmentalElectionsAPI } from "@/lib/api/departmentalElections"
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
  ArrowLeft,
  LayoutDashboard,
  LogOut,
  Calendar,
  Plus,
  Edit,
  Trash2,
  Save,
  AlertCircle,
  BookOpen,
  GraduationCap,
  Building2,
  ChevronRight
} from "lucide-react"

export default function DepartmentalPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [departments, setDepartments] = useState([])
  const [allElections, setAllElections] = useState([])
  const [filteredElections, setFilteredElections] = useState([])
  const [selectedDepartment, setSelectedDepartment] = useState(null)
  const [selectedElection, setSelectedElection] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    department: '',
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

      fetchDepartments()
      fetchAllElections()
    } catch (parseError) {
      console.error("Error parsing user data:", parseError)
      router.push("/adminlogin")
      return
    }

    setLoading(false)
  }, [router])

  const fetchDepartments = async () => {
    try {
      const response = await departmentalElectionsAPI.getAvailableDepartments()
      setDepartments(response.departments || response.data || response)
    } catch (error) {
      console.error("Error fetching departments:", error)
      setDepartments([])
    }
  }

  const fetchAllElections = async () => {
    try {
      const response = await departmentalElectionsAPI.getAll()
      const elections = response.elections || response.data || response
      setAllElections(elections)
      setFilteredElections(elections) // Show all elections initially
    } catch (error) {
      console.error("Error fetching elections:", error)
      setAllElections([])
      setFilteredElections([])
    }
  }

  const handleDepartmentClick = (department) => {
    if (selectedDepartment === department) {
      // If same department clicked, show all elections
      setSelectedDepartment(null)
      setFilteredElections(allElections)
    } else {
      // Filter elections by department
      setSelectedDepartment(department)
      const filtered = allElections.filter(election => election.department === department)
      setFilteredElections(filtered)
    }
  }

  const handleElectionClick = (election) => {
    setSelectedElection(election)
    router.push(`/ecommittee/departmental/status?electionId=${election._id || election.id}&department=${election.department}`)
  }

  const handleAddElection = () => {
    setShowAddForm(true)
    setFormData({
      title: '',
      description: '',
      department: selectedDepartment || '',
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

      await departmentalElectionsAPI.create(formData)
      
      // Refresh elections
      await fetchAllElections()
      
      setShowAddForm(false)
      setFormData({
        title: '',
        description: '',
        department: '',
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
        await departmentalElectionsAPI.delete(electionId)
        await fetchAllElections()
      } catch (error) {
        console.error('Error deleting election:', error)
        alert('Failed to delete election. Please try again.')
      }
    }
  }

  const handleSidebarNavigation = (path) => {
    const electionParam = selectedElection ? `?electionId=${selectedElection._id || selectedElection.id}&department=${selectedElection.department}` : ''
    router.push(`${path}${electionParam}`)
    setSidebarOpen(false)
  }

  const handleBackToElections = () => {
    setSelectedElection(null)
    setSidebarOpen(false)
    router.push('/ecommittee/departmental')
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    router.push("/adminlogin")
  }

  // Department icon mapping
  const getDepartmentIcon = (department) => {
    const iconMap = {
      'Computer Science': BookOpen,
      'Information Technology': BookOpen,
      'Engineering': Building2,
      'Business': GraduationCap,
      'Education': GraduationCap,
      'Arts': BookOpen,
      'Science': BookOpen,
      'Medicine': Building2,
      'Law': GraduationCap,
      'Agriculture': Building2
    }
    return iconMap[department] || BookOpen
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-white">Loading...</p>
        </div>
      </div>
    )
  }

  const sidebarItems = [
    { 
      icon: Home, 
      label: "Home", 
      path: "/ecommittee/departmental" 
    },
    { 
      icon: CheckCircle, 
      label: "Status", 
      path: "/ecommittee/departmental/status" 
    },
    { 
      icon: Users, 
      label: "Candidates", 
      path: "/ecommittee/departmental/candidates" 
    },
    { 
      icon: Clipboard, 
      label: "Ballot", 
      path: "/ecommittee/departmental/ballot" 
    },
    { 
      icon: TrendingUp, 
      label: "Voter Turnout", 
      path: "/ecommittee/departmental/voterTurnout" 
    },
    { 
      icon: BarChart3, 
      label: "Statistics", 
      path: "/ecommittee/departmental/statistics" 
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600">
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
                    Election Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., CS Department Election 2024"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department *
                  </label>
                  <select
                    required
                    value={formData.department}
                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

      {/* Sidebar */}
      {selectedElection && (
        <div className={`fixed left-0 top-0 h-full w-64 bg-white/95 backdrop-blur-sm shadow-lg border-r z-50 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}>
          <div className="p-6 flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Departmental Elections</h2>
                <p className="text-sm text-gray-600 truncate">{selectedElection.title}</p>
                <p className="text-xs text-gray-500">{selectedElection.department}</p>
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
                className="w-full flex items-center px-4 py-3 text-left rounded-lg text-purple-600 hover:bg-purple-50 transition-colors"
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
        <div className="bg-white/10 backdrop-blur-sm border-b border-white/20">
          <div className="px-4 lg:px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                {selectedElection && (
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="lg:hidden p-2 rounded-lg hover:bg-white/10 mr-3"
                  >
                    <Menu className="w-5 h-5 text-white" />
                  </button>
                )}
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {selectedElection ? selectedElection.title : 'Departmental Elections'}
                  </h1>
                  <p className="text-purple-100">
                    Welcome, {user?.username}
                    {selectedDepartment && (
                      <>
                        {' • '}
                        <span className="font-medium">{selectedDepartment}</span>
                        {' • '}
                        <button 
                          onClick={() => handleDepartmentClick(selectedDepartment)}
                          className="hover:underline"
                        >
                          Show All
                        </button>
                      </>
                    )}
                  </p>
                </div>
              </div>
              
              {!selectedElection && (
                <button
                  onClick={() => router.push('/ecommittee/dashboard')}
                  className="flex items-center px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors backdrop-blur-sm"
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
            <div>
              {/* Department Cards Section */}
              {departments.length > 0 && (
                <div className="mb-12">
                  {/* <div className="mb-8 text-center">
                    <h2 className="text-2xl font-bold text-white mb-2">Departments</h2>
                    <p className="text-purple-100">Filter elections by department</p>
                  </div> */}
                  
                  <div className="flex justify-center mb-8">
                    <div className="w-full max-w-6xl">
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 justify-items-center">
                        {departments.map((department) => {
                          const IconComponent = getDepartmentIcon(department)
                          const isSelected = selectedDepartment === department
                          
                          return (
                            <div
                              key={department}
                              onClick={() => handleDepartmentClick(department)}
                              className={`w-full max-w-[140px] rounded-2xl shadow-lg p-4 transition-all duration-200 cursor-pointer group relative overflow-hidden aspect-square flex flex-col items-center justify-center text-center ${
                                isSelected 
                                  ? 'bg-white/40 backdrop-blur-sm scale-105' 
                                  : 'bg-white/20 backdrop-blur-sm hover:bg-white/30'
                              }`}
                            >
                              {/* Background Pattern */}
                              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                              
                              <div className="relative z-10 flex flex-col items-center">
                                {/* Department Icon */}
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-transform duration-200 ${
                                  isSelected ? 'bg-white/30 scale-110' : 'bg-white/20 group-hover:scale-110'
                                }`}>
                                  <IconComponent className="w-6 h-6 text-white" />
                                </div>

                                {/* Department Name */}
                                <h3 className="text-sm font-bold text-white leading-tight">
                                  {department}
                                </h3>
                              </div>
                              
                              {isSelected && (
                                <div className="absolute inset-0 border-2 border-white/50 rounded-2xl"></div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Elections Section */}
              {/* <div className="mb-8 text-center">
                <h2 className="text-2xl font-bold text-white mb-2">
                  {selectedDepartment ? `${selectedDepartment} Elections` : 'All Elections'}
                </h2>
                <p className="text-purple-100">
                  {selectedDepartment 
                    ? `Elections for ${selectedDepartment} department` 
                    : 'Select an election to manage or create a new one'
                  }
                </p>
              </div> */}

              {/* Centered Grid Container */}
              <div className="flex justify-center">
                <div className="w-full max-w-6xl">
                  {filteredElections.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center">
                        <Calendar className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-lg font-medium text-white mb-4">
                        {selectedDepartment ? `No Elections Found for ${selectedDepartment}` : 'No Elections Found'}
                      </h3>
                      <p className="text-purple-100 mb-6">
                        {selectedDepartment 
                          ? `There are no elections for ${selectedDepartment} at the moment.`
                          : 'There are no departmental elections available at the moment.'
                        }
                      </p>
                      <button
                        onClick={handleAddElection}
                        className="inline-flex items-center px-6 py-3 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors backdrop-blur-sm"
                      >
                        <Plus className="w-5 h-5 mr-2" />
                        Create Your First Election
                      </button>
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
                        <p className="text-purple-100 text-sm">Create a new departmental election</p>
                      </div>

                      {/* Election Cards */}
                      {filteredElections.map((election) => (
                        <div
                          key={election._id || election.id}
                          onClick={() => handleElectionClick(election)}
                          className="w-full max-w-xs bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg p-6 hover:bg-white/30 transition-all duration-200 cursor-pointer group relative overflow-hidden aspect-[3/4] flex flex-col"
                        >
                          {/* Background Pattern */}
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
                                {election.title || `${election.department} Election ${election.electionYear}`}
                              </h3>
                              <p className="text-purple-100 text-sm mb-2">
                                {election.electionYear}
                              </p>
                              <p className="text-purple-200 text-xs mb-2 font-medium">
                                {election.department}
                              </p>
                              {election.description && (
                                <p className="text-purple-200 text-xs line-clamp-2">
                                  {election.description}
                                </p>
                              )}
                            </div>

                            {/* Dates */}
                            <div className="text-center mb-4">
                              <p className="text-purple-100 text-xs">
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
            // Selected Election Content (this will be replaced by specific pages)
            <div className="bg-white/20 backdrop-blur-sm rounded-xl shadow-sm border border-white/20 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Election Management</h2>
              <p className="text-purple-100">
                You are now managing: <strong>{selectedElection.title}</strong>
              </p>
              <p className="text-sm text-purple-200 mt-2">
                Department: <strong>{selectedElection.department}</strong>
              </p>
              <p className="text-sm text-purple-200 mt-2">
                Use the sidebar to navigate to different sections of this election.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}