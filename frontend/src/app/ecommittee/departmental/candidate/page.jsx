"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function DepartmentalCandidatesPage() {
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const router = useRouter()

  useEffect(() => {
    fetchCandidates()
  }, [])

  const fetchCandidates = async () => {
    try {
      const token = localStorage.getItem("token")
      // Mock data for now
      setTimeout(() => {
        setCandidates([
          {
            _id: "1",
            candidateNumber: 1,
            name: "Alice Johnson",
            position: "Department President",
            department: "College of Computer Studies",
            platform: "Innovation and Technology",
            votes: 89,
          },
          {
            _id: "2",
            candidateNumber: 2,
            name: "Bob Wilson",
            position: "Department Vice President",
            department: "College of Education",
            platform: "Educational Excellence",
            votes: 76,
          },
        ])
        setLoading(false)
      }, 1000)
    } catch (error) {
      console.error("Fetch candidates error:", error)
      setError("Network error")
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading candidates...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100">
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={() => router.back()}
              className="flex items-center px-4 py-2 text-sm text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold text-gray-800 mt-2">Departmental Election Candidates</h1>
            <p className="text-gray-600">Manage candidates for departmental elections</p>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-purple-600 text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium uppercase tracking-wider">#</th>
                  <th className="px-6 py-4 text-left text-sm font-medium uppercase tracking-wider">Candidate</th>
                  <th className="px-6 py-4 text-left text-sm font-medium uppercase tracking-wider">Position</th>
                  <th className="px-6 py-4 text-left text-sm font-medium uppercase tracking-wider">Department</th>
                  <th className="px-6 py-4 text-left text-sm font-medium uppercase tracking-wider">Platform</th>
                  <th className="px-6 py-4 text-left text-sm font-medium uppercase tracking-wider">Votes</th>
                  <th className="px-6 py-4 text-left text-sm font-medium uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {candidates.map((candidate) => (
                  <tr key={candidate._id} className="hover:bg-purple-50/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {candidate.candidateNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-purple-200 flex items-center justify-center">
                            <span className="text-sm font-medium text-purple-600">
                              {candidate.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{candidate.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{candidate.position}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{candidate.department}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{candidate.platform}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{candidate.votes}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-purple-600 hover:text-purple-900 mr-3">View</button>
                      <button className="text-green-600 hover:text-green-900 mr-3">Edit</button>
                      <button className="text-red-600 hover:text-red-900">Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
