"use client"

import { useState, useEffect } from "react"
import Swal from 'sweetalert2'
import { chatSupportAPI } from '@/lib/api/chatSupport'

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

  // SweetAlert function
  const showAlert = (type, title, text) => {
    Swal.fire({
      icon: type,
      title: title,
      text: text,
      confirmButtonColor: "#3B82F6",
    })
  }

  useEffect(() => {
    fetchMessages()
  }, [currentPage, pageSize, selectedStatus])

  const fetchMessages = async () => {
    try {
      setLoading(true)
      const params = {
        page: currentPage,
        limit: pageSize,
        search: searchTerm,
        status: selectedStatus || undefined
      }
      
      const data = await chatSupportAPI.getAll(params)
      
      if (data.requests && Array.isArray(data.requests)) {
        setMessages(data.requests)
        setPagination(data.pagination || {
          current: 1,
          total: 0,
          count: data.requests.length,
          totalMessages: data.requests.length
        })
      } else if (Array.isArray(data)) {
        setMessages(data)
        setPagination({
          current: 1,
          total: 1,
          count: data.length,
          totalMessages: data.length
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
      console.error("Fetch messages error:", error)
      setError(error.message || "Failed to fetch messages")
      setMessages([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setCurrentPage(1)
    fetchMessages()
  }

  const handleViewMessage = (message) => {
    setSelectedMessage(message)
    setResponseText(message.response || "")
    setShowMessageModal(true)
  }

  const handleUpdateStatus = async (status) => {
    if (!selectedMessage) return

    try {
      const updateData = {
        status: status,
        response: responseText.trim() || undefined
      }
      
      await chatSupportAPI.updateStatus(selectedMessage._id, updateData)
      
      fetchMessages()
      setShowMessageModal(false)
      setSelectedMessage(null)
      setResponseText("")
      showAlert("success", "Success!", "Message status updated successfully")
    } catch (error) {
      console.error("Update message error:", error)
      showAlert("error", "Error!", error.message || "Failed to update message")
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
    setCurrentPage(page)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedStatus("")
    setCurrentPage(1)
    fetchMessages()
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading messages...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {/* <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="text-sm text-gray-500">
            Total: {pagination.totalMessages} messages
          </div>
        </div>
      </div> */}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        {/* Filters */}
        <div className="px-4 lg:px-6 py-4 border-b">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by school ID, name, email, or message..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

            {/* Status Filter */}
            <div className="min-w-[150px]">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
              </select>
            </div>

            {/* Search Button */}
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Search
            </button>

            {/* Clear Filters */}
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  School ID
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Full Name
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Message Preview
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submitted
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {messages.map((message) => (
                <tr key={message._id} className="hover:bg-gray-50">
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {message.schoolId}
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {message.fullName}
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="max-w-xs truncate">
                      {message.email}
                    </div>
                  </td>
                  <td className="px-4 lg:px-6 py-4 text-sm text-gray-900">
                    <div className="max-w-xs truncate">
                      {message.message}
                    </div>
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(message.status)}`}>
                      {message.status?.replace("-", " ").toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(message.submittedAt)}
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleViewMessage(message)}
                      className="text-blue-600 hover:text-blue-900 px-3 py-1 rounded hover:bg-blue-50 transition-colors"
                    >
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
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No messages found</h3>
            <p className="mt-2 text-gray-500">
              {searchTerm || selectedStatus
                ? "Try adjusting your search criteria or filters"
                : "No support messages have been submitted yet"
              }
            </p>
          </div>
        )}

        {/* Pagination */}
        {pagination.total > 1 && (
          <div className="px-4 lg:px-6 py-3 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm text-gray-700">
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
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                {/* Page Numbers */}
                <div className="flex space-x-1">
                  {[...Array(Math.min(5, pagination.total))].map((_, index) => {
                    const pageNum = Math.max(1, currentPage - 2) + index
                    if (pageNum > pagination.total) return null
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-1 text-sm border rounded-md ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 hover:bg-gray-50'
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
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Message Detail Modal */}
      {showMessageModal && selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">Message Details</h3>
                <button
                  onClick={() => {
                    setShowMessageModal(false)
                    setSelectedMessage(null)
                    setResponseText("")
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">School ID</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedMessage.schoolId}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedMessage.fullName}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedMessage.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Birthday</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {formatDate(selectedMessage.birthday)}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Submitted</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {formatDate(selectedMessage.submittedAt)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Message</label>
                  <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-lg border">
                    {selectedMessage.message}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Current Status</label>
                  <span className={`mt-1 inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedMessage.status)}`}>
                    {selectedMessage.status?.replace("-", " ").toUpperCase()}
                  </span>
                </div>

                {selectedMessage.response && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Previous Response</label>
                    <div className="mt-1 text-sm text-gray-900 bg-blue-50 p-3 rounded-lg border">
                      {selectedMessage.response}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {selectedMessage.response ? 'Update Response' : 'Response'}
                  </label>
                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
        </div>
      )}
    </div>
  )
}