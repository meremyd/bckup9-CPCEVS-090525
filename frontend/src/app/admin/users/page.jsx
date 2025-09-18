"use client"

import { useState, useEffect, useRef } from "react"
import { Search, UserPlus, Edit, Trash2, Loader2 } from "lucide-react"
import Swal from 'sweetalert2'
import { usersAPI } from '@/lib/api/users'

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const debounceTimeout = useRef(null)

  // Form state
  const [formData, setFormData] = useState({
    username: "",
    userType: "",
    password: "",
    isActive: true,
  })

  const showAlert = (type, title, text) => {
    Swal.fire({
      icon: type,
      title: title,
      text: text,
      confirmButtonColor: "#001f65",
    })
  }

  const showConfirm = (title, text, confirmText = "Yes, delete it!") => {
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

  useEffect(() => {
    fetchUsers()
  }, [])

  // Debounced search logic for consistent UX with voters page
  useEffect(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current)
    debounceTimeout.current = setTimeout(() => {
      // No backend search, filter on frontend
      // If you implement backend search, call fetchUsers with searchTerm here
    }, 400)
    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current)
    }
  }, [searchTerm])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const data = await usersAPI.getAll()
      if (Array.isArray(data)) {
        setUsers(data)
      } else if (data.users && Array.isArray(data.users)) {
        setUsers(data.users)
      } else {
        setUsers([])
      }
      setError("")
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to fetch users"
      setError(errorMessage)
      showAlert("error", "Error!", `Failed to fetch users: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      username: "",
      userType: "",
      password: "",
      isActive: true,
    })
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  const handleAddUser = async (e) => {
    e.preventDefault()
    try {
      const result = await usersAPI.create(formData)
      const newUser = result
      setUsers([...users, newUser])
      setShowAddModal(false)
      resetForm()
      showAlert("success", "Success!", "User added successfully")
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to add user"
      showAlert("error", "Error!", errorMessage)
    }
  }

  const handleEditUser = async (e) => {
    e.preventDefault()
    try {
      const updateData = { ...formData }
      if (!updateData.password) {
        delete updateData.password // Don't update password if empty
      }
      const result = await usersAPI.update(editingUser._id, updateData)
      const updatedUser = result
      setUsers(users.map((user) => (user._id === editingUser._id ? updatedUser : user)))
      setShowEditModal(false)
      setEditingUser(null)
      resetForm()
      showAlert("success", "Success!", "User updated successfully")
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to update user"
      showAlert("error", "Error!", errorMessage)
    }
  }

  const handleEdit = (user) => {
    setEditingUser(user)
    setFormData({
      username: user.username,
      userType: user.userType,
      password: "",
      isActive: user.isActive,
    })
    setShowEditModal(true)
  }

  const handleDelete = async (userId) => {
    const confirmed = await showConfirm("Are you sure?", "You won't be able to revert this!", "Yes, delete it!")
    if (!confirmed) return
    try {
      await usersAPI.delete(userId)
      setUsers(users.filter((user) => user._id !== userId))
      showAlert("success", "Deleted!", "User has been deleted successfully")
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to delete user"
      showAlert("error", "Error!", errorMessage)
    }
  }

  const filteredUsers = Array.isArray(users) ? users.filter(
    (user) =>
      (user.username || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.userType || "").toLowerCase().includes(searchTerm.toLowerCase()),
  ) : []

  const getUserTypeColor = (userType) => {
    switch (userType) {
      case "admin":
        return "bg-red-100 text-red-800"
      case "election_committee":
        return "bg-purple-100 text-purple-800"
      case "sao":
        return "bg-green-100 text-green-800"
      case "voter":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-[#001f65]" />
            <span className="ml-2 text-[#001f65]">Loading users...</span>
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
            <div>
              <p className="text-red-600 text-sm font-medium">Error Loading Data</p>
              <p className="text-red-500 text-sm mt-1">{error}</p>
              <button
                onClick={fetchUsers}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                Try Again
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
              <h1 className="text-2xl font-bold text-[#001f65] mb-2">User Management</h1>
              <p className="text-[#001f65]/80">Manage system users and their roles</p>
            </div>
          </div>
        </div>

        {/* Main Table */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
          <div className="p-6 border-b border-gray-200/50 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search users by username or type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent w-full lg:w-80"
              />
            </div>
            <button
              onClick={() => {
                resetForm()
                setShowAddModal(true)
              }}
              className="w-full sm:w-auto px-4 py-2 bg-[#001f65] hover:bg-[#003399] text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Add New User
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200/50">
              <thead className="bg-[#b0c8fe]/10">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-[#001f65] uppercase tracking-wider">
                    Username
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-[#001f65] uppercase tracking-wider">
                    User Type
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-[#001f65] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-[#001f65] uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-[#001f65] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white/50 divide-y divide-gray-200/50">
                {filteredUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-[#b0c8fe]/10">
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-[#001f65]">{user.username}</td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUserTypeColor(user.userType)}`}>
                        {(user.userType || "").replace("_", " ").toUpperCase()}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${user.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : ""}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1 transition-colors"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(user._id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && !loading && (
                  <tr>
                    <td colSpan="5" className="px-3 sm:px-6 py-12 text-center text-[#001f65]/60">
                      No users found matching your search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add User Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-white/20">
              <div className="flex justify-between items-center p-6 border-b border-gray-200/50">
                <h3 className="text-lg font-semibold text-[#001f65]">Add New User</h3>
                <button
                  onClick={() => {
                    setShowAddModal(false)
                    resetForm()
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>&times;
                </button>
              </div>
              <div className="p-6">
                <form onSubmit={handleAddUser} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#001f65] mb-1">Username</label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001f65] focus:border-transparent"
                      placeholder="Enter username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#001f65] mb-1">User Type</label>
                    <select
                      name="userType"
                      value={formData.userType}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001f65] focus:border-transparent"
                    >
                      <option value="">Select user type</option>
                      <option value="admin">Admin</option>
                      <option value="election_committee">Election Committee</option>
                      <option value="sao">SAO</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#001f65] mb-1">Password</label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001f65] focus:border-transparent"
                      placeholder="Enter password"
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-[#001f65] focus:ring-[#001f65] border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-[#001f65]">Active User</label>
                  </div>
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddModal(false)
                        resetForm()
                      }}
                      className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="w-full sm:w-auto px-4 py-2 bg-[#001f65] text-white rounded-lg hover:bg-[#003399] focus:outline-none focus:ring-2 focus:ring-[#001f65] transition-colors"
                    >
                      Add User
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {showEditModal && editingUser && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-white/20">
              <div className="flex justify-between items-center p-6 border-b border-gray-200/50">
                <h3 className="text-lg font-semibold text-[#001f65]">Edit User</h3>
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingUser(null)
                    resetForm()
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>&times;
                </button>
              </div>
              <div className="p-6">
                <form onSubmit={handleEditUser} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#001f65] mb-1">Username</label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001f65] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#001f65] mb-1">User Type</label>
                    <select
                      name="userType"
                      value={formData.userType}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001f65] focus:border-transparent"
                    >
                      <option value="admin">Admin</option>
                      <option value="election_committee">Election Committee</option>
                      <option value="sao">SAO</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#001f65] mb-1">
                      New Password (leave blank to keep current)
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001f65] focus:border-transparent"
                      placeholder="Enter new password"
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-[#001f65] focus:ring-[#001f65] border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-[#001f65]">Active User</label>
                  </div>
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false)
                        setEditingUser(null)
                        resetForm()
                      }}
                      className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-600 transition-colors"
                    >
                      Update User
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