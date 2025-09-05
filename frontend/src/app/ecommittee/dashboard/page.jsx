"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function ElectionCommitteeDashboard() {
  const [dashboardData, setDashboardData] = useState(null)
  const [elections, setElections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [user, setUser] = useState(null)
  const [selectedDegree, setSelectedDegree] = useState("")
  const [activeTab, setActiveTab] = useState("ssg")
  const [showAddElection, setShowAddElection] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [selectedElection, setSelectedElection] = useState(null)
  const router = useRouter()

  // Form state for adding election
  const [electionForm, setElectionForm] = useState({
    electionId: "",
    electionYear: new Date().getFullYear(),
    title: "",
    electionType: "ssg",
    department: "",
    status: "upcoming",
    electionDate: "",
    ballotOpenTime: "",
    ballotCloseTime: "",
  })

  // SweetAlert function
  const showAlert = (type, title, text) => {
    if (typeof window !== "undefined" && window.Swal) {
      window.Swal.fire({
        icon: type,
        title: title,
        text: text,
        confirmButtonColor: "#7C3AED",
      })
    } else {
      alert(`${title}: ${text}`)
    }
  }

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      try {
        const token = localStorage.getItem("token")
        const userData = localStorage.getItem("user")

        console.log("[v0] Checking auth - token exists:", !!token, "user data exists:", !!userData)

        if (!token) {
          console.log("[v0] No token found, redirecting to login")
          router.push("/adminlogin")
          return
        }

        let parsedUser = null
        if (userData) {
          try {
            parsedUser = JSON.parse(userData)
            console.log("[v0] Parsed user:", parsedUser)
          } catch (parseError) {
            console.error("[v0] Error parsing user data:", parseError)
            localStorage.removeItem("user")
            localStorage.removeItem("token")
            router.push("/adminlogin")
            return
          }
        }

        if (!parsedUser || parsedUser.userType !== "election_committee") {
          console.log("[v0] Invalid user type:", parsedUser?.userType, "- redirecting to login")
          localStorage.removeItem("user")
          localStorage.removeItem("token")
          router.push("/adminlogin")
          return
        }

        setUser(parsedUser)

        await Promise.all([fetchDashboardData(token), fetchElections(token)])
      } catch (error) {
        console.error("[v0] Auth check error:", error)
        setError("Authentication error occurred")
        router.push("/adminlogin")
      }
    }

    // Load SweetAlert2 CDN
    if (typeof window !== "undefined" && !window.Swal) {
      const script = document.createElement("script")
      script.src = "https://cdn.jsdelivr.net/npm/sweetalert2@11"
      document.head.appendChild(script)
    }

    checkAuthAndLoadData()
  }, [router])

  const fetchDashboardData = async (token) => {
    try {
      const response = await fetch("http://localhost:5000/api/dashboard/committee/dashboard", {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-auth-token": token, // Added both auth methods for compatibility
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        setDashboardData(data)
        console.log("[v0] Dashboard data loaded successfully")
      } else if (response.status === 401 || response.status === 403) {
        console.log("[v0] Authentication failed, clearing storage and redirecting")
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        router.push("/adminlogin")
      } else {
        const errorData = await response.json()
        setError(errorData.message || "Failed to fetch dashboard data")
      }
    } catch (error) {
      console.error("[v0] Dashboard error:", error)
      setError("Network error - please check if the server is running")
    } finally {
      setLoading(false)
    }
  }

  const fetchElections = async (token) => {
    try {
      const response = await fetch("http://localhost:5000/api/elections", {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-auth-token": token, // Added both auth methods for compatibility
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        setElections(data)
        console.log("[v0] Elections data loaded successfully")
      } else if (response.status === 401 || response.status === 403) {
        console.log("[v0] Authentication failed while fetching elections")
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        router.push("/adminlogin")
      }
    } catch (error) {
      console.error("[v0] Fetch elections error:", error)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    router.push("/adminlogin")
  }

  const handleDegreeCardClick = (degreeKey) => {
    setSelectedDegree(selectedDegree === degreeKey ? "" : degreeKey)
  }

  const handleBackToHome = () => {
    setSelectedDegree("")
    setShowSidebar(false)
    setSelectedElection(null)
  }

  const handleElectionFormChange = (e) => {
    const { name, value } = e.target
    setElectionForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleAddElection = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("http://localhost:5000/api/elections", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-auth-token": token, // Added both auth methods for compatibility
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...electionForm,
          createdBy: user.id,
        }),
      })

      if (response.ok) {
        const newElection = await response.json()
        setElections([...elections, newElection])
        setShowAddElection(false)
        setElectionForm({
          electionId: "",
          electionYear: new Date().getFullYear(),
          title: "",
          electionType: "ssg",
          department: "",
          status: "upcoming",
          electionDate: "",
          ballotOpenTime: "",
          ballotCloseTime: "",
        })
        showAlert("success", "Success!", "Election created successfully!")
      } else {
        const errorData = await response.json()
        showAlert("error", "Error!", errorData.message || "Failed to create election")
      }
    } catch (error) {
      console.error("Add election error:", error)
      showAlert("error", "Network Error!", "Please check your connection")
    }
  }

  const handleElectionClick = (election) => {
    setSelectedElection(election)
    setShowSidebar(true)
  }

  const handleSidebarNavigation = (path) => {
    router.push(path)
  }

  const getDegreeCardColor = (degreeKey) => {
    const colors = {
      BEED: "bg-blue-100 text-blue-800 border-blue-200",
      "BSED-English": "bg-green-100 text-green-800 border-green-200",
      "BSED-Science": "bg-emerald-100 text-emerald-800 border-emerald-200",
      BSIT: "bg-purple-100 text-purple-800 border-purple-200",
      BSHM: "bg-orange-100 text-orange-800 border-orange-200",
    }
    return colors[degreeKey] || "bg-gray-100 text-gray-800 border-gray-200"
  }

  const getDegreeCardInfo = (degreeKey) => {
    const info = {
      BEED: { title: "BEED", subtitle: "Bachelor of Elementary Education" },
      "BSED-English": { title: "BSED (English)", subtitle: "Bachelor of Secondary Education - Major in English" },
      "BSED-Science": { title: "BSED (Science)", subtitle: "Bachelor of Secondary Education - Major in Science" },
      BSIT: { title: "BSIT", subtitle: "Bachelor of Science in Information Technology" },
      BSHM: { title: "BSHM", subtitle: "Bachelor of Science in Hospitality Management" },
    }
    return info[degreeKey] || { title: degreeKey, subtitle: "" }
  }

  const filteredElections = elections.filter((election) => election.electionType === activeTab)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-100">
        <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl max-w-md">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="space-y-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Retry
              </button>
              <button
                onClick={handleLogout}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex">
      {/* Sidebar */}
      {showSidebar && (
        <div className="w-64 bg-white/90 backdrop-blur-sm shadow-lg border-r">
          <div className="p-6 flex flex-col h-screen">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Election Management</h2>
            <nav className="space-y-2 flex-1">
              <button
                onClick={handleBackToHome}
                className="w-full flex items-center px-4 py-3 text-left rounded-lg text-purple-600 hover:bg-purple-50 transition-colors"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                Home
              </button>
              <button
                onClick={() => handleSidebarNavigation(`/ecommittee/${activeTab}/candidate`)}
                className="w-full flex items-center px-4 py-3 text-left rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                Candidates
              </button>
              <button
                onClick={() => handleSidebarNavigation(`/ecommittee/${activeTab}/statistics`)}
                className="w-full flex items-center px-4 py-3 text-left rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                Statistics
              </button>
              <button
                onClick={() => handleSidebarNavigation(`/ecommittee/${activeTab}/status`)}
                className="w-full flex items-center px-4 py-3 text-left rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Status
              </button>
              <button
                onClick={() => handleSidebarNavigation(`/ecommittee/${activeTab}/voter-turnout`)}
                className="w-full flex items-center px-4 py-3 text-left rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                Voter Turnout
              </button>
              <button
                onClick={() => handleSidebarNavigation("/ecommittee/voters")}
                className="w-full flex items-center px-4 py-3 text-left rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                  />
                </svg>
                Voters
              </button>
            </nav>
            <div className="pt-6">
              <button
                onClick={handleLogout}
                className="w-full flex items-center px-4 py-3 text-left rounded-lg text-red-600 hover:bg-red-50 transition-colors"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-white/20">
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Election Committee Dashboard</h1>
                <p className="text-gray-600">Welcome, {user?.username}</p>
              </div>
              {selectedDegree && (
                <button
                  onClick={handleBackToHome}
                  className="flex items-center px-4 py-2 text-sm text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Dashboard
                </button>
              )}
              {!showSidebar && (
                <button
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Logout
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="p-6">
          {!selectedDegree && !showSidebar && (
            <>
              {/* Voter Summary Card */}
              <div className="mb-8 flex justify-center">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl p-6 shadow-lg min-w-[300px]">
                  <div className="text-center">
                    <h3 className="text-xl font-bold mb-2">Total Voters</h3>
                    <p className="text-3xl font-bold">
                      {dashboardData?.registeredVoters || 0}/{dashboardData?.totalVoters || 0}
                    </p>
                    <p className="text-indigo-100 text-sm">Registered/Total</p>
                  </div>
                </div>
              </div>

              {/* Voter Cards by Degree */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                {dashboardData?.voterStats &&
                  Object.entries(dashboardData.voterStats).map(([degreeKey, stats]) => {
                    const cardInfo = getDegreeCardInfo(degreeKey)
                    return (
                      <div
                        key={degreeKey}
                        onClick={() => handleDegreeCardClick(degreeKey)}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${getDegreeCardColor(degreeKey)} hover:scale-105`}
                      >
                        <div className="text-center">
                          <h3 className="text-lg font-bold">{cardInfo.title}</h3>
                          <p className="text-2xl font-bold mt-2">
                            {stats.registered}/{stats.total}
                          </p>
                          <p className="text-xs opacity-75 mt-1">Registered/Total</p>
                        </div>
                      </div>
                    )
                  })}
              </div>

              {/* Election Tabs - Centered */}
              <div className="mb-6 flex justify-center">
                <div className="flex space-x-1 bg-white/50 p-1 rounded-lg">
                  <button
                    onClick={() => setActiveTab("ssg")}
                    className={`px-6 py-3 rounded-md transition-colors ${
                      activeTab === "ssg" ? "bg-white text-purple-600 shadow-sm" : "text-gray-600 hover:text-gray-800"
                    }`}
                  >
                    SSG Election
                  </button>
                  <button
                    onClick={() => setActiveTab("departmental")}
                    className={`px-6 py-3 rounded-md transition-colors ${
                      activeTab === "departmental"
                        ? "bg-white text-purple-600 shadow-sm"
                        : "text-gray-600 hover:text-gray-800"
                    }`}
                  >
                    Departmental Election
                  </button>
                </div>
              </div>

              {/* Elections Grid - Centered and Elongated */}
              <div className="flex justify-center">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl">
                  {/* Add Election Card */}
                  <div
                    onClick={() => setShowAddElection(true)}
                    className="bg-white/80 backdrop-blur-sm rounded-lg border-2 border-dashed border-purple-300 p-8 cursor-pointer hover:border-purple-500 hover:bg-purple-50/50 transition-all duration-200 flex flex-col items-center justify-center min-h-[350px] w-[250px]"
                  >
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-6">
                      <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-purple-600 text-center">Add New Election</h3>
                    <p className="text-sm text-purple-500 text-center mt-2">Create a new election</p>
                  </div>

                  {/* Election Cards */}
                  {filteredElections.map((election) => (
                    <div
                      key={election._id}
                      onClick={() => handleElectionClick(election)}
                      className="bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-lg p-8 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 min-h-[350px] w-[250px] flex flex-col justify-center items-center"
                    >
                      <h3 className="text-4xl font-bold mb-4">{election.electionYear}</h3>
                      <p className="text-center text-blue-100 mb-4 px-4">{election.title}</p>
                      <div className="mt-auto flex flex-col items-center space-y-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            election.status === "active"
                              ? "bg-green-500 text-white"
                              : election.status === "upcoming"
                                ? "bg-yellow-500 text-white"
                                : "bg-gray-500 text-white"
                          }`}
                        >
                          {election.status.toUpperCase()}
                        </span>
                        <p className="text-xs text-blue-100">{new Date(election.electionDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Degree-specific voter table would go here */}
          {selectedDegree && (
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">{getDegreeCardInfo(selectedDegree).title} Voters</h2>
              <p className="text-gray-600">Voter management table would be displayed here...</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Election Modal */}
      {showAddElection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Election</h3>
            <form onSubmit={handleAddElection} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Election ID</label>
                <input
                  type="text"
                  name="electionId"
                  value={electionForm.electionId}
                  onChange={handleElectionFormChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  placeholder="e.g., ELEC2024001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Election Year</label>
                <input
                  type="number"
                  name="electionYear"
                  value={electionForm.electionYear}
                  onChange={handleElectionFormChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Election Title</label>
                <input
                  type="text"
                  name="title"
                  value={electionForm.title}
                  onChange={handleElectionFormChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  placeholder="e.g., Student Government Election 2024"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Election Type</label>
                <select
                  name="electionType"
                  value={electionForm.electionType}
                  onChange={handleElectionFormChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="ssg">SSG Election</option>
                  <option value="departmental">Departmental Election</option>
                </select>
              </div>
              {electionForm.electionType === "departmental" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Department</label>
                  <input
                    type="text"
                    name="department"
                    value={electionForm.department}
                    onChange={handleElectionFormChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    placeholder="e.g., College of Computer Studies"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  name="status"
                  value={electionForm.status}
                  onChange={handleElectionFormChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Election Date</label>
                <input
                  type="date"
                  name="electionDate"
                  value={electionForm.electionDate}
                  onChange={handleElectionFormChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ballot Open Time</label>
                  <input
                    type="time"
                    name="ballotOpenTime"
                    value={electionForm.ballotOpenTime}
                    onChange={handleElectionFormChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ballot Close Time</label>
                  <input
                    type="time"
                    name="ballotCloseTime"
                    value={electionForm.ballotCloseTime}
                    onChange={handleElectionFormChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddElection(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors"
                >
                  Create Election
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
