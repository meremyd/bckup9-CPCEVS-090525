"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, Search, Plus, Edit, Trash2 } from "lucide-react"
import Swal from 'sweetalert2'
import { votersAPI } from '@/lib/api/voters'
import { degreesAPI } from '@/lib/api/degrees'

export default function VotersPage() {
  const [voters, setVoters] = useState([])
  const [degrees, setDegrees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingVoter, setEditingVoter] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDegree, setSelectedDegree] = useState("")
  const [degreeStats, setDegreeStats] = useState({})

  // SweetAlert function
  const showAlert = (type, title, text) => {
    Swal.fire({
      icon: type,
      title: title,
      text: text,
      confirmButtonColor: "#3B82F6",
    })
  }

  const showConfirm = (title, text, confirmText = "Yes, delete it!") => {
    return Swal.fire({
      title: title,
      text: text,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#6B7280",
      confirmButtonText: confirmText,
    }).then((result) => result.isConfirmed)
  }

  // Form state
  const [formData, setFormData] = useState({
    schoolId: "",
    firstName: "",
    middleName: "",
    lastName: "",
    birthdate: "",
    degreeId: "",
    email: "",
  })

  useEffect(() => {
    fetchVoters()
    fetchDegrees()

    // Load SweetAlert2 CDN
    if (typeof window !== "undefined" && !window.Swal) {
      const script = document.createElement("script")
      script.src = "https://cdn.jsdelivr.net/npm/sweetalert2@11"
      document.head.appendChild(script)
    }
  }, [])

  useEffect(() => {
    calculateDegreeStats()
  }, [voters])

  const fetchVoters = async () => {
    try {
      const data = await votersAPI.getAll()
      console.log("Fetched voters:", data) // Debug log
      // Handle both array and object responses
      if (Array.isArray(data)) {
        setVoters(data)
      } else if (data.voters && Array.isArray(data.voters)) {
        setVoters(data.voters)
      } else {
        console.error("Unexpected data format:", data)
        setVoters([])
      }
    } catch (error) {
      console.error("Fetch voters error:", error)
      setError(error.message || "Network error")
    } finally {
      setLoading(false)
    }
  }

  const fetchDegrees = async () => {
    try {
      const data = await degreesAPI.getAll()
      console.log("Fetched degrees:", data) // Debug log
      // Handle both array and object responses
      if (Array.isArray(data)) {
        setDegrees(data)
      } else if (data.degrees && Array.isArray(data.degrees)) {
        setDegrees(data.degrees)
      } else {
        console.error("Unexpected degrees data format:", data)
        setDegrees([])
      }
    } catch (error) {
      console.error("Fetch degrees error:", error)
      setDegrees([])
    }
  }

  const calculateDegreeStats = () => {
    const stats = {}

    // Ensure voters is an array before processing
    if (!Array.isArray(voters)) {
      console.error("Voters is not an array:", voters)
      setDegreeStats({})
      return
    }

    // Debug: Log all voters and their degree info
    console.log("Calculating stats for voters:", voters.length)
    voters.forEach((voter, index) => {
      console.log(`Voter ${index + 1}:`, {
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
          console.log(`BEED check for voter ${voter.schoolId}:`, match, voter.degreeId?.degreeCode)
          return match
        },
      },
      {
        key: "BSED-English",
        filter: (voter) => {
          const match = voter.degreeId?.degreeCode === "BSED" && voter.degreeId?.major === "English"
          console.log(`BSED-English check for voter ${voter.schoolId}:`, match, {
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
          console.log(`BSED-Science check for voter ${voter.schoolId}:`, match, {
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
          console.log(`BSIT check for voter ${voter.schoolId}:`, match, voter.degreeId?.degreeCode)
          return match
        },
      },
      {
        key: "BSHM",
        filter: (voter) => {
          const match = voter.degreeId?.degreeCode === "BSHM"
          console.log(`BSHM check for voter ${voter.schoolId}:`, match, voter.degreeId?.degreeCode)
          return match
        },
      },
    ]

    degreeCategories.forEach(({ key, filter }) => {
      const count = voters.filter(filter).length
      stats[key] = count
      console.log(`${key} count:`, count)
    })

    console.log("Final degree stats:", stats)
    setDegreeStats(stats)
  }

  const resetForm = () => {
    setFormData({
      schoolId: "",
      firstName: "",
      middleName: "",
      lastName: "",
      birthdate: "",
      degreeId: "",
      email: "",
    })
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleAddVoter = async (e) => {
    e.preventDefault()
    try {
      const newVoter = await votersAPI.create(formData)
      setVoters([...voters, newVoter])
      setShowAddModal(false)
      resetForm()
      showAlert("success", "Success!", "Voter added successfully")
    } catch (error) {
      console.error("Add voter error:", error)
      showAlert("error", "Error!", error.message || "Failed to add voter")
    }
  }

  const handleEditVoter = async (e) => {
    e.preventDefault()
    try {
      const updatedVoter = await votersAPI.update(editingVoter._id, formData)
      setVoters(voters.map((voter) => (voter._id === editingVoter._id ? updatedVoter : voter)))
      setShowEditModal(false)
      setEditingVoter(null)
      resetForm()
      showAlert("success", "Success!", "Voter updated successfully")
    } catch (error) {
      console.error("Update voter error:", error)
      showAlert("error", "Error!", error.message || "Failed to update voter")
    }
  }

  const handleEdit = (voter) => {
    setEditingVoter(voter)
    setFormData({
      schoolId: voter.schoolId,
      firstName: voter.firstName,
      middleName: voter.middleName || "",
      lastName: voter.lastName,
      birthdate: voter.birthdate ? voter.birthdate.split("T")[0] : "",
      degreeId: voter.degreeId?._id || "",
      email: voter.email || "",
    })
    setShowEditModal(true)
  }

  const handleDelete = async (voterId) => {
    const confirmed = await showConfirm("Are you sure?", "You won't be able to revert this!", "Yes, delete it!")
    
    if (!confirmed) return

    try {
      await votersAPI.delete(voterId)
      setVoters(voters.filter((voter) => voter._id !== voterId))
      showAlert("success", "Deleted!", "Voter has been deleted successfully")
    } catch (error) {
      console.error("Delete voter error:", error)
      showAlert("error", "Error!", error.message || "Failed to delete voter")
    }
  }

  const handleDegreeCardClick = (degreeKey) => {
    setSelectedDegree(selectedDegree === degreeKey ? "" : degreeKey)
  }

  const handleBackToAll = () => {
    setSelectedDegree("")
    setSearchTerm("")
  }

  const filteredVoters = Array.isArray(voters) ? voters.filter((voter) => {
    const matchesSearch =
      (voter.schoolId || "").toString().includes(searchTerm) ||
      `${voter.firstName || ""} ${voter.middleName || ""} ${voter.lastName || ""}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (voter.degreeId?.degreeName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (voter.degreeId?.department || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (voter.email || "").toLowerCase().includes(searchTerm.toLowerCase())

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
  }) : []

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading voters...</p>
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
            className="flex items-center px-4 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to All Voters
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
                  ? getDegreeCardColor(degreeKey) + " ring-2 ring-offset-2 ring-blue-500"
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
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <input
                type="text"
                placeholder="Search voters by ID, name, degree, department, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>
          <button
            onClick={() => {
              resetForm()
              setShowAddModal(true)
            }}
            className="ml-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Voter
          </button>
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
                  Email
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
                  Registration Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created At
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{voter.email || "-"}</td>
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
                    {voter.isRegistered ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Registered
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Not Registered
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(voter.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEdit(voter)}
                      className="text-green-600 hover:text-green-900 mr-3 px-3 py-1 rounded hover:bg-green-50 transition-colors flex items-center"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(voter._id)}
                      className="text-red-600 hover:text-red-900 px-3 py-1 rounded hover:bg-red-50 transition-colors flex items-center"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Voter Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Voter</h3>
            <form onSubmit={handleAddVoter} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">School ID</label>
                <input
                  type="number"
                  name="schoolId"
                  value={formData.schoolId}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter school ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter first name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Middle Name</label>
                <input
                  type="text"
                  name="middleName"
                  value={formData.middleName}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter middle name (optional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter last name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Birthdate</label>
                <input
                  type="date"
                  name="birthdate"
                  value={formData.birthdate}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Degree</label>
                <select
                  name="degreeId"
                  value={formData.degreeId}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a degree</option>
                  {degrees.map((degree) => (
                    <option key={degree._id} value={degree._id}>
                      {degree.degreeCode} - {degree.degreeName}
                      {degree.major && ` (Major in ${degree.major})`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    resetForm()
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                >
                  Add Voter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Voter Modal */}
      {showEditModal && editingVoter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Voter</h3>
            <form onSubmit={handleEditVoter} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">School ID</label>
                <input
                  type="number"
                  name="schoolId"
                  value={formData.schoolId}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Middle Name</label>
                <input
                  type="text"
                  name="middleName"
                  value={formData.middleName}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Birthdate</label>
                <input
                  type="date"
                  name="birthdate"
                  value={formData.birthdate}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Degree</label>
                <select
                  name="degreeId"
                  value={formData.degreeId}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a degree</option>
                  {degrees.map((degree) => (
                    <option key={degree._id} value={degree._id}>
                      {degree.degreeCode} - {degree.degreeName}
                      {degree.major && ` (Major in ${degree.major})`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingVoter(null)
                    resetForm()
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                >
                  Update Voter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}