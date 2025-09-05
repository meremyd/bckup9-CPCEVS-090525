"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function DepartmentalStatusPage() {
  const [electionStatus, setElectionStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchElectionStatus()
  }, [])

  const fetchElectionStatus = async () => {
    try {
      // Mock data for now
      setTimeout(() => {
        setElectionStatus({
          electionId: "DEPT2024001",
          electionYear: 2024,
          title: "College of Computer Studies Election 2024",
          electionType: "departmental",
          department: "College of Computer Studies",
          status: "upcoming",
          electionDate: "2024-04-15",
          ballotOpenTime: "09:00",
          ballotCloseTime: "16:00",
          createdBy: "committee1",
          createdAt: "2024-02-15T14:00:00Z",
        })
        setLoading(false)
      }, 1000)
    } catch (error) {
      console.error("Fetch election status error:", error)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading election status...</p>
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
          <h1 className="text-3xl font-bold text-gray-800 mt-2">Departmental Election Status</h1>
          <p className="text-gray-600">Current departmental election configuration and status</p>
        </div>

        {electionStatus && (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Election ID</label>
                  <p className="text-lg font-semibold text-gray-900 bg-gray-50 px-4 py-2 rounded-lg">
                    {electionStatus.electionId}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Election Year</label>
                  <p className="text-lg font-semibold text-gray-900 bg-gray-50 px-4 py-2 rounded-lg">
                    {electionStatus.electionYear}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                  <p className="text-lg font-semibold text-gray-900 bg-gray-50 px-4 py-2 rounded-lg">
                    {electionStatus.title}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Election Type</label>
                  <p className="text-lg font-semibold text-gray-900 bg-gray-50 px-4 py-2 rounded-lg capitalize">
                    {electionStatus.electionType}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                  <p className="text-lg font-semibold text-gray-900 bg-gray-50 px-4 py-2 rounded-lg">
                    {electionStatus.department}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <span
                    className={`px-4 py-2 rounded-lg font-semibold ${
                      electionStatus.status === "active"
                        ? "bg-green-100 text-green-800"
                        : electionStatus.status === "upcoming"
                          ? "bg-yellow-100 text-yellow-800"
                          : electionStatus.status === "completed"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-red-100 text-red-800"
                    }`}
                  >
                    {electionStatus.status.toUpperCase()}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Election Date</label>
                  <p className="text-lg font-semibold text-gray-900 bg-gray-50 px-4 py-2 rounded-lg">
                    {new Date(electionStatus.electionDate).toLocaleDateString()}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Open Time</label>
                    <p className="text-lg font-semibold text-gray-900 bg-gray-50 px-4 py-2 rounded-lg">
                      {electionStatus.ballotOpenTime}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Close Time</label>
                    <p className="text-lg font-semibold text-gray-900 bg-gray-50 px-4 py-2 rounded-lg">
                      {electionStatus.ballotCloseTime}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Created By</label>
                  <p className="text-lg font-semibold text-gray-900 bg-gray-50 px-4 py-2 rounded-lg">
                    {electionStatus.createdBy}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Created At</label>
                  <p className="text-lg font-semibold text-gray-900 bg-gray-50 px-4 py-2 rounded-lg">
                    {new Date(electionStatus.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
