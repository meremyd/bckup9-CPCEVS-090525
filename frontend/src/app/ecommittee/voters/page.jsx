"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function ElectionCommitteeVotersPage() {
  const [voters, setVoters] = useState([])
  const [voterStatuses, setVoterStatuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDegree, setSelectedDegree] = useState("")
  const [activeTab, setActiveTab] = useState("voters")
  const router = useRouter()

  useEffect(() => {
    fetchVoters()
    fetchVoterStatuses()
  }, [])

  const fetchVoters = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("http://localhost:5000/api/voters", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        setVoters(data)
      } else {
        setError("Failed to fetch voters")
      }
    } catch (error) {
      console.error("Fetch voters error:", error)
      setError("Network error")
    }
  }

  const fetchVoterStatuses = async () => {
    try {
      const token = localStorage.getItem("token")
      // Mock voter statuses for now
      setTimeout(() => {
        setVoterStatuses([
          {
            _id: "1",
            voterId: "voter1",
            schoolId: 2021001,
            firstName: "John",
            lastName: "Doe",
            isActive: true,
            isRegistered: true,
            isClassOfficer: false,
            degreeCode: "BSIT",
            voterDepartment: "College of Computer Studies",
          },
          {
            _id: "2",
            voterId: "voter2",
            schoolId: 2021002,
            firstName: "Jane",
            lastName: "Smith",
            isActive: true,
            isRegistered: false,
            isClassOfficer: true,
            degreeCode: "BSED",
            voterDepartment: "College of Education",
          },
        ])
        setLoading(false)
      }, 1000)
    } catch (error) {
      console.error("Fetch voter statuses error:", error)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading voters...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center px-4 py-2 text-sm text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-800 mt-2">Voter Management</h1>
          <p className="text-gray-600">View and manage voter information and status</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex justify-center">
          <div className="flex space-x-1 bg-white/50 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab("voters")}
              className={`px-6 py-3 rounded-md transition-colors ${
                activeTab === "voters" ? "bg-white text-purple-600 shadow-sm" : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Voters Table
            </button>
            <button
              onClick={() => setActiveTab("status")}
              className={`px-6 py-3 rounded-md transition-colors ${
                activeTab === "status" ? "bg-white text-purple-600 shadow-sm" : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Status Table
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6 max-w-md mx-auto">
          <div className="relative">
            <input
              type="text"
              placeholder="Search voters..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/80"
            />
            <svg
              className="absolute left-3 top-3.5 h-5 w-5 text-gray-400"
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

        {/* Voters Table */}
        {activeTab === "voters" && (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-purple-600 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium uppercase tracking-wider">School ID</th>
                    <th className="px-6 py-4 text-left text-sm font-medium uppercase tracking-wider">Name</th>
                    <th className="px-6 py-4 text-left text-sm font-medium uppercase tracking-wider">Degree</th>
                    <th className="px-6 py-4 text-left text-sm font-medium uppercase tracking-wider">Department</th>
                    <th className="px-6 py-4 text-left text-sm font-medium uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-medium uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {voters
                    .filter(
                      (voter) =>
                        voter.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        voter.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        voter.schoolId.toString().includes(searchTerm),
                    )
                    .map((voter) => (
                      <tr key={voter._id} className="hover:bg-purple-50/50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {voter.schoolId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {voter.firstName} {voter.middleName} {voter.lastName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {voter.degreeId?.degreeName || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {voter.degreeId?.department || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {voter.userId ? (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Registered
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Not Registered
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button className="text-purple-600 hover:text-purple-900">View Details</button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Status Table */}
        {activeTab === "status" && (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-purple-600 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium uppercase tracking-wider">School ID</th>
                    <th className="px-6 py-4 text-left text-sm font-medium uppercase tracking-wider">Name</th>
                    <th className="px-6 py-4 text-left text-sm font-medium uppercase tracking-wider">Active</th>
                    <th className="px-6 py-4 text-left text-sm font-medium uppercase tracking-wider">Registered</th>
                    <th className="px-6 py-4 text-left text-sm font-medium uppercase tracking-wider">Class Officer</th>
                    <th className="px-6 py-4 text-left text-sm font-medium uppercase tracking-wider">Degree</th>
                    <th className="px-6 py-4 text-left text-sm font-medium uppercase tracking-wider">Department</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {voterStatuses
                    .filter(
                      (status) =>
                        status.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        status.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        status.schoolId.toString().includes(searchTerm),
                    )
                    .map((status) => (
                      <tr key={status._id} className="hover:bg-purple-50/50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {status.schoolId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {status.firstName} {status.middleName} {status.lastName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              status.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                            }`}
                          >
                            {status.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              status.isRegistered ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {status.isRegistered ? "Registered" : "Not Registered"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              status.isClassOfficer ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {status.isClassOfficer ? "Yes" : "No"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{status.degreeCode}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{status.voterDepartment}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
