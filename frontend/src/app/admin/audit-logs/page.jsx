"use client"

import { useState, useEffect } from "react"
import { RotateCcw, Search, FileText, Loader2 } from "lucide-react"
import Swal from 'sweetalert2'
import { auditLogsAPI } from '@/lib/api/auditLogs'

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedAction, setSelectedAction] = useState("")
  const [dateFilter, setDateFilter] = useState("")
  const [statistics, setStatistics] = useState(null)
  
  // All possible actions from AuditLog.js enum
  const ALL_ACTIONS = [
    "LOGIN",
    "LOGOUT", 
    "PASSWORD_RESET_REQUEST",
    "PASSWORD_RESET_SUCCESS",
    "UNAUTHORIZED_ACCESS_ATTEMPT",
    "DATA_EXPORT",
    "DATA_IMPORT",
    "UPDATE_PASSWORD",
    "FORCE_LOGOUT",
    "CREATE_USER",
    "UPDATE_USER", 
    "DELETE_USER",
    "ACTIVATE_USER",
    "DEACTIVATE_USER",
    "CREATE_VOTER",
    "UPDATE_VOTER",
    "DELETE_VOTER", 
    "ACTIVATE_VOTER",
    "DEACTIVATE_VOTER",
    "VOTER_REGISTRATION",
    "CREATE_DEGREE",
    "UPDATE_DEGREE",
    "DELETE_DEGREE",
    "SYSTEM_ACCESS",
    "CREATE_ELECTION",
    "UPDATE_ELECTION",
    "DELETE_ELECTION",
    "START_ELECTION", 
    "END_ELECTION",
    "CANCEL_ELECTION",
    "CREATE_CANDIDATE",
    "UPDATE_CANDIDATE",
    "DELETE_CANDIDATE",
    "CREATE_POSITION",
    "UPDATE_POSITION",
    "DELETE_POSITION",
    "CREATE_PARTYLIST",
    "UPDATE_PARTYLIST",
    "DELETE_PARTYLIST",
    "VOTED",
    "VOTE_SUBMITTED",
    "BALLOT_ACCESSED",
    "BALLOT_STARTED", 
    "BALLOT_ABANDONED",
    "CHAT_SUPPORT_REQUEST",
    "CHAT_SUPPORT_RESPONSE",
    "CHAT_SUPPORT_STATUS_UPDATE",
    "FILE_UPLOAD",
    "FILE_DELETE",
    "PROFILE_PICTURE_UPDATE",
    "CAMPAIGN_PICTURE_UPDATE"
  ]

  const showAlert = (type, title, text) => {
    Swal.fire({
      icon: type,
      title: title,
      text: text,
      confirmButtonColor: "#8B5CF6",
    })
  }

  useEffect(() => {
    fetchAuditLogs()
    fetchStatistics()
  }, [])

  const fetchAuditLogs = async () => {
    try {
      setLoading(true)
      setError("")
      
      const params = {}
      if (searchTerm.trim()) {
        params.search = searchTerm.trim()
      }
      if (selectedAction) {
        params.action = selectedAction
      }
      if (dateFilter) {
        params.date = dateFilter
      }
      
      const response = await auditLogsAPI.getAll(params)
      
      // Handle response structure based on your API
      if (response.success && Array.isArray(response.data)) {
        setLogs(response.data)
      } else if (Array.isArray(response.logs)) {
        setLogs(response.logs)
      } else if (Array.isArray(response)) {
        setLogs(response)
      } else {
        console.warn("Unexpected response structure:", response)
        setLogs([])
      }
      
    } catch (error) {
      console.error("Fetch audit logs error:", error)
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
      const response = await auditLogsAPI.getStatistics()
      if (response.success) {
        setStatistics(response.data)
      } else if (response.data) {
        setStatistics(response.data)
      } else {
        setStatistics(response)
      }
    } catch (error) {
      console.error("Fetch statistics error:", error)
    }
  }

  const filteredLogs = Array.isArray(logs) ? logs.filter((log) => {
    const matchesSearch = !searchTerm || 
      (log.username || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.action || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.details || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.ipAddress || "").includes(searchTerm) ||
      (log.schoolId || "").toString().includes(searchTerm)

    const matchesAction = !selectedAction || log.action === selectedAction
    
    const matchesDate = !dateFilter || 
      (log.timestamp && new Date(log.timestamp).toDateString() === new Date(dateFilter).toDateString()) ||
      (log.createdAt && new Date(log.createdAt).toDateString() === new Date(dateFilter).toDateString())

    return matchesSearch && matchesAction && matchesDate
  }) : []

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm || selectedAction || dateFilter) {
        fetchAuditLogs()
      }
    }, 500) // Debounce search

    return () => clearTimeout(delayedSearch)
  }, [searchTerm, selectedAction, dateFilter])

  const getActionColor = (action) => {
    const colors = {
      // Auth actions
      "LOGIN": "bg-blue-100 text-blue-800",
      "LOGOUT": "bg-gray-100 text-gray-800",
      "PASSWORD_RESET_REQUEST": "bg-yellow-100 text-yellow-800",
      "PASSWORD_RESET_SUCCESS": "bg-green-100 text-green-800",
      "UNAUTHORIZED_ACCESS_ATTEMPT": "bg-red-100 text-red-800",
      "FORCE_LOGOUT": "bg-red-100 text-red-800",
      
      // User management
      "CREATE_USER": "bg-green-100 text-green-800",
      "UPDATE_USER": "bg-blue-100 text-blue-800", 
      "DELETE_USER": "bg-red-100 text-red-800",
      "ACTIVATE_USER": "bg-green-100 text-green-800",
      "DEACTIVATE_USER": "bg-orange-100 text-orange-800",
      
      // Voter management
      "CREATE_VOTER": "bg-emerald-100 text-emerald-800",
      "UPDATE_VOTER": "bg-blue-100 text-blue-800",
      "DELETE_VOTER": "bg-red-100 text-red-800",
      "ACTIVATE_VOTER": "bg-green-100 text-green-800", 
      "DEACTIVATE_VOTER": "bg-orange-100 text-orange-800",
      "VOTER_REGISTRATION": "bg-purple-100 text-purple-800",
      
      // Election management
      "CREATE_ELECTION": "bg-indigo-100 text-indigo-800",
      "UPDATE_ELECTION": "bg-blue-100 text-blue-800",
      "DELETE_ELECTION": "bg-red-100 text-red-800", 
      "START_ELECTION": "bg-green-100 text-green-800",
      "END_ELECTION": "bg-gray-100 text-gray-800",
      "CANCEL_ELECTION": "bg-red-100 text-red-800",
      
      // Voting actions
      "VOTED": "bg-green-100 text-green-800",
      "VOTE_SUBMITTED": "bg-emerald-100 text-emerald-800",
      "BALLOT_ACCESSED": "bg-cyan-100 text-cyan-800",
      "BALLOT_STARTED": "bg-blue-100 text-blue-800",
      "BALLOT_ABANDONED": "bg-yellow-100 text-yellow-800",
      
      // System actions
      "SYSTEM_ACCESS": "bg-cyan-100 text-cyan-800",
      "DATA_EXPORT": "bg-purple-100 text-purple-800",
      "DATA_IMPORT": "bg-purple-100 text-purple-800",
      
      // Support actions
      "CHAT_SUPPORT_REQUEST": "bg-teal-100 text-teal-800",
      "CHAT_SUPPORT_RESPONSE": "bg-teal-100 text-teal-800",
      "CHAT_SUPPORT_STATUS_UPDATE": "bg-blue-100 text-blue-800",
      
      // File actions
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

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="animate-spin rounded-full h-12 w-12 mx-auto text-purple-600" />
        <p className="mt-4 text-gray-600">Loading audit logs...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">Total Logs</div>
            <div className="text-2xl font-bold text-gray-900">{statistics.totalLogs || 0}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">Today's Activity</div>
            <div className="text-2xl font-bold text-blue-600">{statistics.todayActivity || 0}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">Failed Attempts</div>
            <div className="text-2xl font-bold text-red-600">{statistics.failedAttempts || 0}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">Active Users</div>
            <div className="text-2xl font-bold text-green-600">{statistics.activeUsers || 0}</div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-lg font-semibold text-gray-900">Audit Logs</h1>
            <div className="mt-4 sm:mt-0 flex space-x-3">
              <button
                onClick={handleRefresh}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by user, action, details, or IP..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>

            {/* Action Filter */}
            <div>
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>

          {/* Filter Actions */}
          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-gray-500">
              Showing {filteredLogs.length} of {logs.length} logs
            </div>
            <button
              onClick={handleClearFilters}
              className="text-sm text-purple-600 hover:text-purple-800 font-medium"
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
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.map((log) => (
                <tr key={log._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                      {formatActionName(log.action)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {log.username || "Unknown"}
                    </div>
                    {log.schoolId && (
                      <div className="text-sm text-gray-500">
                        ID: {log.schoolId}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate" title={log.details}>
                      {log.details || "No details"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.ipAddress || "Unknown"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No audit logs found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || selectedAction || dateFilter
                ? "Try adjusting your search filters"
                : "No audit logs have been recorded yet"}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}