"use client"

import { useState, useEffect, useRef } from "react"
import Swal from 'sweetalert2'
import { chatSupportAPI } from '@/lib/api/chatSupport'
import { adminAPI } from '@/lib/api/admin'
import api from '@/lib/api'
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
  const [accountLookupStatus, setAccountLookupStatus] = useState(null) // null | 'not-found' | 'found-activated' | 'found-inactivated'
  const [accountResult, setAccountResult] = useState(null)
  const [accountLoading, setAccountLoading] = useState(false)
  const [showAccountForm, setShowAccountForm] = useState(false)
  const [accountFormMode, setAccountFormMode] = useState('create') // 'create' | 'edit'
  const [accountFormData, setAccountFormData] = useState({ firstName: '', middleName: '', lastName: '', schoolId: '', email: '', department: '' })
  const [hasSentResponse, setHasSentResponse] = useState(false)
  const [departments, setDepartments] = useState([])
  const [departmentsLoading, setDepartmentsLoading] = useState(false)
  const [pagination, setPagination] = useState({
    current: 1,
    total: 0,
    count: 0,
    totalMessages: 0
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const debounceTimeout = useRef(null)
  const createdPhotoUrlsRef = useRef([])

  // Small helper to show alerts using SweetAlert2 (keeps behavior consistent with other admin pages)
  const showAlert = (type, title, text) => {
    Swal.fire({
      icon: type,
      title: title,
      text: text,
      confirmButtonColor: '#001f65',
    })
  }

  // cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      try {
        if (createdPhotoUrlsRef.current && createdPhotoUrlsRef.current.length) {
          createdPhotoUrlsRef.current.forEach((u) => { try { URL.revokeObjectURL(u) } catch (e) {} })
          createdPhotoUrlsRef.current = []
        }
      } catch (e) {}
    }
  }, [])

  useEffect(() => {
    fetchMessages()
    // eslint-disable-next-line
  }, [currentPage, pageSize, selectedStatus])

  // fetch departments once for the dropdown
  useEffect(() => {
    let mounted = true
    const fetchDepartments = async () => {
      try {
        setDepartmentsLoading(true)
        const resp = await api.get('/departments')
        // backend returns array or { data: [] }
        const list = Array.isArray(resp.data) ? resp.data : (resp.data?.departments || resp.data?.data || [])
        if (mounted) setDepartments(list)
      } catch (e) {
        // ignore - dropdown will fallback to text input
        // eslint-disable-next-line no-console
        console.error('Failed to load departments', e)
      } finally {
        if (mounted) setDepartmentsLoading(false)
      }
    }
    fetchDepartments()
    return () => { mounted = false }
  }, [])

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
      // Map client-side 'archived' view to backend 'archived' status
      const effectiveStatusParam = selectedStatus === 'archived' ? 'archived' : (selectedStatus || undefined)
      const params = {
        page: currentPage,
        limit: pageSize,
        search: searchTerm,
        status: effectiveStatusParam
      }
      const response = await chatSupportAPI.getAll(params)
      if (response.success) {
        const data = response.data
        const itemsFull = data.requests || data || []
        // Client-side filtering so that "All" does NOT include archived (resolved) items.
        let items = itemsFull
        if (selectedStatus === 'archived') {
          items = itemsFull.filter(m => m.status === 'archived')
        } else if (!selectedStatus) {
          // 'All' view - exclude archived items
          items = itemsFull.filter(m => m.status !== 'archived')
        }
        setMessages(items)
        // fetch photo blobs for items that have a photo
        fetchPhotosForMessages(items)
        // Build basic pagination info from filtered items for client display
        setPagination(data.pagination || {
          current: currentPage,
          total: Math.ceil((items.length) / pageSize),
          count: items.length,
          totalMessages: items.length
        })
      } else if (response.requests && Array.isArray(response.requests)) {
        let itemsFull = response.requests
        let items = itemsFull
        if (selectedStatus === 'archived') {
          items = itemsFull.filter(m => m.status === 'archived')
        } else if (!selectedStatus) {
          items = itemsFull.filter(m => m.status !== 'archived')
        }
        setMessages(items)
        setPagination(response.pagination || {
          current: currentPage,
          total: Math.ceil(items.length / pageSize),
          count: items.length,
          totalMessages: items.length
        })
      } else if (Array.isArray(response)) {
        let itemsFull = response
        let items = itemsFull
        if (selectedStatus === 'archived') {
          items = itemsFull.filter(m => m.status === 'archived')
        } else if (!selectedStatus) {
          items = itemsFull.filter(m => m.status !== 'archived')
        }
        setMessages(items)
        setPagination({
          current: currentPage,
          total: Math.ceil(items.length / pageSize),
          count: items.length,
          totalMessages: items.length
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
      const payload = fullMessage.success ? fullMessage.data : fullMessage
      setSelectedMessage(payload)
      setResponseText(payload.response || message.response || "")
      // reset account info on open
      setAccountLookupStatus(null)
      setAccountResult(null)
      setShowAccountForm(false)
      setAccountFormData({ firstName: '', middleName: '', lastName: '', schoolId: '', email: '', department: '' })
      setShowMessageModal(true)
    } catch (error) {
      setSelectedMessage(message)
      setResponseText(message.response || "")
      setAccountLookupStatus(null)
      setAccountResult(null)
      setShowAccountForm(false)
      setAccountFormData({ firstName: '', middleName: '', lastName: '', schoolId: '', email: '', department: '' })
      setShowMessageModal(true)
    }
  }

  const handleIdentifyAccount = async () => {
    if (!selectedMessage) return
    // reset previous result immediately
    setAccountResult(null)
    setAccountLookupStatus(null)
    setAccountLoading(true)
    try {
      // Prefer identifying by schoolId (studentId) first
      let resp = null
      if (selectedMessage.schoolId) {
        resp = await adminAPI.lookupAccount({ studentId: selectedMessage.schoolId })
      }

      // Normalize: treat only explicit accounts array with length > 0 as found
      if (!resp || !Array.isArray(resp.accounts) || resp.accounts.length === 0) {
        setAccountLookupStatus('not-found')
        setAccountResult(null)
      } else {
        const acc = resp.accounts[0] || null
        setAccountResult(acc)
        const activeFlags = !!(acc && (acc.isActive || acc.otpVerified || acc.active || acc.isRegistered))
        setAccountLookupStatus(activeFlags ? 'found-activated' : 'found-inactivated')
      }
    } catch (err) {
      console.error('Identify account error', err)
      showAlert('error', 'Identify failed', err.message || 'Failed to identify account')
      setAccountLookupStatus('not-found')
      setAccountResult(null)
    } finally {
      setAccountLoading(false)
    }
  }

  const handleAddToFAQ = async () => {
    if (!selectedMessage) return
    try {
      // Ensure there's a response before allowing to add to FAQs
      if (!selectedMessage.response && !selectedMessage.respondedAt) {
        showAlert('error', 'No response', 'Please send a response first before adding to FAQs')
        return
      }

      const res = await chatSupportAPI.updateStatus(selectedMessage._id, { status: 'resolved' })
      if (res && (res.request || res.message || res.success)) {
        showAlert('success', 'Added', 'Message marked resolved and eligible for FAQs')
        fetchMessages()
        setShowMessageModal(false)
        setSelectedMessage(null)
      } else {
        throw new Error(res.message || 'Failed to add to FAQ')
      }
    } catch (err) {
      console.error('Add to FAQ error', err)
      showAlert('error', 'Error', err.message || err || 'Failed to add to FAQ')
    }
  }

  const openCreateForm = () => {
    if (!selectedMessage) return
    setAccountFormMode('create')
    setAccountFormData({
      firstName: selectedMessage.firstName || selectedMessage.first_name || '',
      middleName: selectedMessage.middleName || selectedMessage.middle_name || '',
      lastName: selectedMessage.lastName || selectedMessage.last_name || '',
      schoolId: selectedMessage.schoolId || '',
      email: selectedMessage.email || '',
      department: selectedMessage.departmentId?.departmentCode || selectedMessage.departmentId?.degreeProgram || selectedMessage.department || ''
    })
    setShowAccountForm(true)
  }

  const openEditForm = () => {
    if (!accountResult) return
    setAccountFormMode('edit')
    // map departmentId or department string to a department value used by backend (departmentCode or degreeProgram)
    let deptVal = ''
    try {
      const deptId = accountResult.departmentId || accountResult.departmentId?._id || accountResult.department
      if (deptId && departments && departments.length) {
        const found = departments.find(d => String(d._id) === String(deptId) || d.departmentCode === deptId || d.degreeProgram === deptId)
        if (found) deptVal = found.departmentCode || found.degreeProgram || ''
      }
      if (!deptVal) {
        // fallback to any department string on the account
        deptVal = accountResult.department || accountResult.departmentCode || ''
      }
    } catch (e) {
      deptVal = accountResult.department || ''
    }

    setAccountFormData({
      firstName: accountResult.firstName || accountResult.first_name || accountResult.name || '',
      middleName: accountResult.middleName || accountResult.middle_name || '',
      lastName: accountResult.lastName || accountResult.last_name || '',
      schoolId: accountResult.schoolId || accountResult.studentId || accountResult.schoolId || '',
      email: accountResult.email || '',
      department: deptVal
    })
    setShowAccountForm(true)
  }

  const handleAccountFormSubmit = async (e) => {
    e.preventDefault()
    try {
      // basic client-side validation
      if (!accountFormData.firstName || !accountFormData.lastName) {
        showAlert('error', 'Validation', 'First name and last name are required')
        return
      }
      if (!accountFormData.schoolId || String(accountFormData.schoolId).trim() === '') {
        showAlert('error', 'Validation', 'School ID is required')
        return
      }
      if (!accountFormData.department || String(accountFormData.department).trim() === '') {
        showAlert('error', 'Validation', 'Department is required')
        return
      }
      if (accountFormMode === 'create') {
        // confirm create
        const name = `${accountFormData.firstName} ${accountFormData.lastName}`.trim()
        const confirmRes = await Swal.fire({
          title: 'Create account? ',
          text: `Create account for ${name} (School ID: ${accountFormData.schoolId})?`,
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Yes, create',
          cancelButtonText: 'Cancel',
          confirmButtonColor: '#001f65'
        })
        if (!confirmRes.isConfirmed) return

        // send create - omit email when creating from a support message
        const { email, ...rest } = accountFormData || {}
        const payload = { ...rest, type: 'voter' }
        const res = await adminAPI.createAccount(payload)
        if (res.success) {
          showAlert('success', 'Account created', 'Account created successfully')
          setShowAccountForm(false)
          fetchMessages()
        } else {
          throw new Error(res.message || 'Failed to create account')
        }
      } else {
        // confirm update
        const name = `${accountFormData.firstName} ${accountFormData.lastName}`.trim()
        const confirmRes = await Swal.fire({
          title: 'Save changes?',
          text: `Save changes to ${name} (School ID: ${accountFormData.schoolId})?`,
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Yes, save',
          cancelButtonText: 'Cancel',
          confirmButtonColor: '#001f65'
        })
        if (!confirmRes.isConfirmed) return

        // update (omit department and schoolId -- schoolId is not editable)
        const id = accountResult?._id || accountResult?.id
        if (!id) throw new Error('Account id not available')
        const updatePayload = {
          firstName: accountFormData.firstName,
          middleName: accountFormData.middleName,
          lastName: accountFormData.lastName,
          email: accountFormData.email || undefined
        }
        // include yearLevel if provided
        if (typeof accountFormData.yearLevel !== 'undefined' && accountFormData.yearLevel !== null && accountFormData.yearLevel !== '') {
          updatePayload.yearLevel = accountFormData.yearLevel
        }
        const res = await adminAPI.updateAccount(id, updatePayload)
        if (res.success) {
          showAlert('success', 'Account updated', 'Account updated successfully')
          setShowAccountForm(false)
          setAccountResult(res.account || res.data || null)
          setAccountLookupStatus(res.account?.isActive ? 'found-activated' : 'found-inactivated')
          fetchMessages()
        } else {
          throw new Error(res.message || 'Failed to update account')
        }
      }
    } catch (err) {
      console.error('Account form submit error', err)
      showAlert('error', 'Error', err.message || err || 'Failed to save account')
    }
  }

  const handleUpdateStatus = async (status) => {
    if (!selectedMessage) return
    try {
      const updateData = { status: status }
      const response = await chatSupportAPI.updateStatus(selectedMessage._id, updateData)
      if (response.success || response.message) {
        fetchMessages()
        setShowMessageModal(false)
        setSelectedMessage(null)
        showAlert("success", "Success!", "Message status updated successfully")
      } else {
        throw new Error("Failed to update message status")
      }
    } catch (error) {
      showAlert("error", "Error!", error.message || error || "Failed to update message")
    }
  }

  const handleDeleteMessage = async (id) => {
    try {
      if (!id) return
      const confirmed = await Swal.fire({
        title: 'Delete message?',
        text: 'This will permanently delete the archived message. This action cannot be undone.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#b91c1c'
      })
      if (!confirmed.isConfirmed) return
      const res = await chatSupportAPI.delete(id)
      if (res && (res.success || res.message)) {
        showAlert('success', 'Deleted', 'Message deleted successfully')
        fetchMessages()
        // if modal is open on the deleted message, close it
        if (selectedMessage && (selectedMessage._id === id || selectedMessage.id === id)) {
          setShowMessageModal(false)
          setSelectedMessage(null)
        }
      } else {
        throw new Error(res.message || 'Failed to delete message')
      }
    } catch (err) {
      console.error('Delete message error', err)
      showAlert('error', 'Error', err.message || 'Failed to delete message')
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
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatStatusLabel = (status) => {
    if (!status) return 'NEW'
    if (status === 'pending') return 'NEW'
    return status.replace('-', ' ').toUpperCase()
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

  const formatName = (obj) => {
    if (!obj) return 'N/A'
    const first = obj.firstName || obj.first_name || ''
    const middle = obj.middleName || obj.middle_name || ''
    const last = obj.lastName || obj.last_name || ''
    const fullFromLegacy = obj.fullName || obj.full_name
    const composed = `${first} ${middle ? middle + ' ' : ''}${last}`.trim()
    return composed || fullFromLegacy || 'N/A'
  }

  const getPhotoSrc = (photo) => {
    if (!photo) return null

    // If already a data URI, return as-is
    if (typeof photo === 'string' && photo.startsWith('data:')) return photo

    // If includes 'base64' (maybe already data URI) return as-is
    if (typeof photo === 'string' && photo.includes('base64')) return photo

    try {
      // If starts with /uploads (server-served file), prefix with API root
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      const API_ROOT = API_BASE.replace(/\/api\/?$/, '')
      if (typeof photo === 'string' && (photo.startsWith('/uploads') || photo.startsWith('uploads/'))) {
        return `${API_ROOT}${photo.startsWith('/') ? photo : '/' + photo}`
      }

      // If absolute URL
      if (typeof photo === 'string' && (photo.startsWith('http') || photo.startsWith('//'))) return photo

      // Heuristic: raw base64 string without data URI - return a data URI (avoid creating object URLs during render)
      if (typeof photo === 'string') {
        const possibleBase64 = photo.replace(/\s+/g, '')
        if (possibleBase64.length > 100 && /^[A-Za-z0-9+/=]+$/.test(possibleBase64)) {
          return `data:image/jpeg;base64,${possibleBase64}`
        }
      }

      // Buffer-like object from MongoDB (e.g., { type: 'Buffer', data: [...] }) - convert to base64 data URI
      if (photo && photo.type === 'Buffer' && Array.isArray(photo.data)) {
        try {
          const u8 = new Uint8Array(photo.data)
          let binary = ''
          for (let i = 0; i < u8.length; i++) binary += String.fromCharCode(u8[i])
          const b64 = typeof window !== 'undefined' ? btoa(binary) : Buffer.from(u8).toString('base64')
          return `data:image/jpeg;base64,${b64}`
        } catch (err) {
          return null
        }
      }

      // nothing matched
      return null
    } catch (err) {
      return null
    }
  }

  // When a message is opened, fetch a stable blob URL for the selectedMessage if available
  useEffect(() => {
    const fetchSelectedPhoto = async () => {
      if (!selectedMessage) return
      // if already has a blob src, nothing to do
      if (selectedMessage._photoSrc) return
      // try to reuse from messages list
      const found = messages.find(m => m._id === selectedMessage._id || m.id === selectedMessage._id)
      if (found && found._photoSrc) {
        setSelectedMessage(prev => ({ ...(prev || {}), _photoSrc: found._photoSrc }))
        return
      }

      // otherwise fetch from backend endpoint
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
        const token = localStorage.getItem('token')
        const resp = await fetch(`${API_BASE}/chat-support/${selectedMessage._id}/photo`, {
          headers: {
            'x-auth-token': token || '',
            'Authorization': token ? `Bearer ${token}` : ''
          }
        })
        if (!resp.ok) return
        const blob = await resp.blob()
        const url = URL.createObjectURL(blob)
        createdPhotoUrlsRef.current.push(url)
        setSelectedMessage(prev => ({ ...(prev || {}), _photoSrc: url }))
      } catch (e) {
        // ignore - fallback to getPhotoSrc
        // eslint-disable-next-line no-console
        console.error('Failed to fetch selected message photo blob', e)
      }
    }

    fetchSelectedPhoto()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMessage])

  // Fetch photo blob from backend endpoint and create object URLs for images
  const fetchPhotosForMessages = async (items) => {
    if (!items || items.length === 0) return
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
    const token = localStorage.getItem('token')

    for (const msg of items) {
      try {
        if (!msg.photo) continue
        if (msg._photoSrc) continue

        const resp = await fetch(`${API_BASE}/chat-support/${msg._id}/photo`, {
          headers: {
            'x-auth-token': token || '',
            'Authorization': token ? `Bearer ${token}` : ''
          }
        })

        if (!resp.ok) continue
        const blob = await resp.blob()
        const url = URL.createObjectURL(blob)
        createdPhotoUrlsRef.current.push(url)

        // update message in state
        setMessages(prev => (prev || []).map(m => (m._id === msg._id ? { ...m, _photoSrc: url } : m)))
      } catch (e) {
        // if fetch failed, skip; the getPhotoSrc fallback may handle base64/raw formats
        // eslint-disable-next-line no-console
        console.error('Failed to fetch photo blob for message', msg._id, e)
      }
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
                    placeholder="Search by ticket ID, school ID, name, email, or message..."
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
                  <option value="archived">Archived</option>
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
                    Ticket ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#001f65] uppercase tracking-wider">
                    Photo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#001f65] uppercase tracking-wider">
                    Full Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#001f65] uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#001f65] uppercase tracking-wider">
                    Source
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
                      {message.ticketId || 'N/A'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-[#001f65]">
                      {(message._photoSrc || getPhotoSrc(message.photo)) ? (
                        <img
                          src={message._photoSrc || getPhotoSrc(message.photo)}
                          alt="photo"
                          className="w-10 h-10 object-cover rounded-full"
                          onError={(e) => { e.target.onerror = null; e.target.src = '/no-image.png' }}
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-xs text-gray-400">N/A</div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-[#001f65]">
                      {formatName(message)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-[#001f65]">
                      <div className="max-w-xs truncate">
                          {message.email ? (
                            <a
                              href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(message.email)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {message.email}
                            </a>
                          ) : (
                            'N/A'
                          )}
                        </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-[#001f65]">
                      {message.voterId ? (
                        <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Voter Dashboard</span>
                      ) : (
                        <span className="inline-block px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">Anonymous</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-[#001f65]">
                      <div className="max-w-xs truncate">
                        {message.message || 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(message.status)}`}>
                        {formatStatusLabel(message.status)}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-[#001f65]/70">
                      {formatDate(message.submittedAt || message.createdAt)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium flex items-center gap-2">
                      {message.status === 'archived' ? (
                        // Archived row: only allow Unarchive action
                        <div className="flex items-center gap-2">
                          <button
                            onClick={async () => {
                              try {
                                const name = message.ticketId || message.schoolId || 'this message'
                                const confirmed = await Swal.fire({
                                  title: 'Unarchive message?',
                                  text: `Are you sure you want to unarchive ${name}? This will set its status to In Progress.`,
                                  icon: 'question',
                                  showCancelButton: true,
                                  confirmButtonText: 'Yes, unarchive',
                                  cancelButtonText: 'Cancel',
                                  confirmButtonColor: '#001f65'
                                })
                                if (!confirmed.isConfirmed) return
                                await chatSupportAPI.updateStatus(message._id, { status: 'in-progress' })
                                fetchMessages()
                                showAlert('success', 'Unarchived', 'Message restored for action')
                              } catch (err) {
                                console.error('Unarchive error (row)', err)
                                showAlert('error', 'Error', err.message || 'Failed to unarchive')
                              }
                            }}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                          >
                            Unarchive
                          </button>

                          <button
                            onClick={async () => {
                              try {
                                await handleDeleteMessage(message._id)
                              } catch (err) {
                                // errors already handled in handler
                              }
                            }}
                            className="px-3 py-1 bg-red-600 text-white rounded text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      ) : (
                        // Non-archived row: normal actions
                        <>
                          <button
                            onClick={() => handleViewMessage(message)}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1 transition-colors"
                          >
                            <Eye className="w-3 h-3" />
                            View
                          </button>

                          {/* If message was submitted by a logged-in voter (has voterId), show Add to FAQ button in table row.
                              Enabled only when a response exists for that message. */}
                          {message.voterId && (
                            <button
                              onClick={async () => {
                                try {
                                  if (!message.response && !message.respondedAt) {
                                    showAlert('error', 'No response', 'Please respond to the message before adding to FAQs')
                                    return
                                  }
                                  const resp = await chatSupportAPI.updateStatus(message._id, { status: 'resolved' })
                                  if (resp) {
                                    showAlert('success', 'Added', 'Message marked resolved and eligible for FAQs')
                                    fetchMessages()
                                  }
                                } catch (err) {
                                  console.error('Add to FAQ error (row)', err)
                                  showAlert('error', 'Error', err.message || 'Failed to add to FAQ')
                                }
                              }}
                              disabled={!(message.response || message.respondedAt)}
                              className={`px-3 py-1 rounded text-sm ${message.response || message.respondedAt ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-200 text-gray-600 cursor-not-allowed'}`}
                            >
                              Add to FAQ
                            </button>
                          )}
                        </>
                      )}
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
                    <label className="block text-sm font-medium text-[#001f65]">Ticket ID</label>
                    <p className="mt-1 text-sm text-[#001f65]">{selectedMessage.ticketId || 'N/A'}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#001f65]">Submitted</label>
                  <p className="mt-1 text-sm text-[#001f65]">{formatDate(selectedMessage.submittedAt || selectedMessage.createdAt)}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#001f65]">Message</label>
                  <div className="mt-1 text-sm text-[#001f65] bg-[#f3f7fe] p-3 rounded-lg border">{selectedMessage.message || 'No message content'}</div>
                </div>

                {/* Archived - read only */}
                {selectedMessage.status === 'archived' && (
                  <div className="mt-4 p-4 bg-gray-50 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-[#001f65]">Archived Message</h4>
                        <p className="text-xs text-[#475569]">This message is archived and read-only. Use "Unarchive" to restore it for further action.</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={async () => {
                              try {
                                const name = selectedMessage.ticketId || selectedMessage.schoolId || 'this message'
                                const confirmed = await Swal.fire({
                                  title: 'Unarchive message?',
                                  text: `Are you sure you want to unarchive ${name}? This will set its status to In Progress.`,
                                  icon: 'question',
                                  showCancelButton: true,
                                  confirmButtonText: 'Yes, unarchive',
                                  cancelButtonText: 'Cancel',
                                  confirmButtonColor: '#001f65'
                                })
                                if (!confirmed.isConfirmed) return
                                await handleUpdateStatus('in-progress')
                              } catch (err) {
                                showAlert('error', 'Error', err.message || 'Failed to unarchive message')
                              }
                            }}
                            className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm"
                          >
                            Unarchive
                          </button>

                          <button
                            onClick={async () => {
                              try {
                                await handleDeleteMessage(selectedMessage._id)
                              } catch (err) {
                                // handled in function
                              }
                            }}
                            className="px-3 py-1 bg-red-600 text-white rounded-md text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Non-archived controls */}
                {selectedMessage.status !== 'archived' && (
                  <>
                    {(selectedMessage._photoSrc || selectedMessage.photo) && (
                      <div>
                        <label className="block text-sm font-medium text-[#001f65]">Photo</label>
                        <div className="mt-1">
                          <img src={selectedMessage._photoSrc || getPhotoSrc(selectedMessage.photo)} alt="support-photo" className="max-w-full h-auto rounded-lg border" onError={(e) => { e.target.onerror = null; e.target.src = '/no-image.png' }} />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-[#001f65]">Account</label>
                      <div className="mt-2">
                        {accountLoading ? (
                          <div className="text-sm text-[#001f65]">Checking account...</div>
                        ) : (
                          <>
                            {!selectedMessage?.voterId && !accountLookupStatus && (
                              <div className="flex items-center gap-3">
                                <button onClick={handleIdentifyAccount} className="px-3 py-1 rounded-md text-sm bg-[#001f65] text-white">Identify Account</button>
                              </div>
                            )}

                            {selectedMessage?.voterId && (
                              <div className="flex items-center gap-3">
                                <button onClick={handleAddToFAQ} disabled={!(selectedMessage.response || selectedMessage.respondedAt)} className={`px-3 py-1 rounded-md text-sm ${selectedMessage.response || selectedMessage.respondedAt ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600 cursor-not-allowed'}`}>Add to FAQ</button>
                              </div>
                            )}

                            {/* If lookup returned no account, allow creating one prefilled from the message */}
                            {!selectedMessage?.voterId && accountLookupStatus === 'not-found' && (
                              <div className="mt-3 flex items-center gap-3">
                                <div className="text-sm text-gray-700">No matching account was found for this requester.</div>
                                <button onClick={openCreateForm} className="px-3 py-1 bg-green-600 text-white rounded-md text-sm">Add Account</button>
                              </div>
                            )}

                            {/* If lookup returned an account, show brief details and allow editing */}
                            {!selectedMessage?.voterId && (accountLookupStatus === 'found-activated' || accountLookupStatus === 'found-inactivated') && accountResult && (
                              <div className="mt-3 p-3 bg-white border rounded-lg">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="text-sm font-semibold text-[#001f65]">{(accountResult.firstName || accountResult.name) ? `${accountResult.firstName || ''} ${accountResult.middleName || ''} ${accountResult.lastName || ''}`.trim() : (accountResult.name || 'Unknown')}</div>
                                    <div className="text-xs text-gray-500">School ID: {accountResult.schoolId || accountResult.studentId || 'N/A'}</div>
                                    <div className="text-xs text-gray-500">Email: {accountResult.email || 'N/A'}</div>
                                  </div>
                                  <div className="flex flex-col items-end gap-2">
                                    <div className={accountLookupStatus === 'found-activated' ? 'text-xs px-2 py-1 bg-green-100 text-green-800 rounded' : 'text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded'}>{accountLookupStatus === 'found-activated' ? 'Active' : 'Inactive'}</div>
                                    <div className="flex gap-2">
                                      <button onClick={openEditForm} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Edit Account</button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Account create / edit form */}
                    {showAccountForm && (
                      <form onSubmit={handleAccountFormSubmit} className="mt-3 p-4 bg-white border rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-[#001f65]">First Name</label>
                            <input value={accountFormData.firstName} onChange={(e) => setAccountFormData(prev => ({ ...prev, firstName: e.target.value }))} className="w-full px-3 py-2 border rounded" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-[#001f65]">Middle Name</label>
                            <input value={accountFormData.middleName} onChange={(e) => setAccountFormData(prev => ({ ...prev, middleName: e.target.value }))} className="w-full px-3 py-2 border rounded" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-[#001f65]">Last Name</label>
                            <input value={accountFormData.lastName} onChange={(e) => setAccountFormData(prev => ({ ...prev, lastName: e.target.value }))} className="w-full px-3 py-2 border rounded" />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                          <div>
                            <label className="block text-xs font-medium text-[#001f65]">School ID</label>
                            <input value={accountFormData.schoolId} onChange={(e) => setAccountFormData(prev => ({ ...prev, schoolId: e.target.value }))} className="w-full px-3 py-2 border rounded" disabled={accountFormMode === 'edit'} />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-[#001f65]">Email</label>
                            <input value={accountFormData.email} onChange={(e) => setAccountFormData(prev => ({ ...prev, email: e.target.value }))} className="w-full px-3 py-2 border rounded" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-[#001f65]">Department</label>
                            {departmentsLoading ? (
                              <input value={accountFormData.department} onChange={(e) => setAccountFormData(prev => ({ ...prev, department: e.target.value }))} className="w-full px-3 py-2 border rounded" />
                            ) : (
                              <select value={accountFormData.department} onChange={(e) => setAccountFormData(prev => ({ ...prev, department: e.target.value }))} className="w-full px-3 py-2 border rounded">
                                <option value="">Select department</option>
                                {departments.map((d) => (
                                  <option key={d._id || d.departmentCode || d.degreeProgram} value={d.departmentCode || d.degreeProgram || d._id}>{d.departmentCode || d.degreeProgram || d._id}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 mt-4">
                          <button type="submit" className="px-4 py-2 bg-[#001f65] text-white rounded">{accountFormMode === 'create' ? 'Create Account' : 'Save Changes'}</button>
                          <button type="button" onClick={() => setShowAccountForm(false)} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                        </div>
                      </form>
                    )}

                    <div className="mt-3">
                      <label className="block text-sm font-medium text-[#001f65]">Current Status</label>
                      <span className={`mt-1 inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedMessage.status)}`}>{formatStatusLabel(selectedMessage.status)}</span>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-4 border-t">
                      <button onClick={() => handleUpdateStatus('in-progress')} disabled={selectedMessage.status === 'in-progress'} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md">Mark In Progress</button>
                      <button onClick={() => handleUpdateStatus('resolved')} disabled={selectedMessage.status === 'resolved'} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md">Mark Resolved</button>
                      <button onClick={async () => {
                        try {
                          const confirmed = await Swal.fire({ title: 'Archive message?', text: 'Archive this message?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Yes, archive', cancelButtonText: 'Cancel', confirmButtonColor: '#b91c1c' })
                          if (!confirmed.isConfirmed) return
                          await handleUpdateStatus('archived')
                        } catch (err) {
                          showAlert('error', 'Error', err.message || 'Failed to archive message')
                        }
                      }} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md">Archive</button>
                    </div>

                    <div className="mt-3">
                      <label className="block text-sm font-medium text-[#001f65] mb-2">Response</label>
                      <textarea value={responseText} onChange={(e) => setResponseText(e.target.value)} rows={4} className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3" placeholder="Type a response to send to the requester via email..." />
                      <div className="flex gap-2">
                        <button onClick={async () => {
                          try {
                            if (!responseText || responseText.trim().length === 0) { showAlert('error', 'Error', 'Response text cannot be empty'); return }
                            const res = await chatSupportAPI.sendResponse(selectedMessage._id, { response: responseText })
                            if (res.success) {
                              showAlert('success', 'Sent', 'Response emailed successfully')
                              fetchMessages()
                              setShowMessageModal(false)
                              setSelectedMessage(null)
                              setResponseText('')
                            } else {
                              throw new Error(res.message || 'Failed to send response')
                            }
                          } catch (err) {
                            showAlert('error', 'Error', err.message || 'Failed to send response')
                          }
                        }} className="px-4 py-2 bg-indigo-600 text-white rounded-md">Send</button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}