import { useState, useEffect } from 'react'
import { X, User, Mail, Building2, Lock, Eye, EyeOff, Loader2, GraduationCap } from 'lucide-react'
import Swal from 'sweetalert2'
import { votersAPI } from '@/lib/api/voters'

export default function VoterProfileModal({ isOpen, onClose, onProfileUpdate }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const [formData, setFormData] = useState({
    yearLevel: '',
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
      const response = await votersAPI.getProfile()
      setProfile(response.data)
      setFormData(prev => ({
        ...prev,
        yearLevel: response.data.yearLevel || ''
      }))
    } catch (error) {
      console.error('Error loading profile:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load profile. Please try again.'
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const hasYearLevelChange = formData.yearLevel && formData.yearLevel !== String(profile.yearLevel)
    const hasPasswordChange = formData.newPassword

    if (!hasYearLevelChange && !hasPasswordChange) {
      Swal.fire({
        icon: 'info',
        title: 'No Changes',
        text: 'Please make changes before updating.'
      })
      return
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
      
      if (hasYearLevelChange) {
        updateData.yearLevel = Number(formData.yearLevel)
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
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-gray-800 mb-3">Personal Information</h3>
                
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
                      <Mail className="w-4 h-4 mr-2" />
                      Email
                    </label>
                    <p className="font-medium text-gray-800">{profile.email || 'Not set'}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-600 flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      Sex
                    </label>
                    <p className="font-medium text-gray-800">{profile.sex || 'Not set'}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-600 flex items-center">
                    <Building2 className="w-4 h-4 mr-2" />
                    Department
                  </label>
                  <p className="font-medium text-gray-800">
                    {profile.department?.departmentCode} - {profile.department?.degreeProgram}
                  </p>
                  <p className="text-sm text-gray-600">{profile.department?.college}</p>
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

              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800">Update Information</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Year Level <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="yearLevel"
                    value={formData.yearLevel}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent"
                  >
                    <option value="">Select Year Level</option>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                  {formData.yearLevel !== String(profile.yearLevel) && formData.yearLevel && (
                    <p className="text-sm text-blue-600 mt-1">
                      Changing from {profile.yearLevel} to {formData.yearLevel}
                    </p>
                  )}
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                    <Lock className="w-5 h-5 mr-2" />
                    Change Password (Optional)
                  </h4>
                  
                  <div className="space-y-3">
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
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={onClose}
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
                    'Update Profile'
                  )}
                </button>
              </div>
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