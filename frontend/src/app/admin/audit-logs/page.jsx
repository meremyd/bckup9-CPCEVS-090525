"use client"

import { useState, useEffect, useRef } from "react"
import { RotateCcw, Search, FileText, Loader2, Users, Activity } from "lucide-react"
import Swal from 'sweetalert2'
import { auditLogsAPI } from '@/lib/api/auditLogs'

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedAction, setSelectedAction] = useState("")
  const [dateFilter, setDateFilter] = useState("")
  const [totalVisits, setTotalVisits] = useState(0)
  const [activeUsers, setActiveUsers] = useState(0)
  const [loadingStats, setLoadingStats] = useState(true)
  const debounceTimeout = useRef(null)

  // All possible actions from AuditLog.js enum
  const ALL_ACTIONS = [
    "LOGIN", "LOGOUT", "PASSWORD_RESET_REQUEST", "PASSWORD_RESET_SUCCESS",
    "UNAUTHORIZED_ACCESS_ATTEMPT", "DATA_EXPORT", "DATA_IMPORT", "UPDATE_PASSWORD", "FORCE_LOGOUT",
    "CREATE_USER", "UPDATE_USER", "DELETE_USER", "ACTIVATE_USER", "DEACTIVATE_USER",
    "CREATE_VOTER", "UPDATE_VOTER", "DELETE_VOTER", "ACTIVATE_VOTER", "DEACTIVATE_VOTER", "VOTER_REGISTRATION",
    "CREATE_DEPARTMENT", "UPDATE_DEPARTMENT", "DELETE_DEPARTMENT",
    "SYSTEM_ACCESS", "CREATE_SSG_ELECTION", "UPDATE_SSG_ELECTION", "DELETE_SSG_ELECTION",
    "CREATE_DEPARTMENTAL_ELECTION", "UPDATE_DEPARTMENTAL_ELECTION", "DELETE_DEPARTMENTAL_ELECTION",
    "START_ELECTION", "END_ELECTION", "CANCEL_ELECTION",
    "CREATE_CANDIDATE", "UPDATE_CANDIDATE", "DELETE_CANDIDATE",
    "CREATE_POSITION", "UPDATE_POSITION", "DELETE_POSITION",
    "CREATE_PARTYLIST", "UPDATE_PARTYLIST", "DELETE_PARTYLIST",
    "VOTED", "VOTE_SUBMITTED", "BALLOT_ACCESSED", "BALLOT_STARTED", "BALLOT_ABANDONED", "BALLOT_EXPIRED_DELETED",
    "CHAT_SUPPORT_REQUEST", "CHAT_SUPPORT_RESPONSE", "CHAT_SUPPORT_STATUS_UPDATE",
    "FILE_UPLOAD", "FILE_DELETE", "PROFILE_ACCESS", "PROFILE_UPDATE",
    "PROFILE_PICTURE_UPDATE", "CAMPAIGN_PICTURE_UPDATE",
    "VOTER_PARTICIPATED_IN_SSG_ELECTION", "VOTER_PARTICIPATED_IN_DEPARTMENTAL_ELECTION"
  ]

  const showAlert = (type, title, text) => {
    Swal.fire({
      icon: type,
      title: title,
      text: text,
      confirmButtonColor: "#001f65",
    })
  }

  useEffect(() => {
    fetchAuditLogs()
    fetchStatistics()
    // eslint-disable-next-line
  }, [])

  // Debounced search/filter logic
  useEffect(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current)
    debounceTimeout.current = setTimeout(() => {
      fetchAuditLogs()
    }, 400)
    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current)
    }
    // eslint-disable-next-line
  }, [searchTerm, selectedAction, dateFilter])

  const fetchAuditLogs = async () => {
    try {
      setLoading(true)
      setError("")
      const params = {}
      if (searchTerm.trim()) params.username = searchTerm.trim()
      if (selectedAction) params.action = selectedAction
      if (dateFilter) params.startDate = dateFilter
      const response = await auditLogsAPI.getAll(params)
      if (response.success && Array.isArray(response.data)) {
        setLogs(response.data)
      } else if (Array.isArray(response.logs)) {
        setLogs(response.logs)
      } else if (Array.isArray(response)) {
        setLogs(response)
      } else {
        setLogs([])
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to fetch audit logs"
      setError(errorMessage)
      showAlert("error", "Error!", `Failed to fetch audit logs: ${errorMessage}`)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  const fetchStatistics = async () => {
    try {
      setLoadingStats(true)
      
      // Fetch total visits
      const visitsResponse = await auditLogsAPI.getTotalVisits()
      if (visitsResponse.success) {
        setTotalVisits(visitsResponse.data.totalVisits)
      }

      // Fetch active users
      const activeResponse = await auditLogsAPI.getActiveUsers()
      if (activeResponse.success) {
        setActiveUsers(activeResponse.data.activeUsers)
      }
    } catch (error) {
      console.error("Error fetching statistics:", error)
    } finally {
      setLoadingStats(false)
    }
  }

  const filteredLogs = Array.isArray(logs) ? logs : []

  const getActionColor = (action) => {
    const colors = {
      "LOGIN": "bg-blue-100 text-blue-800",
      "LOGOUT": "bg-gray-100 text-gray-800",
      "PASSWORD_RESET_REQUEST": "bg-yellow-100 text-yellow-800",
      "PASSWORD_RESET_SUCCESS": "bg-green-100 text-green-800",
      "UNAUTHORIZED_ACCESS_ATTEMPT": "bg-red-100 text-red-800",
      "FORCE_LOGOUT": "bg-red-100 text-red-800",
      "CREATE_USER": "bg-green-100 text-green-800",
      "UPDATE_USER": "bg-blue-100 text-blue-800",
      "DELETE_USER": "bg-red-100 text-red-800",
      "ACTIVATE_USER": "bg-green-100 text-green-800",
      "DEACTIVATE_USER": "bg-orange-100 text-orange-800",
      "CREATE_VOTER": "bg-emerald-100 text-emerald-800",
      "UPDATE_VOTER": "bg-blue-100 text-blue-800",
      "DELETE_VOTER": "bg-red-100 text-red-800",
      "ACTIVATE_VOTER": "bg-green-100 text-green-800",
      "DEACTIVATE_VOTER": "bg-orange-100 text-orange-800",
      "VOTER_REGISTRATION": "bg-purple-100 text-purple-800",
      "CREATE_ELECTION": "bg-indigo-100 text-indigo-800",
      "UPDATE_SSG_ELECTION": "bg-blue-100 text-blue-800",
      "DELETE_ELECTION": "bg-red-100 text-red-800",
      "START_ELECTION": "bg-green-100 text-green-800",
      "END_ELECTION": "bg-gray-100 text-gray-800",
      "CANCEL_ELECTION": "bg-red-100 text-red-800",
      "VOTED": "bg-green-100 text-green-800",
      "VOTE_SUBMITTED": "bg-emerald-100 text-emerald-800",
      "BALLOT_ACCESSED": "bg-cyan-100 text-cyan-800",
      "BALLOT_STARTED": "bg-blue-100 text-blue-800",
      "BALLOT_ABANDONED": "bg-yellow-100 text-yellow-800",
      "SYSTEM_ACCESS": "bg-cyan-100 text-cyan-800",
      "DATA_EXPORT": "bg-purple-100 text-purple-800",
      "DATA_IMPORT": "bg-purple-100 text-purple-800",
      "CHAT_SUPPORT_REQUEST": "bg-teal-100 text-teal-800",
      "CHAT_SUPPORT_RESPONSE": "bg-teal-100 text-teal-800",
      "CHAT_SUPPORT_STATUS_UPDATE": "bg-blue-100 text-blue-800",
      "FILE_UPLOAD": "bg-green-100 text-green-800",
      "FILE_DELETE": "bg-red-100 text-red-800",
      "PROFILE_PICTURE_UPDATE": "bg-blue-100 text-blue-800",
      "CAMPAIGN_PICTURE_UPDATE": "bg-blue-100 text-blue-800",
    }
    return colors[action] || "bg-gray-100 text-gray-800"
  }

  const formatActionName = (action) => {
    return action ? action.replace(/_/g, " ").toLowerCase()
      .split(" ")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ") : ""
  }

  const handleClearFilters = () => {
    setSearchTerm("")
    setSelectedAction("")
    setDateFilter("")
    setTimeout(() => fetchAuditLogs(), 100)
  }

  const handleRefresh = () => {
    fetchAuditLogs()
    fetchStatistics()
  }

  if (loading && loadingStats) {
    return (
      <div className="min-h-screen bg-transparent p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-[#001f65]" />
            <span className="ml-2 text-[#001f65]">Loading audit logs...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-transparent p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-[#001f65]/60">Total Visits</div>
                <div className="text-3xl font-bold text-[#001f65] mt-2">
                  {loadingStats ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : (
                    totalVisits.toLocaleString()
                  )}
                </div>
                <div className="text-xs text-[#001f65]/50 mt-1">All-time login count</div>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-[#001f65]/60">Active Users</div>
                <div className="text-3xl font-bold text-green-600 mt-2">
                  {loadingStats ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : (
                    activeUsers.toLocaleString()
                  )}
                </div>
                <div className="text-xs text-[#001f65]/50 mt-1">Active in last 15 minutes</div>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <Activity className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-gray-200/50 flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-lg font-semibold text-[#001f65]">Audit Logs</h1>
            <div className="mt-4 sm:mt-0 flex space-x-3">
              <button
                onClick={handleRefresh}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-[#001f65] bg-white hover:bg-[#e9f0fe] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#001f65]"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="p-6 border-b border-gray-200/50 bg-[#f3f7fe]">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="md:col-span-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by username..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001f65] focus:border-transparent"
                  />
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>
              {/* Action Filter */}
              <div>
                <select
                  value={selectedAction}
                  onChange={(e) => setSelectedAction(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#001f65] focus:border-transparent"
                >
                  <option value="">All Actions</option>
                  {ALL_ACTIONS.map((action) => (
                    <option key={action} value={action}>
                      {formatActionName(action)}
                    </option>
                  ))}
                </select>
              </div>
              {/* Date Filter */}
              <div>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#001f65] focus:border-transparent"
                />
              </div>
            </div>
            {/* Filter Actions */}
            <div className="mt-4 flex justify-between items-center">
              <div className="text-sm text-[#001f65]/70">
                Showing {filteredLogs.length} logs
              </div>
              <button
                onClick={handleClearFilters}
                className="text-sm text-[#001f65] hover:text-blue-900 font-medium"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="px-6 py-4 bg-red-50 border-b border-red-200">
              <div className="text-sm text-red-600">{error}</div>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200/50">
              <thead className="bg-[#b0c8fe]/10">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-[#001f65] uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-[#001f65] uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-[#001f65] uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-[#001f65] uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-[#001f65] uppercase tracking-wider">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white/50 divide-y divide-gray-200/50">
                {filteredLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-[#b0c8fe]/10">
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                        {formatActionName(log.action)}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-[#001f65]">
                        {log.username || "Unknown"}
                      </div>
                      {log.schoolId && (
                        <div className="text-xs text-[#001f65]/60">
                          ID: {log.schoolId}
                        </div>
                      )}
                    </td>
                    <td className="px-3 sm:px-6 py-4">
                      <div className="text-sm text-[#001f65] max-w-xs truncate" title={log.details}>
                        {log.details || "No details"}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-[#001f65]/70">
                      {log.ipAddress || "Unknown"}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-[#001f65]/70">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() :
                        log.createdAt ? new Date(log.createdAt).toLocaleString() : "Unknown"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {filteredLogs.length === 0 && !loading && (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-[#001f65]/40" />
              <h3 className="mt-2 text-sm font-medium text-[#001f65]">No audit logs found</h3>
              <p className="mt-1 text-sm text-[#001f65]/60">
                {searchTerm || selectedAction || dateFilter
                  ? "Try adjusting your search filters"
                  : "No audit logs have been recorded yet"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}