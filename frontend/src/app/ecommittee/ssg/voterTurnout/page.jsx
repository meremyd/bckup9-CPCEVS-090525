"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function SSGVoterTurnoutPage() {
  const [turnoutData, setTurnoutData] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchTurnoutData()
  }, [])

  const fetchTurnoutData = async () => {
    try {
      // Mock data for now
      setTimeout(() => {
        setTurnoutData({
          totalRegisteredVoters: 500,
          votersWhoVoted: 390,
          votersWhoDidntVote: 110,
          turnoutPercentage: 78,
          degreeBreakdown: [
            { degree: "BEED", total: 120, voted: 95, percentage: 79 },
            { degree: "BSED (English)", total: 80, voted: 62, percentage: 78 },
            { degree: "BSED (Science)", total: 85, voted: 66, percentage: 78 },
            { degree: "BSIT", total: 150, voted: 115, percentage: 77 },
            { degree: "BSHM", total: 65, voted: 52, percentage: 80 },
          ],
        })
        setLoading(false)
      }, 1000)
    } catch (error) {
      console.error("Fetch turnout data error:", error)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading voter turnout data...</p>
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
          <h1 className="text-3xl font-bold text-gray-800 mt-2">SSG Election Voter Turnout</h1>
          <p className="text-gray-600">Monitor voter participation and turnout rates</p>
        </div>

        {/* Overall Turnout Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-6 shadow-lg">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Total Registered</h3>
              <p className="text-3xl font-bold">{turnoutData?.totalRegisteredVoters || 0}</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-6 shadow-lg">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Voters Who Voted</h3>
              <p className="text-3xl font-bold">{turnoutData?.votersWhoVoted || 0}</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl p-6 shadow-lg">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Didn't Vote</h3>
              <p className="text-3xl font-bold">{turnoutData?.votersWhoDidntVote || 0}</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-6 shadow-lg">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Turnout Rate</h3>
              <p className="text-3xl font-bold">{turnoutData?.turnoutPercentage || 0}%</p>
            </div>
          </div>
        </div>

        {/* Degree Breakdown */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Turnout by Degree Program</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-purple-600 text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium uppercase tracking-wider">Degree</th>
                  <th className="px-6 py-4 text-left text-sm font-medium uppercase tracking-wider">Total Registered</th>
                  <th className="px-6 py-4 text-left text-sm font-medium uppercase tracking-wider">Voted</th>
                  <th className="px-6 py-4 text-left text-sm font-medium uppercase tracking-wider">Didn't Vote</th>
                  <th className="px-6 py-4 text-left text-sm font-medium uppercase tracking-wider">Turnout %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {turnoutData?.degreeBreakdown?.map((degree, index) => (
                  <tr key={index} className="hover:bg-purple-50/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{degree.degree}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{degree.total}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">{degree.voted}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                      {degree.total - degree.voted}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          degree.percentage >= 80
                            ? "bg-green-100 text-green-800"
                            : degree.percentage >= 70
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                        }`}
                      >
                        {degree.percentage}%
                      </span>
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
