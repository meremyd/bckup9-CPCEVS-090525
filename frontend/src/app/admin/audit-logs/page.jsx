"use client"

import { useState, useEffect } from "react"
import Swal from 'sweetalert2'
import { auditLogsAPI } from '@/lib/api/auditLogs'

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedAction, setSelectedAction] = useState("")
  const [dateFilter, setDateFilter] = useState("")

  // SweetAlert function
  const showAlert = (type, title, text) => {
    Swal.fire({
      icon: type,
      title: title,
      text: text,
      confirmButtonColor: "#8B5CF6",
    })
  }

  // Fetch function with auth

  useEffect(() => {
    fetchAuditLogs()
  }, [])

  const fetchAuditLogs = async () => {
    try {
      const data = await auditLogsAPI.getAll()
      // Handle both array and object responses
      if (Array.isArray(data)) {
        setLogs(data)
      } else if (data.logs && Array.isArray(data.logs)) {
        setLogs(data.logs)
      } else {
        console.error("Unexpected data format:", data)
        setLogs([])
      }
    } catch (error) {
      console.error("Fetch audit logs error:", error)
      const errorMessage = error.message || "Network error"
      setError(errorMessage)
      showAlert("error", "Error!", `Failed to fetch audit logs: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = Array.isArray(logs) ? logs.filter((log) => {
    const matchesSearch =
      (log.user || log.username || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.action || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.details || log.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.ipAddress || log.ip || "").includes(searchTerm)

    const matchesAction = selectedAction === "" || log.action === selectedAction
    const matchesDate =
      dateFilter === "" || 
      (log.date && new Date(log.date).toDateString() === new Date(dateFilter).toDateString()) ||
      (log.createdAt && new Date(log.createdAt).toDateString() === new Date(dateFilter).toDateString()) ||
      (log.timestamp && new Date(log.timestamp).toDateString() === new Date(dateFilter).toDateString())

    return matchesSearch && matchesAction && matchesDate
  }) : []

  const getActionColor = (action) => {
    switch (action) {
      case "LOGIN":
        return "bg-blue-100 text-blue-800"
      case "LOGOUT":
        return "bg-gray-100 text-gray-800"
      case "CREATE_VOTER":
        return "bg-green-100 text-green-800"
      case "UPDATE_VOTER":
        return "bg-yellow-100 text-yellow-800"
      case "DELETE_VOTER":
        return "bg-red-100 text-red-800"
      case "CREATE_USER":
        return "bg-purple-100 text-purple-800"
      case "UPDATE_USER":
        return "bg-indigo-100 text-indigo-800"
      case "DELETE_USER":
        return "bg-red-100 text-red-800"
      case "VOTER_REGISTRATION":
        return "bg-emerald-100 text-emerald-800"
      case "SYSTEM_ACCESS":
        return "bg-cyan-100 text-cyan-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const uniqueActions = Array.isArray(logs) ? [...new Set(logs.map((log) => log.action).filter(Boolean))] : []

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading audit logs...</p>
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
      <div className="bg-white rounded-lg shadow">
        {/* Filters */}
        <div className="px-6 py-4 border-b">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by user, action, details, or IP address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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

            {/* Action Filter */}
            <div className="min-w-[200px]">
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">All Actions</option>
                {uniqueActions.map((action) => (
                  <option key={action} value={action}>
                    {action.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Filter */}
            <div className="min-w-[150px]">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            {/* Clear Filters */}
            <button
              onClick={() => {
                setSearchTerm("")
                setSelectedAction("")
                setDateFilter("")
              }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.map((log) => (
                <tr key={log._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                      {(log.action || "").replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.user || log.username || "Unknown"}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{log.details || log.description || "No details"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.ipAddress || log.ip || "Unknown"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.date ? new Date(log.date).toLocaleString() : 
                     log.createdAt ? new Date(log.createdAt).toLocaleString() : 
                     log.timestamp ? new Date(log.timestamp).toLocaleString() : "Unknown"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredLogs.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No audit logs found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  )
}