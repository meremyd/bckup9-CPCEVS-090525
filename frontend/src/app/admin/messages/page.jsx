"use client"

import { useState, useEffect, useRef } from "react"
import Swal from 'sweetalert2'
import { chatSupportAPI } from '@/lib/api/chatSupport'
import { Search, Loader2, AlertCircle, MessageSquare, X, Eye, ChevronLeft, ChevronRight } from 'lucide-react'

export default function MessagesPage() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("")
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [responseText, setResponseText] = useState("")
  const [pagination, setPagination] = useState({
    current: 1,
    total: 0,
    count: 0,
    totalMessages: 0
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const debounceTimeout = useRef(null)

  // SweetAlert function
  const showAlert = (type, title, text) => {
    Swal.fire({
      icon: type,
      title: title,
      text: text,
      confirmButtonColor: "#001f65",
    })
  }

  useEffect(() => {
    fetchMessages()
    // eslint-disable-next-line
  }, [currentPage, pageSize, selectedStatus])

  // Debounce search
  useEffect(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current)
    debounceTimeout.current = setTimeout(() => {
      setCurrentPage(1)
      fetchMessages()
    }, 400)
    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current)
    }
    // eslint-disable-next-line
  }, [searchTerm])

  const fetchMessages = async () => {
    try {
      setLoading(true)
      const params = {
        page: currentPage,
        limit: pageSize,
        search: searchTerm,
        status: selectedStatus || undefined
      }
      const response = await chatSupportAPI.getAll(params)
      if (response.success) {
        const data = response.data
        setMessages(data.requests || data || [])
        setPagination(data.pagination || {
          current: currentPage,
          total: Math.ceil((data.total || data.length) / pageSize),
          count: data.requests?.length || data.length || 0,
          totalMessages: data.total || data.length || 0
        })
      } else if (response.requests && Array.isArray(response.requests)) {
        setMessages(response.requests)
        setPagination(response.pagination || {
          current: currentPage,
          total: Math.ceil(response.requests.length / pageSize),
          count: response.requests.length,
          totalMessages: response.requests.length
        })
      } else if (Array.isArray(response)) {
        setMessages(response)
        setPagination({
          current: currentPage,
          total: Math.ceil(response.length / pageSize),
          count: response.length,
          totalMessages: response.length
        })
      } else {
        setMessages([])
        setPagination({
          current: 1,
          total: 0,
          count: 0,
          totalMessages: 0
        })
      }
      setError("")
    } catch (error) {
      setError(error.message || error || "Failed to fetch messages")
      setMessages([])
      setPagination({
        current: 1,
        total: 0,
        count: 0,
        totalMessages: 0
      })
    } finally {
      setLoading(false)
    }
  }

  const handleViewMessage = async (message) => {
    try {
      const fullMessage = await chatSupportAPI.getById(message._id)
      setSelectedMessage(fullMessage.success ? fullMessage.data : fullMessage)
      setResponseText(fullMessage.response || message.response || "")
      setShowMessageModal(true)
    } catch (error) {
      setSelectedMessage(message)
      setResponseText(message.response || "")
      setShowMessageModal(true)
    }
  }

  const handleUpdateStatus = async (status) => {
    if (!selectedMessage) return
    try {
      const updateData = {
        status: status,
        response: responseText.trim() || undefined
      }
      const response = await chatSupportAPI.updateStatus(selectedMessage._id, updateData)
      if (response.success || response.message) {
        fetchMessages()
        setShowMessageModal(false)
        setSelectedMessage(null)
        setResponseText("")
        showAlert("success", "Success!", "Message status updated successfully")
      } else {
        throw new Error("Failed to update message status")
      }
    } catch (error) {
      showAlert("error", "Error!", error.message || error || "Failed to update message")
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "in-progress":
        return "bg-blue-100 text-blue-800"
      case "resolved":
        return "bg-green-100 text-green-800"
      case "closed":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatDate = (dateString) => {
    try {
      if (!dateString) return 'N/A'
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'Invalid Date'
    }
  }

  const handlePageChange = (page) => {
    if (page >= 1 && page <= pagination.total) {
      setCurrentPage(page)
    }
  }

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedStatus("")
    setCurrentPage(1)
    fetchMessages()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-[#001f65]" />
            <span className="ml-2 text-[#001f65]">Loading messages...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-transparent p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Error Display */}
        {error && (
          <div className="bg-red-50/90 border border-red-200 rounded-2xl p-4 flex items-start">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <p className="text-red-600 text-sm font-medium">Error Loading Data</p>
              <p className="text-red-500 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
          {/* Filters */}
          <div className="p-6 border-b border-gray-200/50">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search Bar */}
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search by school ID, name, email, or message..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent"
                  />
                </div>
              </div>
              {/* Status Filter */}
              <div className="min-w-[150px]">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#001f65] focus:border-transparent"
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              {/* Page Size */}
              <div className="min-w-[120px]">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#001f65] focus:border-transparent"
                >
                  <option value={10}>10 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                </select>
              </div>
              {/* Search Button */}
              <button
                onClick={() => { setCurrentPage(1); fetchMessages() }}
                className="px-4 py-2 bg-[#001f65] text-white rounded-lg hover:bg-[#003399] transition-colors flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                Search
              </button>
              {/* Clear Filters */}
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm text-[#001f65] hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200/50">
              <thead className="bg-[#b0c8fe]/10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#001f65] uppercase tracking-wider">
                    School ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#001f65] uppercase tracking-wider">
                    Full Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#001f65] uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#001f65] uppercase tracking-wider">
                    Message Preview
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#001f65] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#001f65] uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#001f65] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white/50 divide-y divide-gray-200/50">
                {messages.map((message) => (
                  <tr key={message._id || message.id} className="hover:bg-[#b0c8fe]/10">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-[#001f65]">
                      {message.schoolId || 'N/A'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-[#001f65]">
                      {message.fullName || 'N/A'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-[#001f65]">
                      <div className="max-w-xs truncate">
                        {message.email || 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-[#001f65]">
                      <div className="max-w-xs truncate">
                        {message.message || 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(message.status)}`}>
                        {message.status?.replace("-", " ").toUpperCase() || 'PENDING'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-[#001f65]/70">
                      {formatDate(message.submittedAt || message.createdAt)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleViewMessage(message)}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1 transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {messages.length === 0 && !loading && (
            <div className="text-center py-12">
              <MessageSquare className="mx-auto h-12 w-12 text-[#001f65]/40" />
              <h3 className="mt-4 text-lg font-medium text-[#001f65]">No messages found</h3>
              <p className="mt-2 text-[#001f65]/60">
                {searchTerm || selectedStatus
                  ? "Try adjusting your search criteria or filters"
                  : "No support messages have been submitted yet"
                }
              </p>
            </div>
          )}

          {/* Pagination */}
          {pagination.total > 1 && (
            <div className="px-6 py-3 bg-[#f3f7fe] border-t border-gray-200/50 flex items-center justify-between">
              <div className="flex items-center text-sm text-[#001f65]/80">
                <span>
                  Showing {((currentPage - 1) * pageSize) + 1} to{' '}
                  {Math.min(currentPage * pageSize, pagination.totalMessages)} of{' '}
                  {pagination.totalMessages} results
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <div className="flex space-x-1">
                  {[...Array(Math.min(5, pagination.total))].map((_, index) => {
                    let pageNum
                    if (pagination.total <= 5) {
                      pageNum = index + 1
                    } else {
                      const start = Math.max(1, currentPage - 2)
                      const end = Math.min(pagination.total, start + 4)
                      const actualStart = Math.max(1, end - 4)
                      pageNum = actualStart + index
                    }
                    if (pageNum > pagination.total) return null
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-1 text-sm border rounded-md ${
                          currentPage === pageNum
                            ? 'bg-[#001f65] text-white border-[#001f65]'
                            : 'border-gray-300 text-[#001f65] hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === pagination.total}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Message Detail Modal */}
        {showMessageModal && selectedMessage && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto border border-white/20">
              <div className="flex justify-between items-center p-6 border-b border-gray-200/50">
                <h3 className="text-lg font-semibold text-[#001f65]">Message Details</h3>
                <button
                  onClick={() => {
                    setShowMessageModal(false)
                    setSelectedMessage(null)
                    setResponseText("")
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#001f65]">School ID</label>
                    <p className="mt-1 text-sm text-[#001f65]">{selectedMessage.schoolId || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#001f65]">Full Name</label>
                    <p className="mt-1 text-sm text-[#001f65]">{selectedMessage.fullName || 'N/A'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#001f65]">Email</label>
                    <p className="mt-1 text-sm text-[#001f65]">{selectedMessage.email || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#001f65]">Birthday</label>
                    <p className="mt-1 text-sm text-[#001f65]">
                      {formatDate(selectedMessage.birthday)}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#001f65]">Submitted</label>
                  <p className="mt-1 text-sm text-[#001f65]">
                    {formatDate(selectedMessage.submittedAt || selectedMessage.createdAt)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#001f65]">Message</label>
                  <div className="mt-1 text-sm text-[#001f65] bg-[#f3f7fe] p-3 rounded-lg border">
                    {selectedMessage.message || 'No message content'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#001f65]">Current Status</label>
                  <span className={`mt-1 inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedMessage.status)}`}>
                    {selectedMessage.status?.replace("-", " ").toUpperCase() || 'PENDING'}
                  </span>
                </div>
                {selectedMessage.response && (
                  <div>
                    <label className="block text-sm font-medium text-[#001f65]">Previous Response</label>
                    <div className="mt-1 text-sm text-[#001f65] bg-blue-50 p-3 rounded-lg border">
                      {selectedMessage.response}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-[#001f65] mb-2">
                    {selectedMessage.response ? 'Update Response' : 'Response'}
                  </label>
                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#001f65] focus:border-transparent"
                    placeholder="Enter your response..."
                  />
                </div>

                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  <button
                    onClick={() => handleUpdateStatus("in-progress")}
                    disabled={selectedMessage.status === "in-progress"}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md transition-colors"
                  >
                    Mark In Progress
                  </button>
                  <button
                    onClick={() => handleUpdateStatus("resolved")}
                    disabled={selectedMessage.status === "resolved"}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md transition-colors"
                  >
                    Mark Resolved
                  </button>
                  <button
                    onClick={() => handleUpdateStatus("closed")}
                    disabled={selectedMessage.status === "closed"}
                    className="px-4 py-2 text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}