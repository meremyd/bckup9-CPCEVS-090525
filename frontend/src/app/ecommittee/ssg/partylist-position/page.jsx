"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { positionsAPI } from "@/lib/api/positions"
import { partylistsAPI } from "@/lib/api/partylists"
import SSGLayout from "@/components/SSGLayout"
import Swal from 'sweetalert2'
import { 
  Users,
  Flag,
  Plus,
  Edit,
  Trash2,
  Eye,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Search,
  Filter,
  MoreVertical,
  Building2
} from "lucide-react"

export default function SSGPositionsPartylistsPage() {
  const [activeTab, setActiveTab] = useState('positions')
  const [positions, setPositions] = useState([])
  const [partylists, setPartylists] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const router = useRouter()
  const searchParams = useSearchParams()
  const ssgElectionId = searchParams.get('ssgElectionId')

  useEffect(() => {
    const token = localStorage.getItem("token")
    const userData = localStorage.getItem("user")

    if (!token || !userData) {
      router.push("/adminlogin")
      return
    }

    try {
      const parsedUser = JSON.parse(userData)
      if (parsedUser.userType !== "election_committee") {
        router.push("/adminlogin")
        return
      }
    } catch (parseError) {
      console.error("Error parsing user data:", parseError)
      router.push("/adminlogin")
      return
    }

    if (ssgElectionId) {
      fetchData()
    }
  }, [ssgElectionId, router])

  const fetchData = async () => {
    setLoading(true)
    setError('')
    
    try {
      await Promise.all([
        fetchPositions(),
        fetchPartylists()
      ])
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPositions = async () => {
    try {
      const response = await positionsAPI.ssg.getByElection(ssgElectionId)
      setPositions(response.positions || [])
    } catch (error) {
      console.error("Error fetching positions:", error)
      handleAPIError(error, 'Failed to load positions')
    }
  }

  const fetchPartylists = async () => {
    try {
      const response = await partylistsAPI.getBySSGElection(ssgElectionId)
      setPartylists(response.partylists || [])
    } catch (error) {
      console.error("Error fetching partylists:", error)
      handleAPIError(error, 'Failed to load partylists')
    }
  }

  const handleAPIError = (error, defaultMessage) => {
    let errorMessage = defaultMessage

    if (error.response?.status === 429) {
      errorMessage = "Too many requests. Please try again in a moment."
    } else if (error.response?.status >= 500) {
      errorMessage = "Server error. Please try again later."
    } else if (error.code === 'NETWORK_ERROR' || !navigator.onLine) {
      errorMessage = "Network error. Please check your connection."
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message
    } else if (error.message) {
      errorMessage = error.message
    }

    setError(errorMessage)
    
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: errorMessage,
      confirmButtonColor: '#001f65'
    })
  }

  const handleCreatePosition = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'Create New Position',
      html: `
        <div class="space-y-4 text-left">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Position Name *</label>
            <input id="positionName" class="swal2-input" placeholder="e.g., President" required>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea id="description" class="swal2-textarea" placeholder="Position description..."></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Display Order</label>
            <input id="displayOrder" class="swal2-input" type="number" placeholder="1" min="1">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Create Position',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#001f65',
      cancelButtonColor: '#6b7280',
      preConfirm: () => {
        const positionName = document.getElementById('positionName').value
        const description = document.getElementById('description').value
        const displayOrder = document.getElementById('displayOrder').value

        if (!positionName.trim()) {
          Swal.showValidationMessage('Position name is required')
          return false
        }

        return {
          positionName: positionName.trim(),
          description: description.trim(),
          displayOrder: displayOrder ? parseInt(displayOrder) : positions.length + 1,
          ssgElectionId
        }
      }
    })

    if (formValues) {
      try {
        setLoading(true)
        await positionsAPI.ssg.create(formValues)
        
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Position created successfully!',
          timer: 2000,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        })
        
        await fetchPositions()
      } catch (error) {
        handleAPIError(error, 'Failed to create position')
      } finally {
        setLoading(false)
      }
    }
  }

  const handleCreatePartylist = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'Create New Partylist',
      html: `
        <div class="space-y-4 text-left">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Partylist Name *</label>
            <input id="partylistName" class="swal2-input" placeholder="e.g., Unity Party" required>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Platform</label>
            <textarea id="platform" class="swal2-textarea" placeholder="Partylist platform and goals..."></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Color Code</label>
            <input id="colorCode" class="swal2-input" type="color" value="#001f65">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Create Partylist',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#001f65',
      cancelButtonColor: '#6b7280',
      preConfirm: () => {
        const partylistName = document.getElementById('partylistName').value
        const platform = document.getElementById('platform').value
        const colorCode = document.getElementById('colorCode').value

        if (!partylistName.trim()) {
          Swal.showValidationMessage('Partylist name is required')
          return false
        }

        return {
          partylistName: partylistName.trim(),
          platform: platform.trim(),
          colorCode,
          ssgElectionId
        }
      }
    })

    if (formValues) {
      try {
        setLoading(true)
        await partylistsAPI.create(formValues)
        
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Partylist created successfully!',
          timer: 2000,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        })
        
        await fetchPartylists()
      } catch (error) {
        handleAPIError(error, 'Failed to create partylist')
      } finally {
        setLoading(false)
      }
    }
  }

  const handleEditPosition = async (position) => {
    const { value: formValues } = await Swal.fire({
      title: 'Edit Position',
      html: `
        <div class="space-y-4 text-left">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Position Name *</label>
            <input id="positionName" class="swal2-input" value="${position.positionName}" required>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea id="description" class="swal2-textarea">${position.description || ''}</textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Display Order</label>
            <input id="displayOrder" class="swal2-input" type="number" value="${position.displayOrder || ''}" min="1">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Update Position',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#001f65',
      cancelButtonColor: '#6b7280',
      preConfirm: () => {
        const positionName = document.getElementById('positionName').value
        const description = document.getElementById('description').value
        const displayOrder = document.getElementById('displayOrder').value

        if (!positionName.trim()) {
          Swal.showValidationMessage('Position name is required')
          return false
        }

        return {
          positionName: positionName.trim(),
          description: description.trim(),
          displayOrder: displayOrder ? parseInt(displayOrder) : undefined
        }
      }
    })

    if (formValues) {
      try {
        setLoading(true)
        await positionsAPI.ssg.update(position._id, formValues)
        
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Position updated successfully!',
          timer: 2000,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        })
        
        await fetchPositions()
      } catch (error) {
        handleAPIError(error, 'Failed to update position')
      } finally {
        setLoading(false)
      }
    }
  }

  const handleEditPartylist = async (partylist) => {
    const { value: formValues } = await Swal.fire({
      title: 'Edit Partylist',
      html: `
        <div class="space-y-4 text-left">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Partylist Name *</label>
            <input id="partylistName" class="swal2-input" value="${partylist.partylistName}" required>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Platform</label>
            <textarea id="platform" class="swal2-textarea">${partylist.platform || ''}</textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Color Code</label>
            <input id="colorCode" class="swal2-input" type="color" value="${partylist.colorCode || '#001f65'}">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Update Partylist',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#001f65',
      cancelButtonColor: '#6b7280',
      preConfirm: () => {
        const partylistName = document.getElementById('partylistName').value
        const platform = document.getElementById('platform').value
        const colorCode = document.getElementById('colorCode').value

        if (!partylistName.trim()) {
          Swal.showValidationMessage('Partylist name is required')
          return false
        }

        return {
          partylistName: partylistName.trim(),
          platform: platform.trim(),
          colorCode
        }
      }
    })

    if (formValues) {
      try {
        setLoading(true)
        await partylistsAPI.update(partylist._id, formValues)
        
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Partylist updated successfully!',
          timer: 2000,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        })
        
        await fetchPartylists()
      } catch (error) {
        handleAPIError(error, 'Failed to update partylist')
      } finally {
        setLoading(false)
      }
    }
  }

  const handleDeletePosition = async (position) => {
    const result = await Swal.fire({
      title: 'Delete Position?',
      text: `Are you sure you want to delete "${position.positionName}"? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel'
    })

    if (result.isConfirmed) {
      try {
        setLoading(true)
        await positionsAPI.ssg.delete(position._id)
        
        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: 'Position deleted successfully!',
          timer: 2000,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        })
        
        await fetchPositions()
      } catch (error) {
        handleAPIError(error, 'Failed to delete position')
      } finally {
        setLoading(false)
      }
    }
  }

  const handleDeletePartylist = async (partylist) => {
    const result = await Swal.fire({
      title: 'Delete Partylist?',
      text: `Are you sure you want to delete "${partylist.partylistName}"? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel'
    })

    if (result.isConfirmed) {
      try {
        setLoading(true)
        await partylistsAPI.delete(partylist._id)
        
        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: 'Partylist deleted successfully!',
          timer: 2000,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        })
        
        await fetchPartylists()
      } catch (error) {
        handleAPIError(error, 'Failed to delete partylist')
      } finally {
        setLoading(false)
      }
    }
  }

  const filteredPositions = positions.filter(position => {
    const matchesSearch = position.positionName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         position.description?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const filteredPartylists = partylists.filter(partylist => {
    const matchesSearch = partylist.partylistName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         partylist.platform?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  if (!ssgElectionId) {
    return (
      <SSGLayout
        ssgElectionId={null}
        title="Positions & Partylists Management"
        subtitle="Position and Partylist Configuration"
        activeItem="positions"
      >
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20">
            <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Election Selected</h3>
            <p className="text-white/80 mb-6">Please select an election to manage positions and partylists.</p>
            <button
              onClick={() => router.push('/ecommittee/ssg')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Back to Elections
            </button>
          </div>
        </div>
      </SSGLayout>
    )
  }

  return (
    <SSGLayout
      ssgElectionId={ssgElectionId}
      title="Positions & Partylists Management"
      subtitle="Position and Partylist Configuration"
      activeItem="positions"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Tab Navigation */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('positions')}
              className={`flex items-center px-6 py-4 text-sm font-medium ${
                activeTab === 'positions'
                  ? 'border-b-2 border-[#001f65] text-[#001f65] bg-blue-50/50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Users className="w-5 h-5 mr-2" />
              Positions ({positions.length})
            </button>
            <button
              onClick={() => setActiveTab('partylists')}
              className={`flex items-center px-6 py-4 text-sm font-medium ${
                activeTab === 'partylists'
                  ? 'border-b-2 border-[#001f65] text-[#001f65] bg-blue-50/50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Flag className="w-5 h-5 mr-2" />
              Partylists ({partylists.length})
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          {/* Header with Search and Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h2 className="text-xl font-bold text-[#001f65] flex items-center">
              {activeTab === 'positions' ? (
                <>
                  <Users className="w-6 h-6 mr-2" />
                  Election Positions
                </>
              ) : (
                <>
                  <Flag className="w-6 h-6 mr-2" />
                  Election Partylists
                </>
              )}
            </h2>

            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder={`Search ${activeTab}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent text-sm"
                />
              </div>
              
              <button
                onClick={activeTab === 'positions' ? handleCreatePosition : handleCreatePartylist}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-[#001f65] hover:bg-[#003399] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                {loading ? (
                  <Loader2 className="animate-spin rounded-full h-4 w-4 mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Add {activeTab === 'positions' ? 'Position' : 'Partylist'}
              </button>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin rounded-full h-8 w-8 text-[#001f65]" />
              <span className="ml-2 text-[#001f65]">Loading...</span>
            </div>
          )}

          {/* Positions Table */}
          {activeTab === 'positions' && !loading && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Position
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Candidates
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPositions.map((position) => (
                    <tr key={position._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{position.positionName}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 max-w-xs truncate">
                          {position.description || 'No description'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {position.displayOrder || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {position.candidateCount || 0} candidates
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEditPosition(position)}
                            className="text-indigo-600 hover:text-indigo-900 p-1"
                            title="Edit Position"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePosition(position)}
                            className="text-red-600 hover:text-red-900 p-1"
                            title="Delete Position"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredPositions.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                        {searchTerm ? 'No positions match your search.' : 'No positions found. Create your first position!'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Partylists Table */}
          {activeTab === 'partylists' && !loading && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Partylist
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Platform
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Color
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Candidates
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPartylists.map((partylist) => (
                    <tr key={partylist._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div 
                            className="w-4 h-4 rounded-full mr-3"
                            style={{ backgroundColor: partylist.colorCode || '#001f65' }}
                          ></div>
                          <div className="text-sm font-medium text-gray-900">{partylist.partylistName}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 max-w-xs truncate">
                          {partylist.platform || 'No platform specified'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 font-mono">
                          {partylist.colorCode || '#001f65'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {partylist.candidateCount || 0} candidates
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEditPartylist(partylist)}
                            className="text-indigo-600 hover:text-indigo-900 p-1"
                            title="Edit Partylist"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePartylist(partylist)}
                            className="text-red-600 hover:text-red-900 p-1"
                            title="Delete Partylist"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredPartylists.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                        {searchTerm ? 'No partylists match your search.' : 'No partylists found. Create your first partylist!'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-[#001f65] mb-2">Total Positions</h3>
                <p className="text-3xl font-bold text-[#001f65]">{positions.length}</p>
                <p className="text-sm text-gray-600 mt-1">Election positions configured</p>
              </div>
              <Users className="w-12 h-12 text-[#001f65]/20" />
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-[#001f65] mb-2">Total Partylists</h3>
                <p className="text-3xl font-bold text-[#001f65]">{partylists.length}</p>
                <p className="text-sm text-gray-600 mt-1">Political parties registered</p>
              </div>
              <Flag className="w-12 h-12 text-[#001f65]/20" />
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}
      </div>
    </SSGLayout>
  )
}