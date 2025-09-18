"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Search, Plus, Edit, Trash2, Users, UserCheck, UserX, Download, Upload, X, Loader2, AlertCircle } from "lucide-react"
import Swal from 'sweetalert2'
import { votersAPI } from '@/lib/api/voters'
import { departmentsAPI } from '@/lib/api/departments'

export default function VotersPage() {
  const [voters, setVoters] = useState([])
  const [allVoters, setAllVoters] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDepartment, setSelectedDepartment] = useState("")
  const [activeTab, setActiveTab] = useState("active")
  const [departmentStats, setDepartmentStats] = useState({})
  const [showAddModal, setShowAddModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingVoter, setEditingVoter] = useState(null)
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalVoters: 0,
    limit: 20
  })

  // Form states - NO YEARLEVEL, NO EMAIL, NO BIRTHDATE
  const [formData, setFormData] = useState({
    schoolId: "",
    firstName: "",
    middleName: "",
    lastName: "",
    departmentId: ""
  })

  // Bulk form states
  const [bulkForms, setBulkForms] = useState([{
    schoolId: "",
    firstName: "",
    middleName: "",
    lastName: "",
    departmentId: ""
  }])

  const showAlert = (type, title, text) => {
    Swal.fire({
      icon: type,
      title: title,
      text: text,
      confirmButtonColor: "#001f65",
    })
  }

  const showConfirm = (title, text, confirmText = "Yes, proceed!") => {
    return Swal.fire({
      title: title,
      text: text,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#6B7280",
      confirmButtonText: confirmText,
    }).then((result) => result.isConfirmed)
  }

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true)
      await Promise.all([fetchDepartments(), fetchAllVotersForStats()])
      await fetchVoters()
    } catch (error) {
      setError("Failed to load initial data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
  if (departments.length > 0) fetchVoters();
  // eslint-disable-next-line
}, [pagination.currentPage, selectedDepartment, activeTab, searchTerm]);
  
  const debounceTimeout = useRef(null);

  // Debounced search: only reset page
useEffect(() => {
  if (debounceTimeout.current) {
    clearTimeout(debounceTimeout.current);
  }
  debounceTimeout.current = setTimeout(() => {
    setPagination(prev => ({
      ...prev,
      currentPage: 1
    }));
  }, 400);
  return () => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
  };
  // eslint-disable-next-line
}, [searchTerm]);

// Fetch voters when relevant
useEffect(() => {
  if (departments.length > 0) fetchVoters();
  // Note: add searchTerm here for correct fetch on search
  // eslint-disable-next-line
}, [pagination.currentPage, selectedDepartment, activeTab, searchTerm]);

  useEffect(() => {
    calculateDepartmentStats()
  }, [allVoters, departments, activeTab])

  const fetchAllVotersForStats = async () => {
    try {
      const params = { page: 1, limit: 10000 }
      const response = await votersAPI.getAll(params)
      let votersArray = []
      if (response && response.data) {
        if (Array.isArray(response.data)) votersArray = response.data
        else if (response.data.voters) votersArray = response.data.voters
      }
      setAllVoters(votersArray)
    } catch {}
  }

  const fetchVoters = async () => {
    try {
      setLoading(true)
      setError("")
      const params = {
        page: pagination.currentPage,
        limit: pagination.limit,
        ...(selectedDepartment && { department: selectedDepartment }),
        ...(searchTerm.trim() && { search: searchTerm.trim() })
      }
      let response = await votersAPI.getAll(params)
      let votersArray = []
      let totalCount = 0
      let totalPages = 1
      let currentPage = 1
      if (response && response.data) {
        votersArray = Array.isArray(response.data) ? response.data : (response.data.voters || [])
        totalCount = response.pagination?.totalRecords || votersArray.length
        totalPages = response.pagination?.total || 1
        currentPage = response.pagination?.current || 1
      }
      votersArray = votersArray.filter(voter =>
        activeTab === "active" ? voter.isActive !== false : voter.isActive === false
      )
      votersArray.sort((a, b) => new Date(b.createdAt || b._id) - new Date(a.createdAt || a._id))
      setVoters(votersArray)
      setPagination(prev => ({
        ...prev,
        totalPages: Math.max(1, totalPages),
        totalVoters: totalCount,
        currentPage: currentPage
      }))
    } catch (error) {
      setError(`Failed to fetch voters: ${error.message || 'Unknown error'}`)
      setVoters([])
    } finally {
      setLoading(false)
    }
  }

  const fetchDepartments = async () => {
    try {
      const response = await departmentsAPI.getAll()
      let departmentsArray = []
      if (response) {
        if (Array.isArray(response)) departmentsArray = response
        else if (response.departments && Array.isArray(response.departments)) departmentsArray = response.departments
        else if (response.data && Array.isArray(response.data)) departmentsArray = response.data
        else if (response.success && response.data) {
          if (Array.isArray(response.data)) departmentsArray = response.data
          else if (response.data.departments) departmentsArray = response.data.departments
        }
      }
      setDepartments(departmentsArray)
    } catch {
      setDepartments([])
    }
  }

  const calculateDepartmentStats = () => {
    if (!Array.isArray(allVoters) || !Array.isArray(departments) || departments.length === 0) {
      setDepartmentStats({})
      return
    }
    const stats = {}
    departments.forEach(dept => {
      stats[dept._id] = {
        count: 0,
        departmentCode: dept.departmentCode || 'N/A',
        departmentName: dept.departmentName || dept.degreeProgram || 'Unknown Department',
        college: dept.college || ''
      }
    })
    allVoters.forEach(voter => {
      const isActiveVoter = voter.isActive !== false
      const shouldCount = (activeTab === 'active' && isActiveVoter) || (activeTab === 'inactive' && !isActiveVoter)
      if (shouldCount && voter.departmentId) {
        const deptId = typeof voter.departmentId === 'string'
          ? voter.departmentId
          : voter.departmentId._id
        if (stats[deptId]) stats[deptId].count++
      }
    })
    setDepartmentStats(stats)
  }

  const resetForm = () => {
    setFormData({
      schoolId: "",
      firstName: "",
      middleName: "",
      lastName: "",
      departmentId: ""
    })
  }

  const resetBulkForms = () => {
    setBulkForms([{
      schoolId: "",
      firstName: "",
      middleName: "",
      lastName: "",
      departmentId: ""
    }])
  }

  // Fix: always treat schoolId as number (strip leading zeros)
  const sanitizeSchoolId = val => {
    if (!val) return ""
    const cleaned = String(val).replace(/^0+/, "") // remove leading zeros
    return cleaned.replace(/\D/g, "") // remove non-digit
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === "schoolId" ? sanitizeSchoolId(value) : value,
    }))
  }

  const handleBulkInputChange = (index, field, value) => {
    const newBulkForms = [...bulkForms]
    newBulkForms[index][field] = field === "schoolId" ? sanitizeSchoolId(value) : value
    setBulkForms(newBulkForms)
  }

  const addBulkForm = () => {
    setBulkForms([...bulkForms, {
      schoolId: "",
      firstName: "",
      middleName: "",
      lastName: "",
      departmentId: ""
    }])
  }

  const removeBulkForm = (index) => {
    if (bulkForms.length > 1) {
      setBulkForms(bulkForms.filter((_, i) => i !== index))
    }
  }

  const handleAPIError = (error) => {
    if (error.response?.data?.message) {
      const message = error.response.data.message.toLowerCase()
      if (message.includes('already exists') || message.includes('duplicate')) {
        return 'A voter with this School ID already exists. Please use a different School ID.'
      }
    }
    return error.message || 'An unexpected error occurred'
  }

  const refreshData = async () => {
    await Promise.all([fetchVoters(), fetchAllVotersForStats()])
  }

  // Check for duplicate schoolId in current voters before API call
  const isSchoolIdTaken = (schoolId, excludeId = null) => {
    return allVoters.some(
      v => String(v.schoolId) === String(schoolId) && (!excludeId || v._id !== excludeId)
    )
  }

  const handleAddVoter = async (e) => {
    e.preventDefault()
    const cleanSchoolId = sanitizeSchoolId(formData.schoolId)
    if (!cleanSchoolId) {
      showAlert("error", "Invalid School ID", "School ID is required.")
      return
    }
    if (isSchoolIdTaken(cleanSchoolId)) {
      showAlert("error", "Duplicate School ID", "A voter with this School ID already exists.")
      return
    }
    try {
      setLoading(true)
      await votersAPI.create({ ...formData, schoolId: cleanSchoolId })
      setShowAddModal(false)
      resetForm()
      await refreshData()
      showAlert("success", "Success!", "Voter added successfully")
    } catch (error) {
      showAlert("error", "Error!", handleAPIError(error))
    } finally {
      setLoading(false)
    }
  }

  const handleBulkAdd = async (e) => {
    e.preventDefault()
    // Remove empty forms
    const validForms = bulkForms
      .map(f => ({ ...f, schoolId: sanitizeSchoolId(f.schoolId) }))
      .filter(form =>
        form.schoolId?.trim() && form.firstName?.trim() && form.lastName?.trim() && form.departmentId
      )
    if (validForms.length === 0) {
      showAlert("warning", "Warning!", "Please fill at least one complete form")
      return
    }
    // Check for duplicates within the batch
    const schoolIds = validForms.map(f => f.schoolId)
    const duplicateBatch = schoolIds.filter((id, idx) => schoolIds.indexOf(id) !== idx)
    if (duplicateBatch.length > 0) {
      showAlert("error", "Duplicate School IDs!", `Duplicated within batch: ${[...new Set(duplicateBatch)].join(", ")}`)
      return
    }
    // Check for existing schoolIds in current database
    const existingIds = schoolIds.filter(id => isSchoolIdTaken(id))
    if (existingIds.length > 0) {
      showAlert("error", "Duplicate School IDs!", `These School IDs already exist: ${existingIds.join(", ")}.`)
      return
    }
    try {
      setLoading(true)
      const result = await votersAPI.bulkCreate({ voters: validForms })
      setShowBulkModal(false)
      resetBulkForms()
      await refreshData()
      // API may return errors for duplicates detected at backend
      if (result.errors && result.errors.length > 0) {
        const errorMessages = result.errors.map(err =>
          `Row ${err.index + 1}: ${err.error}`
        ).join('\n')
        showAlert("warning", "Partial Success",
          `${result.summary.successful} voters added successfully.\n${result.summary.failed} failed:\n${errorMessages}`)
      } else {
        showAlert("success", "Success!", `${validForms.length} voters added successfully`)
      }
    } catch (error) {
      showAlert("error", "Error!", handleAPIError(error))
    } finally {
      setLoading(false)
    }
  }

  const handleEditVoter = async (e) => {
    e.preventDefault()
    const cleanSchoolId = sanitizeSchoolId(formData.schoolId)
    if (!cleanSchoolId) {
      showAlert("error", "Invalid School ID", "School ID is required.")
      return
    }
    if (isSchoolIdTaken(cleanSchoolId, editingVoter._id)) {
      showAlert("error", "Duplicate School ID", "A voter with this School ID already exists.")
      return
    }
    try {
      setLoading(true)
      await votersAPI.update(editingVoter._id, { ...formData, schoolId: cleanSchoolId })
      setShowEditModal(false)
      setEditingVoter(null)
      resetForm()
      await refreshData()
      showAlert("success", "Success!", "Voter updated successfully")
    } catch (error) {
      showAlert("error", "Error!", handleAPIError(error))
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (voter) => {
    setEditingVoter(voter)
    setFormData({
      schoolId: voter.schoolId ? String(voter.schoolId) : "",
      firstName: voter.firstName || "",
      middleName: voter.middleName || "",
      lastName: voter.lastName || "",
      departmentId: (voter.departmentId?._id || voter.departmentId) || ""
    })
    setShowEditModal(true)
  }

  const handleDelete = async (voterId) => {
    const confirmed = await showConfirm(
      "Are you sure?",
      "This action cannot be undone!",
      "Yes, delete it!"
    )
    if (!confirmed) return
    try {
      setLoading(true)
      await votersAPI.delete(voterId)
      await refreshData()
      showAlert("success", "Deleted!", "Voter has been deleted successfully")
    } catch (error) {
      showAlert("error", "Error!", handleAPIError(error))
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async (voterId, currentStatus) => {
    const action = currentStatus ? 'deactivate' : 'activate'
    const confirmed = await showConfirm(
      `${action.charAt(0).toUpperCase() + action.slice(1)} voter?`,
      `This will ${action} the voter.`,
      `Yes, ${action} it!`
    )
    if (!confirmed) return
    try {
      setLoading(true)
      if (currentStatus) {
        await votersAPI.deactivate(voterId)
      } else {
        await votersAPI.update(voterId, { isActive: true })
      }
      await refreshData()
      showAlert("success", "Success!", `Voter has been ${action}d successfully`)
    } catch (error) {
      showAlert("error", "Error!", handleAPIError(error))
    } finally {
      setLoading(false)
    }
  }

  const handleDepartmentCardClick = (departmentId) => {
    setSelectedDepartment(selectedDepartment === departmentId ? "" : departmentId)
    setPagination(prev => ({ ...prev, currentPage: 1 }))
  }

  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
  }

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, currentPage: newPage }))
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setSelectedDepartment("")
    setSearchTerm("")
    setPagination(prev => ({ ...prev, currentPage: 1 }))
  }

  const handleExport = async () => {
    try {
      const params = {
        format: 'pdf',
        ...(selectedDepartment && { department: selectedDepartment }),
        ...(searchTerm.trim() && { search: searchTerm.trim() })
      }
      let response = await votersAPI.exportVoters(params)
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `voters-${activeTab}-${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      showAlert("success", "Success!", "Voters exported successfully")
    } catch (error) {
      showAlert("error", "Error!", "Failed to export voters")
    }
  }

  const getDepartmentCardColor = (index) => {
    const colors = [
      "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200",
      "bg-green-100 text-green-800 border-green-200 hover:bg-green-200",
      "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200",
      "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200",
      "bg-pink-100 text-pink-800 border-pink-200 hover:bg-pink-200",
      "bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200",
      "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200",
      "bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-200"
    ]
    return colors[index % colors.length]
  }

  const closeModals = () => {
    setShowAddModal(false)
    setShowBulkModal(false)
    setShowEditModal(false)
    setEditingVoter(null)
    resetForm()
    resetBulkForms()
  }

  const departmentsWithVoters = Object.entries(departmentStats)
    .filter(([_, stats]) => stats.count > 0)
    .sort((a, b) => b[1].count - a[1].count)

  if (loading && voters.length === 0) {
    return (
      <div className="min-h-screen bg-transparent p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-[#001f65]" />
            <span className="ml-2 text-[#001f65]">Loading voters...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-transparent p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50/90 backdrop-blur-sm border border-red-200 rounded-2xl p-4 flex items-start">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <p className="text-red-600 text-sm font-medium">Error Loading Data</p>
              <p className="text-red-500 text-sm mt-1">{error}</p>
              <button 
                onClick={() => {
                  setError("")
                  loadInitialData()
                }}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-transparent p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl font-bold text-[#001f65] mb-2">Voter Management</h1>
              <p className="text-[#001f65]/80">Manage student voters and their information</p>
            </div>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex space-x-1 bg-gray-100/90 backdrop-blur-sm p-1 rounded-lg w-fit border border-white/20">
          <button
            onClick={() => handleTabChange('active')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'active'
                ? 'bg-white text-[#001f65] shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <UserCheck className="w-4 h-4 inline mr-2" />
            Active Voters
          </button>
          <button
            onClick={() => handleTabChange('inactive')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'inactive'
                ? 'bg-white text-red-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <UserX className="w-4 h-4 inline mr-2" />
            Inactive Voters
          </button>
        </div>

        {/* Department Cards */}
        {departmentsWithVoters.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {departmentsWithVoters.map(([departmentId, stats], index) => (
              <div
                key={departmentId}
                onClick={() => handleDepartmentCardClick(departmentId)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                  selectedDepartment === departmentId
                    ? getDepartmentCardColor(index) + " ring-2 ring-offset-2 ring-[#001f65]"
                    : getDepartmentCardColor(index) + " hover:scale-105"
                }`}
              >
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Users className="w-5 h-5 mr-1" />
                    <h3 className="text-lg font-bold">{stats.departmentCode}</h3>
                  </div>
                  <p className="text-2xl font-bold">{stats.count}</p>
                  <p className="text-xs opacity-75 mt-1 line-clamp-2">
                    {stats.departmentName}
                  </p>
                  {stats.college && (
                    <p className="text-xs opacity-60 mt-1">{stats.college}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Main Table */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
          {/* Table Header with Search, Export, and Add Buttons */}
          <div className="p-6 border-b border-gray-200/50">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center space-y-4 lg:space-y-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
  type="text"
  placeholder="Search voters by name or school ID..."
  value={searchTerm}
  onChange={handleSearch}
  onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent w-full lg:w-80"
/>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleExport}
                  className="w-full sm:w-auto px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export PDF
                </button>
                <button
                  onClick={() => {
                    resetBulkForms()
                    setShowBulkModal(true)
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Bulk Add
                </button>
                <button
                  onClick={() => {
                    resetForm()
                    setShowAddModal(true)
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-[#001f65] hover:bg-[#003399] text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Voter
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200/50">
              <thead className="bg-[#b0c8fe]/10">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-[#001f65] uppercase tracking-wider">
                    School ID
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-[#001f65] uppercase tracking-wider">
                    Full Name
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-[#001f65] uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-[#001f65] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-[#001f65] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white/50 divide-y divide-gray-200/50">
                {voters.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-3 sm:px-6 py-8 text-center text-[#001f65]/60">
                      <Users className="mx-auto h-12 w-12 text-[#001f65]/40 mb-4" />
                      {searchTerm ? (
                        <>
                          No voters found matching "{searchTerm}".
                          <button
                            onClick={() => setSearchTerm('')}
                            className="block mx-auto mt-2 text-[#001f65] hover:underline"
                          >
                            Clear search
                          </button>
                        </>
                      ) : (
                        'No voters available. Click "Add Voter" to create your first voter.'
                      )}
                    </td>
                  </tr>
                ) : (
                  voters.map((voter) => (
                    <tr key={voter._id} className="hover:bg-[#b0c8fe]/10">
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-[#001f65]">
                        {voter.schoolId || 'N/A'}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-[#001f65]">
                        {`${voter.firstName || ''} ${voter.middleName || ''} ${voter.lastName || ''}`.trim() || 'N/A'}
                      </td>
                      <td className="px-3 sm:px-6 py-4 text-sm text-[#001f65]">
                        <div className="font-medium">
                          {voter.departmentId?.departmentCode || "N/A"}
                        </div>
                        <div className="text-xs text-[#001f65]/60">
                          {voter.departmentId?.college || ""}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleStatus(voter._id, voter.isActive)}
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full transition-colors ${
                            voter.isActive 
                              ? "bg-green-100 text-green-800 hover:bg-green-200" 
                              : "bg-red-100 text-red-800 hover:bg-red-200"
                          }`}
                        >
                          {voter.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(voter)}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1 transition-colors"
                          >
                            <Edit className="w-3 h-3" />
                            <span className="hidden sm:inline">Edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(voter._id)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span className="hidden sm:inline">Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-3 border-t border-gray-200/50 flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage <= 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-[#001f65] bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage >= pagination.totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-[#001f65] bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-[#001f65]">
                    Showing{' '}
                    <span className="font-medium">
                      {(pagination.currentPage - 1) * pagination.limit + 1}
                    </span>{' '}
                    to{' '}
                    <span className="font-medium">
                      {Math.min(pagination.currentPage * pagination.limit, pagination.totalVoters)}
                    </span>{' '}
                    of{' '}
                    <span className="font-medium">{pagination.totalVoters}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      disabled={pagination.currentPage <= 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-[#001f65] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      const page = i + Math.max(1, pagination.currentPage - 2)
                      if (page > pagination.totalPages) return null
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            page === pagination.currentPage
                              ? "z-10 bg-[#001f65] border-[#001f65] text-white"
                              : "bg-white border-gray-300 text-[#001f65] hover:bg-gray-50"
                          }`}
                        >
                          {page}
                        </button>
                      )
                    })}
                    <button
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      disabled={pagination.currentPage >= pagination.totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-[#001f65] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Add Voter Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-white/20">
              <div className="flex justify-between items-center p-6 border-b border-gray-200/50">
                <h3 className="text-lg font-semibold text-[#001f65]">Add New Voter</h3>
                <button
                  onClick={closeModals}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6">
                <form onSubmit={handleAddVoter} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#001f65] mb-1">
                      School ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="schoolId"
                      value={formData.schoolId}
                      onChange={handleInputChange}
                      maxLength={8}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001f65] focus:border-transparent"
                      placeholder="Enter 8-digit school ID"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#001f65] mb-1">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001f65] focus:border-transparent"
                        placeholder="First name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#001f65] mb-1">
                        Middle Name
                      </label>
                      <input
                        type="text"
                        name="middleName"
                        value={formData.middleName}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001f65] focus:border-transparent"
                        placeholder="Middle name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#001f65] mb-1">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001f65] focus:border-transparent"
                        placeholder="Last name"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#001f65] mb-1">
                      Department <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="departmentId"
                      value={formData.departmentId}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001f65] focus:border-transparent"
                    >
                      <option value="">Select a department</option>
                      {departments.map((department) => (
                        <option key={department._id} value={department._id}>
                          {department.departmentCode} - {department.departmentName || department.degreeProgram}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={closeModals}
                      className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full sm:w-auto px-4 py-2 bg-[#001f65] text-white rounded-lg hover:bg-[#003399] focus:outline-none focus:ring-2 focus:ring-[#001f65] transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Adding...' : 'Add Voter'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Add Modal */}
        {showBulkModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto border border-white/20">
              <div className="flex justify-between items-center p-6 border-b border-gray-200/50">
                <h3 className="text-lg font-semibold text-[#001f65]">Bulk Add Voters</h3>
                <button
                  onClick={closeModals}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6">
                <form onSubmit={handleBulkAdd} className="space-y-4">
                  {bulkForms.map((form, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 relative">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-sm font-medium text-[#001f65]">Voter {index + 1}</h4>
                        {bulkForms.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeBulkForm(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-5 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-[#001f65] mb-1">
                            School ID <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={form.schoolId}
                            onChange={(e) => handleBulkInputChange(index, 'schoolId', e.target.value)}
                            maxLength={8}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#001f65] focus:border-transparent text-sm"
                            placeholder="School ID"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#001f65] mb-1">
                            First Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={form.firstName}
                            onChange={(e) => handleBulkInputChange(index, 'firstName', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#001f65] focus:border-transparent text-sm"
                            placeholder="First name"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#001f65] mb-1">
                            Middle Name
                          </label>
                          <input
                            type="text"
                            value={form.middleName}
                            onChange={(e) => handleBulkInputChange(index, 'middleName', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#001f65] focus:border-transparent text-sm"
                            placeholder="Middle name"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#001f65] mb-1">
                            Last Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={form.lastName}
                            onChange={(e) => handleBulkInputChange(index, 'lastName', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#001f65] focus:border-transparent text-sm"
                            placeholder="Last name"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#001f65] mb-1">
                            Department <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={form.departmentId}
                            onChange={(e) => handleBulkInputChange(index, 'departmentId', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#001f65] focus:border-transparent text-sm"
                          >
                            <option value="">Select department</option>
                            {departments.map((department) => (
                              <option key={department._id} value={department._id}>
                                {department.departmentCode} - {department.departmentName || department.degreeProgram}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addBulkForm}
                    className="w-full px-4 py-2 border-2 border-dashed border-[#001f65] text-[#001f65] rounded-lg hover:bg-[#001f65]/10 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Another Voter
                  </button>
                  <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={closeModals}
                      className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full sm:w-auto px-4 py-2 bg-[#001f65] text-white rounded-lg hover:bg-[#003399] focus:outline-none focus:ring-2 focus:ring-[#001f65] transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Adding...' : 'Add All Voters'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Edit Voter Modal */}
        {showEditModal && editingVoter && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-white/20">
              <div className="flex justify-between items-center p-6 border-b border-gray-200/50">
                <h3 className="text-lg font-semibold text-[#001f65]">Edit Voter</h3>
                <button
                  onClick={closeModals}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6">
                <form onSubmit={handleEditVoter} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#001f65] mb-1">
                      School ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="schoolId"
                      value={formData.schoolId}
                      onChange={handleInputChange}
                      maxLength={8}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001f65] focus:border-transparent"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#001f65] mb-1">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001f65] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#001f65] mb-1">
                        Middle Name
                      </label>
                      <input
                        type="text"
                        name="middleName"
                        value={formData.middleName}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001f65] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#001f65] mb-1">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001f65] focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#001f65] mb-1">
                      Department <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="departmentId"
                      value={formData.departmentId}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001f65] focus:border-transparent"
                    >
                      <option value="">Select a department</option>
                      {departments.map((department) => (
                        <option key={department._id} value={department._id}>
                          {department.departmentCode} - {department.departmentName || department.degreeProgram}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={closeModals}
                      className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full sm:w-auto px-4 py-2 bg-[#001f65] text-white rounded-lg hover:bg-[#003399] focus:outline-none focus:ring-2 focus:ring-[#001f65] transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Updating...' : 'Update Voter'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}