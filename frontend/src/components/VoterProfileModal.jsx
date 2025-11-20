import { useState, useEffect } from 'react'
import { X, User, Mail, Building2, Lock, Eye, EyeOff, Loader2, GraduationCap, Edit2, Save } from 'lucide-react'
import Swal from 'sweetalert2'
import { votersAPI } from '@/lib/api/voters'

export default function VoterProfileModal({ isOpen, onClose, onProfileUpdate }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const [formData, setFormData] = useState({
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  })

  useEffect(() => {
    if (isOpen) {
      loadProfile()
    }
  }, [isOpen])

  const loadProfile = async () => {
    try {
      setLoading(true)
      
      // DEBUG: Check what tokens are available
      const voterToken = localStorage.getItem('voterToken')
      const regularToken = localStorage.getItem('token')
      
      console.log('=== VOTER PROFILE DEBUG ===')
      console.log('Voter token exists:', !!voterToken)
      console.log('Regular token exists:', !!regularToken)
      console.log('Voter token (first 20 chars):', voterToken?.substring(0, 20))
      
      if (!voterToken) {
        throw new Error('No voter token found. Please login again.')
      }
      
      // Try to decode the token to see what's in it
      try {
        const base64Url = voterToken.split('.')[1]
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        }).join(''))
        
        const decoded = JSON.parse(jsonPayload)
        console.log('Decoded voter token:', {
          hasVoterId: !!decoded.voterId,
          hasUserId: !!decoded.userId,
          userType: decoded.userType,
          schoolId: decoded.schoolId,
          exp: decoded.exp,
          iat: decoded.iat
        })
      } catch (decodeError) {
        console.error('Error decoding token:', decodeError)
      }
      
      console.log('Calling votersAPI.getProfile()...')
      const response = await votersAPI.getProfile()
      console.log('Profile loaded successfully:', response)
      console.log('Profile data:', response.data)
      console.log('Department in profile:', response.data.department)
      console.log('DepartmentId in profile:', response.data.departmentId)
      
      setProfile(response.data)
      setFormData(prev => ({
        ...prev,
        email: response.data.email || ''
      }))
      setEditMode(false)
    } catch (error) {
      console.error('=== PROFILE LOAD ERROR ===')
      console.error('Error object:', error)
      console.error('Error response:', error.response)
      console.error('Error message:', error.message)
      console.error('Error response data:', error.response?.data)
      console.error('Error response status:', error.response?.status)
      console.error('Error response headers:', error.response?.headers)
      
      Swal.fire({
        icon: 'error',
        title: 'Error Loading Profile',
        html: `
          <div style="text-align: left;">
            <p><strong>Error:</strong> ${error.response?.data?.message || error.message}</p>
            <p><strong>Status:</strong> ${error.response?.status || 'Unknown'}</p>
            <p style="font-size: 12px; color: #666;">Check browser console for details</p>
          </div>
        `
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleCancel = () => {
    setFormData({
      email: profile?.email || '',
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: ''
    })
    setEditMode(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const hasEmailChange = formData.email !== (profile.email || '')
    const hasPasswordChange = formData.newPassword

    if (!hasEmailChange && !hasPasswordChange) {
      Swal.fire({
        icon: 'info',
        title: 'No Changes',
        text: 'Please make changes before updating.'
      })
      return
    }

    // Validate email format if changed
    if (hasEmailChange && formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        Swal.fire({
          icon: 'error',
          title: 'Validation Error',
          text: 'Please enter a valid email address'
        })
        return
      }
    }

    if (hasPasswordChange) {
      if (!formData.currentPassword) {
        Swal.fire({
          icon: 'error',
          title: 'Validation Error',
          text: 'Please enter your current password'
        })
        return
      }

      if (formData.newPassword !== formData.confirmNewPassword) {
        Swal.fire({
          icon: 'error',
          title: 'Validation Error',
          text: 'New passwords do not match'
        })
        return
      }

      if (formData.newPassword.length < 6) {
        Swal.fire({
          icon: 'error',
          title: 'Validation Error',
          text: 'Password must be at least 6 characters long'
        })
        return
      }
    }

    try {
      setUpdating(true)

      const updateData = {}
      
      if (hasEmailChange) {
        updateData.email = formData.email.trim() || null
      }
      
      if (hasPasswordChange) {
        updateData.currentPassword = formData.currentPassword
        updateData.newPassword = formData.newPassword
        updateData.confirmNewPassword = formData.confirmNewPassword
      }

      const response = await votersAPI.updateProfile(updateData)

      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: response.message || 'Profile updated successfully',
        timer: 2000,
        showConfirmButton: false
      })

      // Clear password fields
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
      }))

      await loadProfile()

      if (onProfileUpdate) {
        onProfileUpdate(response.data)
      }

    } catch (error) {
      console.error('Error updating profile:', error)
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: error.response?.data?.message || error.message || 'Failed to update profile'
      })
    } finally {
      setUpdating(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-[#001f65] to-[#003399] text-white p-6 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center">
            <User className="w-8 h-8 mr-3" />
            <h2 className="text-2xl font-bold">My Profile</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#001f65]" />
              <span className="ml-3 text-gray-600">Loading profile...</span>
            </div>
          ) : profile ? (
            <div className="space-y-6">
              {/* Personal Information - READ ONLY */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-800">Personal Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600 flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      School ID
                    </label>
                    <p className="font-medium text-gray-800">{profile.schoolId}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-600 flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      Full Name
                    </label>
                    <p className="font-medium text-gray-800">
                      {profile.firstName} {profile.middleName} {profile.lastName}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-600 flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      Sex
                    </label>
                    <p className="font-medium text-gray-800">{profile.sex || 'Not set'}</p>
                  </div>

                  <div>
                    <label className="text-sm text-gray-600 flex items-center">
                      <GraduationCap className="w-4 h-4 mr-2" />
                      Year Level
                    </label>
                    <p className="font-medium text-gray-800">{profile.yearLevelDisplay || `Year ${profile.yearLevel}`}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-600 flex items-center">
                    <Building2 className="w-4 h-4 mr-2" />
                    Department
                  </label>
                  {profile.department || profile.departmentId ? (
                    <>
                      <p className="font-medium text-gray-800">
                        {profile.department?.departmentCode || profile.departmentId?.departmentCode || 'N/A'} - {profile.department?.degreeProgram || profile.departmentId?.degreeProgram || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {profile.department?.college || profile.departmentId?.college || 'N/A'}
                      </p>
                    </>
                  ) : (
                    <p className="font-medium text-gray-800">Not set</p>
                  )}
                </div>

                {profile.isClassOfficer && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-blue-800 font-medium flex items-center">
                      <GraduationCap className="w-4 h-4 mr-2" />
                      Class Officer
                    </p>
                  </div>
                )}
              </div>

              {/* Editable Information */}
              <div className="space-y-4 bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-800">Other Information</h3>
                  {!editMode ? (
                    <button
                      onClick={() => setEditMode(true)}
                      className="flex items-center px-3 py-1.5 text-sm bg-[#001f65] text-white rounded-lg hover:bg-[#003399] transition-colors"
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      Edit
                    </button>
                  ) : (
                    <button
                      onClick={handleCancel}
                      className="flex items-center px-3 py-1.5 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
                
                {/* Email Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <Mail className="w-4 h-4 mr-2" />
                    Email Address
                  </label>
                  {editMode ? (
                    <>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent"
                        placeholder="Enter your email address"
                      />
                      {formData.email !== (profile.email || '') && (
                        <p className="text-sm text-blue-600 mt-1">
                          {profile.email ? `Changing from ${profile.email}` : 'Adding email address'}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="font-medium text-gray-800">{profile.email || 'Not set'}</p>
                  )}
                </div>

                {/* Password Section */}
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                    <Lock className="w-5 h-5 mr-2" />
                    Password Information
                  </h4>
                  
                  {/* Password Status - Always visible */}
                  {profile.passwordStatus && (
                    <div className="mb-4 bg-gray-50 rounded-lg p-3">
                      <div className="space-y-1 text-sm">
                        <p className="text-gray-700">
                          Status: <span className={`font-medium ${profile.passwordStatus.isActive ? 'text-green-600' : 'text-red-600'}`}>
                            {profile.passwordStatus.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </p>
                        {profile.passwordStatus.isExpired && (
                          <p className="text-red-600 font-medium">⚠️ Password has expired</p>
                        )}
                        {profile.passwordStatus.expiresAt && (
                          <p className="text-gray-600">
                            Expires: {new Date(profile.passwordStatus.expiresAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Password Change Fields - Only in edit mode */}
                  {editMode && (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600 italic">Leave blank to keep current password</p>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Current Password
                        </label>
                        <div className="relative">
                          <input
                            type={showCurrentPassword ? "text" : "password"}
                            name="currentPassword"
                            value={formData.currentPassword}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent pr-10"
                            placeholder="Enter current password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? "text" : "password"}
                            name="newPassword"
                            value={formData.newPassword}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent pr-10"
                            placeholder="Enter new password (min. 6 characters)"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Confirm New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            name="confirmNewPassword"
                            value={formData.confirmNewPassword}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent pr-10"
                            placeholder="Confirm new password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons - Only show Save when in edit mode */}
              {editMode && (
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    disabled={updating}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="px-6 py-2 bg-[#001f65] text-white rounded-lg hover:bg-[#003399] transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={updating}
                  >
                    {updating ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5 mr-2" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600">Failed to load profile</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}