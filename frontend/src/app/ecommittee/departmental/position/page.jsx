"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { positionsAPI } from "@/lib/api/positions"
import { departmentalElectionsAPI } from "@/lib/api/departmentalElections"
import DepartmentalLayout from "@/components/DepartmentalLayout"
import Swal from 'sweetalert2'
import { 
  Users,
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  Loader2,
  Search
} from "lucide-react"

export default function DepartmentalPositionsPage() {
  const [positions, setPositions] = useState([])
  const [deptElectionData, setDeptElectionData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const router = useRouter()
  const searchParams = useSearchParams()
  const deptElectionId = searchParams.get('deptElectionId')

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

    if (deptElectionId) {
      fetchData()
    } else {
      router.push('/ecommittee/departmental')
    }
  }, [deptElectionId, router])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError('')
      console.log('Fetching data for Departmental election:', deptElectionId)

      await Promise.all([
        fetchPositions(),
        fetchElectionData()
      ])
    } catch (error) {
      console.error("Error fetching data:", error)
      setError('Failed to load data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fetchPositions = async () => {
    try {
      console.log('Fetching positions for Departmental election:', deptElectionId)
      
      if (!deptElectionId || deptElectionId.length !== 24) {
        console.error('Invalid Departmental Election ID:', deptElectionId)
        throw new Error('Invalid Departmental Election ID')
      }
      
      const timestamp = new Date().getTime()
      const response = await positionsAPI.departmental.getByElection(deptElectionId, { 
        _t: timestamp 
      })
      
      console.log('Positions API response:', response)
      
      let positionsData = []
      if (response.data?.positions) {
        positionsData = response.data.positions
      } else if (response.positions) {
        positionsData = response.positions
      } else if (Array.isArray(response.data)) {
        positionsData = response.data
      } else if (Array.isArray(response)) {
        positionsData = response
      }

      console.log('Processed positions data:', positionsData)
      setPositions(positionsData)
      
      if (response.data?.election || response.election) {
        setDeptElectionData(response.data?.election || response.election)
      }
      
    } catch (error) {
      console.error("Error fetching positions:", error)
      handleAPIError(error, 'Failed to load positions')
      setPositions([])
    }
  }

  const fetchElectionData = async () => {
    try {
      if (!deptElectionData) {
        console.log('Fetching election data separately...')
        const electionResponse = await departmentalElectionsAPI.getById(deptElectionId)
        
        let electionData = null
        if (electionResponse.data) {
          electionData = electionResponse.data
        } else if (electionResponse.election) {
          electionData = electionResponse.election
        } else {
          electionData = electionResponse
        }
        
        console.log('Election data:', electionData)
        setDeptElectionData(electionData)
      }
    } catch (electionError) {
      console.warn('Could not fetch election details:', electionError)
    }
  }

  const handleAPIError = (error, defaultMessage) => {
    console.error('Full error object:', error)
    console.error('Error response:', error.response)
    console.error('Error request:', error.request)
    console.error('Error message:', error.message)
    
    let errorMessage = defaultMessage
    let detailedMessage = ''

    if (error.response) {
      // Server responded with error status
      console.error('Response status:', error.response.status)
      console.error('Response data:', error.response.data)
      
      if (error.response.status === 429) {
        errorMessage = "Too many requests. Please try again in a moment."
      } else if (error.response.status >= 500) {
        errorMessage = "Server error. Please try again later."
      } else if (error.response.status === 401) {
        errorMessage = "Authentication failed. Please login again."
      } else if (error.response.status === 403) {
        errorMessage = "Access denied. You don't have permission to perform this action."
      } else if (error.response.data?.message) {
        errorMessage = error.response.data.message
      }
      
      detailedMessage = `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`
    } else if (error.request) {
      // Network error - request was made but no response
      console.error('Network error - no response received')
      errorMessage = "Network error. Please check your connection and server status."
      detailedMessage = "No response received from server"
    } else {
      // Something else happened
      errorMessage = error.message || defaultMessage
      detailedMessage = error.message
    }

    setError(errorMessage)
    
    // Show detailed error in development/console
    console.error('Processed error message:', errorMessage)
    console.error('Detailed message:', detailedMessage)
    
    Swal.fire({
      icon: 'error',
      title: 'Error Details',
      html: `
        <div class="text-left">
          <p class="font-medium mb-2">${errorMessage}</p>
          <details class="mt-2">
            <summary class="cursor-pointer text-sm text-gray-600">Technical Details</summary>
            <div class="mt-2 p-2 bg-gray-100 rounded text-xs">
              ${detailedMessage}
            </div>
          </details>
        </div>
      `,
      confirmButtonColor: '#001f65'
    })
  }

  const handleCreatePosition = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'Create New Position',
      html: `
        <div class="space-y-6 text-left max-w-md mx-auto">
          <div class="bg-gray-50 p-4 rounded-lg border">
            <label class="block text-sm font-medium text-gray-700 mb-2">Departmental Election</label>
            <div class="text-sm font-semibold text-[#001f65] bg-white p-2 rounded border">
              ${deptElectionData?.title || deptElectionData?.deptElectionId || 'Loading...'}
            </div>
            <div class="text-xs text-gray-500 mt-1">Election Year: ${deptElectionData?.electionYear || 'N/A'}</div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Position Name <span class="text-red-500">*</span></label>
            <input id="positionName" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent" placeholder="e.g., Class President, Vice President" required>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Position Order <span class="text-red-500">*</span></label>
            <input id="positionOrder" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent" type="number" placeholder="1" min="1" value="1" required>
            <div class="text-xs text-gray-500 mt-1">Display order in ballot (1 = first)</div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Max Votes</label>
            <input id="maxVotes" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent" type="number" placeholder="1" min="1" value="1">
            <div class="text-xs text-gray-500 mt-1">Maximum votes per voter for this position</div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Max Candidates</label>
            <input id="maxCandidates" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent" type="number" placeholder="10" min="1" value="10">
            <div class="text-xs text-gray-500 mt-1">Maximum total candidates for this position</div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2"></label>
            <textarea hidden id="description" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent resize-none" rows="3" placeholder="Position responsibilities and requirements..."></textarea>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Create Position',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#001f65',
      cancelButtonColor: '#6b7280',
      width: '500px',
      customClass: {
        popup: 'rounded-xl'
      },
      preConfirm: () => {
        const positionName = document.getElementById('positionName')?.value?.trim();
        const positionOrder = parseInt(document.getElementById('positionOrder')?.value || '1');
        const maxVotes = parseInt(document.getElementById('maxVotes')?.value || '1');
        const maxCandidates = parseInt(document.getElementById('maxCandidates')?.value || '10');
        const description = document.getElementById('description')?.value?.trim();

        if (!positionName) {
          Swal.showValidationMessage('Position name is required');
          return false;
        }

        if (isNaN(positionOrder) || positionOrder < 1) {
          Swal.showValidationMessage('Position order must be a valid number greater than 0');
          return false;
        }

        if (isNaN(maxVotes) || maxVotes < 1) {
          Swal.showValidationMessage('Max votes must be a valid number greater than 0');
          return false;
        }

        if (isNaN(maxCandidates) || maxCandidates < 1) {
          Swal.showValidationMessage('Max candidates must be a valid number greater than 0');
          return false;
        }

        if (!deptElectionId || deptElectionId.length !== 24) {
          Swal.showValidationMessage('Invalid Departmental Election ID');
          return false;
        }

        return {
          deptElectionId,
          positionName,
          positionOrder,
          maxVotes,
          maxCandidates,
          description: description || undefined
        };
      }
    });

    if (formValues) {
      try {
        setLoading(true);
        
        console.log('=== CREATING DEPARTMENTAL POSITION ===');
        console.log('Form values:', formValues);
        console.log('API endpoint: /positions/departmental');
        console.log('Request data:', JSON.stringify(formValues, null, 2));
        
        // Check authentication
        const token = localStorage.getItem("token");
        const userData = localStorage.getItem("user");
        console.log('Token exists:', !!token);
        console.log('User data:', userData);
        
        // Validate required fields again
        if (!formValues.deptElectionId) {
          throw new Error('Departmental Election ID is missing');
        }
        if (!formValues.positionName) {
          throw new Error('Position name is missing');
        }
        
        console.log('Making API call...');
        const result = await positionsAPI.departmental.create(formValues);
        console.log('Position created successfully:', result);
        
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Position created successfully!',
          timer: 2000,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        });
        
        await fetchPositions();
      } catch (error) {
        console.error('=== POSITION CREATION ERROR ===');
        console.error('Error creating position:', error);
        
        // Additional debugging info
        console.error('Error type:', typeof error);
        console.error('Error constructor:', error.constructor.name);
        
        if (error.isAxiosError) {
          console.error('This is an Axios error');
          console.error('Request config:', error.config);
          console.error('Request URL:', error.config?.url);
          console.error('Request method:', error.config?.method);
          console.error('Request data:', error.config?.data);
          console.error('Request headers:', error.config?.headers);
        }
        
        handleAPIError(error, 'Failed to create position');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleEditPosition = async (position) => {
    console.log('Editing position:', position)
    
    const { value: formValues } = await Swal.fire({
      title: 'Edit Position',
      html: `
        <div class="space-y-6 text-left max-w-md mx-auto">
          <div class="bg-gray-50 p-4 rounded-lg border">
            <label class="block text-sm font-medium text-gray-700 mb-2">Departmental Election</label>
            <div class="text-sm font-semibold text-[#001f65] bg-white p-2 rounded border">
              ${deptElectionData?.title || deptElectionData?.deptElectionId || 'Loading...'}
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Position Name <span class="text-red-500">*</span></label>
            <input id="positionName" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent" value="${position.positionName || ''}" required>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Position Order <span class="text-red-500">*</span></label>
            <input id="positionOrder" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent" type="number" value="${position.positionOrder || 1}" min="1" required>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Max Votes</label>
            <input id="maxVotes" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent" type="number" value="${position.maxVotes || 1}" min="1">
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Max Candidates</label>
            <input id="maxCandidates" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent" type="number" value="${position.maxCandidates || 10}" min="1">
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2"></label>
            <textarea hidden id="description" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent resize-none" rows="3">${position.description || ''}</textarea>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Update Position',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#001f65',
      cancelButtonColor: '#6b7280',
      width: '500px',
      customClass: {
        popup: 'rounded-xl'
      },
      preConfirm: () => {
        const positionName = document.getElementById('positionName')?.value?.trim()
        const positionOrder = parseInt(document.getElementById('positionOrder')?.value || '1')
        const maxVotes = parseInt(document.getElementById('maxVotes')?.value || '1')
        const maxCandidates = parseInt(document.getElementById('maxCandidates')?.value || '10')
        const description = document.getElementById('description')?.value?.trim()

        if (!positionName) {
          Swal.showValidationMessage('Position name is required')
          return false
        }

        if (isNaN(positionOrder) || positionOrder < 1) {
          Swal.showValidationMessage('Position order is required and must be at least 1')
          return false
        }

        if (isNaN(maxVotes) || maxVotes < 1) {
          Swal.showValidationMessage('Max votes must be a valid number greater than 0')
          return false
        }

        if (isNaN(maxCandidates) || maxCandidates < 1) {
          Swal.showValidationMessage('Max candidates must be a valid number greater than 0')
          return false
        }

        return {
          positionName,
          positionOrder,
          maxVotes,
          maxCandidates,
          description: description || undefined
        }
      }
    })

    if (formValues) {
      try {
        setLoading(true)
        
        console.log('Updating position:', position._id, 'with data:', formValues)
        
        const response = await positionsAPI.departmental.update(position._id, formValues)
        console.log('Position updated successfully:', response)
        
        await fetchPositions()
        
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Position updated successfully!',
          timer: 2000,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        })
        
      } catch (error) {
        console.error('Error updating position:', error)
        handleAPIError(error, 'Failed to update position')
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
        await positionsAPI.departmental.delete(position._id)
        
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

  const filteredPositions = positions.filter(position => {
    const matchesSearch = position.positionName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         position.description?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  if (!deptElectionId) {
    return (
      <DepartmentalLayout
        deptElectionId={null}
        title="Positions Management"
        subtitle="Position Configuration"
        activeItem="positions"
      >
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20">
            <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Election Selected</h3>
            <p className="text-white/80 mb-6">Please select an election to manage positions.</p>
            <button
              onClick={() => router.push('/ecommittee/departmental')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Back to Elections
            </button>
          </div>
        </div>
      </DepartmentalLayout>
    )
  }

  return (
    <DepartmentalLayout
      deptElectionId={deptElectionId}
      title="Positions Management"
      subtitle={`Position Configuration - ${deptElectionData?.title || deptElectionData?.deptElectionId || 'Loading...'}`}
      activeItem="positions"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          {/* Header with Search and Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h2 className="text-xl font-bold text-[#001f65] flex items-center">
              <Users className="w-6 h-6 mr-2" />
              Election Positions
              {positions.length > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-600">
                  ({positions.length} position{positions.length !== 1 ? 's' : ''})
                </span>
              )}
            </h2>

            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search positions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent text-sm"
                />
              </div>
              
              <button
                onClick={handleCreatePosition}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-[#001f65] hover:bg-[#003399] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm whitespace-nowrap"
              >
                {loading ? (
                  <Loader2 className="animate-spin rounded-full h-4 w-4 mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Add Position
              </button>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin rounded-full h-8 w-8 text-[#001f65]" />
              <span className="ml-2 text-[#001f65]">Loading positions...</span>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center mb-4">
              <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
              <p className="text-red-700">{error}</p>
              <button 
                onClick={fetchData}
                className="ml-auto text-red-600 hover:text-red-800 text-sm underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* Positions Table */}
          {!loading && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Position
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Max Votes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Max Candidates
                    </th>
                    {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th> */}
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {position.positionOrder || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{position.maxVotes || 1}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{position.maxCandidates || 10}</span>
                      </td>
                      {/* <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 max-w-xs truncate">
                          {position.description || 'No description'}
                        </div>
                      </td> */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {position.candidateCount || 0} active
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
                  {filteredPositions.length === 0 && !error && (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center">
                          <Users className="w-12 h-12 text-gray-300 mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {searchTerm ? 'No positions match your search' : 'No positions found'}
                          </h3>
                          <p className="text-gray-500 mb-4">
                            {searchTerm ? 
                              'Try adjusting your search term.' : 
                              'Get started by creating your first position for this departmental election.'
                            }
                          </p>
                          {!searchTerm && (
                            <button
                              onClick={handleCreatePosition}
                              className="flex items-center px-4 py-2 bg-[#001f65] hover:bg-[#003399] text-white rounded-lg transition-colors"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Create First Position
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DepartmentalLayout>
  )
}