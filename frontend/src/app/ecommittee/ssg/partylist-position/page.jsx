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
  AlertCircle,
  Loader2,
  Search,
  Upload,
  X
} from "lucide-react"

export default function SSGPositionsPartylistsPage() {
  const [activeTab, setActiveTab] = useState('positions')
  const [positions, setPositions] = useState([])
  const [partylists, setPartylists] = useState([])
  const [ssgElectionData, setSSGElectionData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

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
    console.log('Fetching positions for SSG election:', ssgElectionId)
    
    const response = await positionsAPI.ssg.getByElection(ssgElectionId)
    
    console.log('Raw API response:', response)
    console.log('Positions data:', response.data?.positions)
    
    // Log each position's maxCandidatesPerPartylist specifically
    if (response.data?.positions) {
      response.data.positions.forEach((pos, index) => {
        console.log(`Position ${index + 1} (${pos.positionName}):`, {
          maxCandidatesPerPartylist: pos.maxCandidatesPerPartylist,
          maxCandidates: pos.maxCandidates,
          maxVotes: pos.maxVotes
        })
      })
    }
    
    setPositions(response.data?.positions || [])
    
    if (response.data?.selectedElection) {
      setSSGElectionData(response.data.selectedElection)
    }
  } catch (error) {
    console.error("Error fetching positions:", error)
    handleAPIError(error, 'Failed to load positions')
  }
}

  const fetchPartylists = async () => {
    try {
      const response = await partylistsAPI.getBySSGElection(ssgElectionId)
      setPartylists(response.partylists || [])
      setSSGElectionData(response.ssgElection || null)
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
        <div class="space-y-6 text-left max-w-md mx-auto">
          <div class="bg-gray-50 p-4 rounded-lg border">
            <label class="block text-sm font-medium text-gray-700 mb-2">SSG Election</label>
            <div class="text-sm font-semibold text-[#001f65] bg-white p-2 rounded border">
              ${ssgElectionData?.title || 'Loading...'}
            </div>
            <div class="text-xs text-gray-500 mt-1">Election Year: ${ssgElectionData?.electionYear || 'N/A'}</div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Position Name <span class="text-red-500">*</span></label>
            <input id="positionName" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent" placeholder="e.g., President, Vice President" required>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Position Order <span class="text-red-500">*</span></label>
            <input id="positionOrder" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent" type="number" placeholder="1" min="1" required>
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
            <label class="block text-sm font-medium text-gray-700 mb-2">Max Candidates Per Partylist</label>
            <input id="maxCandidatesPerPartylist" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent" type="number" placeholder="1" min="1" value="1">
            <div class="text-xs text-gray-500 mt-1">Maximum candidates per partylist for this position</div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea id="description" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent resize-none" rows="3" placeholder="Position responsibilities and requirements..."></textarea>
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
        const positionName = document.getElementById('positionName').value.trim()
        const positionOrder = document.getElementById('positionOrder').value
        const maxVotes = document.getElementById('maxVotes').value
        const maxCandidates = document.getElementById('maxCandidates').value
        const maxCandidatesPerPartylist = document.getElementById('maxCandidatesPerPartylist').value
        const description = document.getElementById('description').value.trim()

        if (!positionName) {
          Swal.showValidationMessage('Position name is required')
          return false
        }

        if (!positionOrder || positionOrder < 1) {
          Swal.showValidationMessage('Position order is required and must be at least 1')
          return false
        }

        return {
          ssgElectionId,
          positionName,
          positionOrder: parseInt(positionOrder),
          maxVotes: parseInt(maxVotes) || 1,
          maxCandidates: parseInt(maxCandidates) || 10,
          maxCandidatesPerPartylist: parseInt(maxCandidatesPerPartylist) || 1,
          description: description || undefined
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
        <div class="space-y-6 text-left max-w-md mx-auto">
          <div class="bg-gray-50 p-4 rounded-lg border">
            <label class="block text-sm font-medium text-gray-700 mb-2">SSG Election</label>
            <div class="text-sm font-semibold text-[#001f65] bg-white p-2 rounded border">
              ${ssgElectionData?.title || 'Loading...'}
            </div>
            <div class="text-xs text-gray-500 mt-1">Election Year: ${ssgElectionData?.electionYear || 'N/A'}</div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Partylist ID <span class="text-red-500">*</span></label>
            <input id="partylistId" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent uppercase" placeholder="e.g., UNITY, KAISA" maxlength="10" required>
            <div class="text-xs text-gray-500 mt-1">Unique identifier (will be converted to uppercase)</div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Partylist Name <span class="text-red-500">*</span></label>
            <input id="partylistName" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent" placeholder="e.g., Unity Party, Kaisa Ko Movement" required>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea id="description" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent resize-none" rows="3" placeholder="Partylist platform, goals, and advocacy..."></textarea>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Logo</label>
            <input id="logo" type="file" accept="image/*" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent">
            <div class="text-xs text-gray-500 mt-1">Optional. Max 2MB. Supported: JPG, PNG, GIF</div>
            <div id="logoPreview" class="mt-2 hidden">
              <img id="previewImage" class="w-20 h-20 object-cover rounded-lg border" alt="Logo preview">
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Create Partylist',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#001f65',
      cancelButtonColor: '#6b7280',
      width: '500px',
      customClass: {
        popup: 'rounded-xl'
      },
      didOpen: () => {
        const logoInput = document.getElementById('logo')
        const logoPreview = document.getElementById('logoPreview')
        const previewImage = document.getElementById('previewImage')
        
        logoInput.addEventListener('change', (e) => {
          const file = e.target.files[0]
          if (file) {
            if (file.size > 2 * 1024 * 1024) {
              Swal.showValidationMessage('Logo file size must be less than 2MB')
              e.target.value = ''
              logoPreview.classList.add('hidden')
              return
            }
            
            const reader = new FileReader()
            reader.onload = (e) => {
              previewImage.src = e.target.result
              logoPreview.classList.remove('hidden')
            }
            reader.readAsDataURL(file)
          } else {
            logoPreview.classList.add('hidden')
          }
        })
      },
      preConfirm: () => {
        const partylistId = document.getElementById('partylistId').value.trim().toUpperCase()
        const partylistName = document.getElementById('partylistName').value.trim()
        const description = document.getElementById('description').value.trim()
        const logoFile = document.getElementById('logo').files[0]

        if (!partylistId) {
          Swal.showValidationMessage('Partylist ID is required')
          return false
        }

        if (!partylistName) {
          Swal.showValidationMessage('Partylist name is required')
          return false
        }

        const result = {
          partylistId,
          ssgElectionId,
          partylistName,
          description: description || undefined
        }

        if (logoFile) {
          return new Promise((resolve) => {
            const reader = new FileReader()
            reader.onload = (e) => {
              result.logo = e.target.result
              resolve(result)
            }
            reader.readAsDataURL(logoFile)
          })
        }

        return result
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
      <div class="space-y-6 text-left max-w-md mx-auto">
        <div class="bg-gray-50 p-4 rounded-lg border">
          <label class="block text-sm font-medium text-gray-700 mb-2">SSG Election</label>
          <div class="text-sm font-semibold text-[#001f65] bg-white p-2 rounded border">
            ${ssgElectionData?.title || 'Loading...'}
          </div>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Position Name <span class="text-red-500">*</span></label>
          <input id="positionName" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent" value="${position.positionName}" required>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Position Order <span class="text-red-500">*</span></label>
          <input id="positionOrder" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent" type="number" value="${position.positionOrder || ''}" min="1" required>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Max Votes</label>
          <input id="maxVotes" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent" type="number" value="${position.maxVotes ?? 1}" min="1">
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Max Candidates</label>
          <input id="maxCandidates" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent" type="number" value="${position.maxCandidates ?? 10}" min="1">
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Max Candidates Per Partylist</label>
          <input id="maxCandidatesPerPartylist" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent" type="number" value="${position.maxCandidatesPerPartylist ?? 1}" min="1">
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea id="description" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent resize-none" rows="3">${position.description || ''}</textarea>
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
      const positionName = document.getElementById('positionName').value.trim()
      const positionOrder = document.getElementById('positionOrder').value
      const maxVotes = document.getElementById('maxVotes').value
      const maxCandidates = document.getElementById('maxCandidates').value
      const maxCandidatesPerPartylist = document.getElementById('maxCandidatesPerPartylist').value
      const description = document.getElementById('description').value.trim()

      if (!positionName) {
        Swal.showValidationMessage('Position name is required')
        return false
      }

      if (!positionOrder || positionOrder < 1) {
        Swal.showValidationMessage('Position order is required and must be at least 1')
        return false
      }

      return {
        positionName,
        positionOrder: parseInt(positionOrder),
        maxVotes: parseInt(maxVotes) || 1,
        maxCandidates: parseInt(maxCandidates) || 10,
        maxCandidatesPerPartylist: parseInt(maxCandidatesPerPartylist) || 1,
        description: description || undefined
      }
    }
  })

  if (formValues) {
    try {
      setLoading(true)
      
      // Debug: Log what we're sending
      console.log('Updating position with data:', formValues)
      console.log('Position ID:', position._id)
      
      const response = await positionsAPI.ssg.update(position._id, formValues)
      
      // Debug: Log the response
      console.log('API response:', response)
      
      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'Position updated successfully!',
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      })
      
      // Force a fresh fetch instead of relying on cache
      console.log('Fetching fresh position data...')
      await fetchPositions()
      
      // Debug: Log the positions after fetch
      console.log('Positions after update:', positions)
      
    } catch (error) {
      console.error('Error updating position:', error)
      handleAPIError(error, 'Failed to update position')
    } finally {
      setLoading(false)
    }
  }
}

  const handleEditPartylist = async (partylist) => {
    const currentLogoUrl = partylist.logo ? `data:image/jpeg;base64,${partylist.logo.toString('base64')}` : null

    const { value: formValues } = await Swal.fire({
      title: 'Edit Partylist',
      html: `
        <div class="space-y-6 text-left max-w-md mx-auto">
          <div class="bg-gray-50 p-4 rounded-lg border">
            <label class="block text-sm font-medium text-gray-700 mb-2">SSG Election</label>
            <div class="text-sm font-semibold text-[#001f65] bg-white p-2 rounded border">
              ${ssgElectionData?.title || 'Loading...'}
            </div>
          </div>
          
          <div class="bg-gray-50 p-4 rounded-lg border">
            <label class="block text-sm font-medium text-gray-700 mb-2">Partylist ID</label>
            <div class="text-sm font-semibold text-gray-600 bg-white p-2 rounded border">
              ${partylist.partylistId}
            </div>
            <div class="text-xs text-gray-500 mt-1">Cannot be changed</div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Partylist Name <span class="text-red-500">*</span></label>
            <input id="partylistName" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent" value="${partylist.partylistName}" required>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea id="description" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent resize-none" rows="3">${partylist.description || ''}</textarea>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Logo</label>
            ${currentLogoUrl ? `
              <div class="mb-3">
                <div class="text-xs text-gray-600 mb-1">Current logo:</div>
                <img src="${currentLogoUrl}" class="w-20 h-20 object-cover rounded-lg border" alt="Current logo">
                <button type="button" id="removeLogo" class="mt-1 text-xs text-red-600 hover:text-red-800">Remove current logo</button>
              </div>
            ` : ''}
            <input id="logo" type="file" accept="image/*" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent">
            <div class="text-xs text-gray-500 mt-1">Max 2MB. Leave empty to keep current logo.</div>
            <div id="logoPreview" class="mt-2 hidden">
              <img id="previewImage" class="w-20 h-20 object-cover rounded-lg border" alt="Logo preview">
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Update Partylist',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#001f65',
      cancelButtonColor: '#6b7280',
      width: '500px',
      customClass: {
        popup: 'rounded-xl'
      },
      didOpen: () => {
        const logoInput = document.getElementById('logo')
        const logoPreview = document.getElementById('logoPreview')
        const previewImage = document.getElementById('previewImage')
        const removeButton = document.getElementById('removeLogo')
        
        if (removeButton) {
          removeButton.addEventListener('click', () => {
            removeButton.textContent = 'Logo will be removed'
            removeButton.classList.add('font-bold')
          })
        }
        
        logoInput.addEventListener('change', (e) => {
          const file = e.target.files[0]
          if (file) {
            if (file.size > 2 * 1024 * 1024) {
              Swal.showValidationMessage('Logo file size must be less than 2MB')
              e.target.value = ''
              logoPreview.classList.add('hidden')
              return
            }
            
            const reader = new FileReader()
            reader.onload = (e) => {
              previewImage.src = e.target.result
              logoPreview.classList.remove('hidden')
            }
            reader.readAsDataURL(file)
          } else {
            logoPreview.classList.add('hidden')
          }
        })
      },
      preConfirm: () => {
        const partylistName = document.getElementById('partylistName').value.trim()
        const description = document.getElementById('description').value.trim()
        const logoFile = document.getElementById('logo').files[0]
        const removeButton = document.getElementById('removeLogo')
        const shouldRemoveLogo = removeButton && removeButton.textContent.includes('will be removed')

        if (!partylistName) {
          Swal.showValidationMessage('Partylist name is required')
          return false
        }

        const result = {
          partylistName,
          description: description || undefined
        }

        if (shouldRemoveLogo) {
          result.logo = null
        }

        if (logoFile) {
          return new Promise((resolve) => {
            const reader = new FileReader()
            reader.onload = (e) => {
              result.logo = e.target.result
              resolve(result)
            }
            reader.readAsDataURL(logoFile)
          })
        }

        return result
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
                         partylist.partylistId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         partylist.description?.toLowerCase().includes(searchTerm.toLowerCase())
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
        {/* Clickable Cards for Positions and Partylists */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div 
            onClick={() => setActiveTab('positions')}
            className={`cursor-pointer transition-all duration-200 transform hover:scale-105 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border ${
              activeTab === 'positions' 
                ? 'border-[#001f65] ring-2 ring-[#001f65]/20' 
                : 'border-white/20 hover:border-[#001f65]/50'
            } p-6`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-[#001f65] mb-2">Total Positions</h3>
                <p className="text-3xl font-bold text-[#001f65]">{positions.length}</p>
                <p className="text-sm text-gray-600 mt-1">Election positions configured</p>
              </div>
              <Users className={`w-12 h-12 ${activeTab === 'positions' ? 'text-[#001f65]' : 'text-[#001f65]/20'}`} />
            </div>
          </div>

          <div 
            onClick={() => setActiveTab('partylists')}
            className={`cursor-pointer transition-all duration-200 transform hover:scale-105 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border ${
              activeTab === 'partylists' 
                ? 'border-[#001f65] ring-2 ring-[#001f65]/20' 
                : 'border-white/20 hover:border-[#001f65]/50'
            } p-6`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-[#001f65] mb-2">Total Partylists</h3>
                <p className="text-3xl font-bold text-[#001f65]">{partylists.length}</p>
                <p className="text-sm text-gray-600 mt-1">Political parties registered</p>
              </div>
              <Flag className={`w-12 h-12 ${activeTab === 'partylists' ? 'text-[#001f65]' : 'text-[#001f65]/20'}`} />
            </div>
          </div>
        </div>
        
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
            Order
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Max Votes
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Max Candidates
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Max Per Partylist
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Description
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
            <td className="px-6 py-4 whitespace-nowrap">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {position.positionOrder || 0}
              </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span className="text-sm text-gray-900">{position.maxVotes ?? 1}</span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span className="text-sm text-gray-900">{position.maxCandidates ?? 10}</span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span className="text-sm text-gray-900">{position.maxCandidatesPerPartylist ?? 1}</span>
            </td>
            <td className="px-6 py-4">
              <div className="text-sm text-gray-500 max-w-xs truncate">
                {position.description || 'No description'}
              </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span className="text-sm text-gray-900">
                {position.activeCandidateCount || 0} active
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
            <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
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
                      Logo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Partylist ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
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
                        <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                          {partylist.logo ? (
                            <img 
                              src={`data:image/jpeg;base64,${partylist.logo.toString('base64')}`}
                              alt={partylist.partylistName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Flag className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {partylist.partylistId}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{partylist.partylistName}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 max-w-xs truncate">
                          {partylist.description || 'No description'}
                        </div>
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
                      <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                        {searchTerm ? 'No partylists match your search.' : 'No partylists found. Create your first partylist!'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
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