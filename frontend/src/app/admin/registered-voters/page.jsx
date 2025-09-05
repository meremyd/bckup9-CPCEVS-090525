"use client"

import { useState, useEffect } from "react"

export default function RegisteredVotersPage() {
  const [voters, setVoters] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDegree, setSelectedDegree] = useState("")
  const [degreeStats, setDegreeStats] = useState({})
  const [editingVoter, setEditingVoter] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)

  useEffect(() => {
    fetchRegisteredVoters()
  }, [])

  useEffect(() => {
    calculateDegreeStats()
  }, [voters])

  const fetchRegisteredVoters = async () => {
    try {
      const token = localStorage.getItem("token")
      // Updated API endpoint to use new voter controller
      const response = await fetch("http://localhost:5000/api/voters/registered", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        setVoters(data)
      } else {
        setError("Failed to fetch registered voters")
      }
    } catch (error) {
      console.error("Fetch registered voters error:", error)
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  const calculateDegreeStats = () => {
    const stats = {}

    // Debug: Log all voters and their degree info
    console.log("Calculating stats for registered voters:", voters.length)
    voters.forEach((voter, index) => {
      console.log(`Registered Voter ${index + 1}:`, {
        id: voter._id,
        schoolId: voter.schoolId,
        name: `${voter.firstName} ${voter.lastName}`,
        degreeCode: voter.degreeId?.degreeCode,
        major: voter.degreeId?.major,
        degreeName: voter.degreeId?.degreeName,
      })
    })

    // Define degree categories including separate BSED majors
    const degreeCategories = [
      {
        key: "BEED",
        filter: (voter) => {
          const match = voter.degreeId?.degreeCode === "BEED"
          console.log(`BEED check for registered voter ${voter.schoolId}:`, match, voter.degreeId?.degreeCode)
          return match
        },
      },
      {
        key: "BSED-English",
        filter: (voter) => {
          const match = voter.degreeId?.degreeCode === "BSED" && voter.degreeId?.major === "English"
          console.log(`BSED-English check for registered voter ${voter.schoolId}:`, match, {
            code: voter.degreeId?.degreeCode,
            major: voter.degreeId?.major,
          })
          return match
        },
      },
      {
        key: "BSED-Science",
        filter: (voter) => {
          const match = voter.degreeId?.degreeCode === "BSED" && voter.degreeId?.major === "Science"
          console.log(`BSED-Science check for registered voter ${voter.schoolId}:`, match, {
            code: voter.degreeId?.degreeCode,
            major: voter.degreeId?.major,
          })
          return match
        },
      },
      {
        key: "BSIT",
        filter: (voter) => {
          const match = voter.degreeId?.degreeCode === "BSIT"
          console.log(`BSIT check for registered voter ${voter.schoolId}:`, match, voter.degreeId?.degreeCode)
          return match
        },
      },
      {
        key: "BSHM",
        filter: (voter) => {
          const match = voter.degreeId?.degreeCode === "BSHM"
          console.log(`BSHM check for registered voter ${voter.schoolId}:`, match, voter.degreeId?.degreeCode)
          return match
        },
      },
    ]

    degreeCategories.forEach(({ key, filter }) => {
      const count = voters.filter(filter).length
      stats[key] = count
      console.log(`Registered ${key} count:`, count)
    })

    console.log("Final registered degree stats:", stats)
    setDegreeStats(stats)
  }

  const handleDegreeCardClick = (degreeKey) => {
    setSelectedDegree(selectedDegree === degreeKey ? "" : degreeKey)
  }

  const handleBackToAll = () => {
    setSelectedDegree("")
    setSearchTerm("")
  }

  const handleDeactivate = async (voterId) => {
    if (!confirm("Are you sure you want to deactivate this voter?")) {
      return
    }

    try {
      const token = localStorage.getItem("token")
      // Updated API endpoint to use new voter controller
      const response = await fetch(`http://localhost:5000/api/voters/${voterId}/deactivate`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        fetchRegisteredVoters()
        alert("Voter deactivated successfully")
      } else {
        alert("Failed to deactivate voter")
      }
    } catch (error) {
      console.error("Deactivate voter error:", error)
      alert("Network error")
    }
  }

  const handleEdit = (voter) => {
    setEditingVoter(voter)
    setShowEditModal(true)
  }

  const filteredVoters = voters.filter((voter) => {
    const matchesSearch =
      voter.schoolId.toString().includes(searchTerm) ||
      `${voter.firstName} ${voter.middleName} ${voter.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      voter.degreeId?.degreeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      voter.degreeId?.department?.toLowerCase().includes(searchTerm.toLowerCase())

    let matchesDegree = true
    if (selectedDegree) {
      switch (selectedDegree) {
        case "BEED":
          matchesDegree = voter.degreeId?.degreeCode === "BEED"
          break
        case "BSED-English":
          matchesDegree = voter.degreeId?.degreeCode === "BSED" && voter.degreeId?.major === "English"
          break
        case "BSED-Science":
          matchesDegree = voter.degreeId?.degreeCode === "BSED" && voter.degreeId?.major === "Science"
          break
        case "BSIT":
          matchesDegree = voter.degreeId?.degreeCode === "BSIT"
          break
        case "BSHM":
          matchesDegree = voter.degreeId?.degreeCode === "BSHM"
          break
        default:
          matchesDegree = true
      }
    }

    return matchesSearch && matchesDegree
  })

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

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading registered voters...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      {selectedDegree && (
        <div className="flex items-center">
          <button
            onClick={handleBackToAll}
            className="flex items-center px-4 py-2 text-sm text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to All Registered Voters
          </button>
        </div>
      )}

      {/* Degree Cards - Now 5 cards including separate BSED majors */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {["BEED", "BSED-English", "BSED-Science", "BSIT", "BSHM"].map((degreeKey) => {
          const cardInfo = getDegreeCardInfo(degreeKey)
          return (
            <div
              key={degreeKey}
              onClick={() => handleDegreeCardClick(degreeKey)}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                selectedDegree === degreeKey
                  ? getDegreeCardColor(degreeKey) + " ring-2 ring-offset-2 ring-green-500"
                  : getDegreeCardColor(degreeKey) + " hover:scale-105"
              }`}
            >
              <div className="text-center">
                <h3 className="text-lg font-bold">{cardInfo.title}</h3>
                <p className="text-2xl font-bold mt-2">{degreeStats[degreeKey] || 0}</p>
                <p className="text-xs opacity-75 mt-1">{cardInfo.subtitle}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <input
                type="text"
                placeholder="Search registered voters by ID, name, degree, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <svg
                className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Voter ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  School ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  First Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Middle Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Birthdate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Degree
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Registration Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredVoters.map((voter) => (
                <tr key={voter._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                      {voter._id.slice(-6).toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{voter.schoolId}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{voter.firstName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{voter.middleName || "-"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{voter.lastName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {voter.birthdate ? new Date(voter.birthdate).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {voter.degreeId?.degreeName || "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {voter.degreeId?.department || "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(voter.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEdit(voter)}
                      className="text-indigo-600 hover:text-indigo-900 mr-3 px-3 py-1 rounded hover:bg-indigo-50 transition-colors"
                    >
                      Edit Profile
                    </button>
                    <button
                      onClick={() => handleDeactivate(voter._id)}
                      className="text-red-600 hover:text-red-900 px-3 py-1 rounded hover:bg-red-50 transition-colors"
                    >
                      Deactivate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && editingVoter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Voter Profile</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Voter ID</label>
                  <p className="mt-1 text-sm text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded">
                    {editingVoter._id.slice(-6).toUpperCase()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">School ID</label>
                  <p className="mt-1 text-sm text-gray-900">{editingVoter.schoolId}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <p className="mt-1 text-sm text-gray-900">
                  {editingVoter.firstName} {editingVoter.middleName} {editingVoter.lastName}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Degree</label>
                  <p className="mt-1 text-sm text-gray-900">{editingVoter.degreeId?.degreeName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Department</label>
                  <p className="mt-1 text-sm text-gray-900">{editingVoter.degreeId?.department}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Registration Status</label>
                <span className="mt-1 inline-flex px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Registered
                </span>
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-6">
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingVoter(null)
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Close

              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
