import api from '../api'

export const adminAPI = {
  lookupAccount: async ({ email, studentId }) => {
    try {
      const params = {}
      if (email) params.email = email
      if (studentId) params.studentId = studentId
      const response = await api.get('/admin/accounts/lookup', { params })
      return response.data
    } catch (error) {
      console.error('Error looking up account:', error)
      if (error.response?.status === 404) return { found: false }
      throw error
    }
  },

  createAccount: async (data) => {
    try {
      // Accept either JSON or FormData
      if (data instanceof FormData) {
        const resp = await api.post('/admin/accounts', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        return resp.data
      }
      const response = await api.post('/admin/accounts', data)
      return response.data
    } catch (error) {
      console.error('Error creating account:', error)
      if (error.response?.data) throw new Error(error.response.data.message || 'Failed to create account')
      throw error
    }
  },

  updateAccount: async (id, data) => {
    try {
      if (!id) throw new Error('Account id is required')
      if (data instanceof FormData) {
        const resp = await api.put(`/admin/accounts/${id}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        return resp.data
      }
      const response = await api.put(`/admin/accounts/${id}`, data)
      return response.data
    } catch (error) {
      console.error('Error updating account:', error)
      if (error.response?.data) throw new Error(error.response.data.message || 'Failed to update account')
      throw error
    }
  }
}