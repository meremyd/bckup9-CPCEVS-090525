import api from '../api'

export const departmentalElectionsAPI = {
  // Get all departmental elections with filtering and pagination
  getAll: async (params = {}) => {
    const response = await api.get('/departmentalElections', { params })
    return response.data
  },

  // Get departmental election by ID
  getById: async (id) => {
    const response = await api.get(`/departmentalElections/${id}`)
    return response.data
  },

  // Get available departments
  getAvailableDepartments: async () => {
    const response = await api.get('/departmentalElections/departments')
    return response.data
  },

  // Get departmental dashboard summary (Admin/Election Committee only)
  getDashboardSummary: async () => {
    const response = await api.get('/departmentalElections/dashboard')
    return response.data
  },

  // Get audit logs for departmental elections (Admin only)
  getAuditLogs: async (params = {}) => {
    const response = await api.get('/departmentalElections/audit-logs', { params })
    return response.data
  },

  // Get elections by specific department
  getByDepartment: async (department, params = {}) => {
    const response = await api.get(`/departmentalElections/department/${department}`, { params })
    return response.data
  },

  // Get departmental election results
  getResults: async (id) => {
    const response = await api.get(`/departmentalElections/${id}/results`)
    return response.data
  },

  // Get departmental election statistics (Admin/Election Committee only)
  getStatistics: async (id) => {
    const response = await api.get(`/departmentalElections/${id}/statistics`)
    return response.data
  },

  // Create new departmental election (Admin/Election Committee only)
  create: async (electionData) => {
    const response = await api.post('/departmentalElections', electionData)
    return response.data
  },

  // Update departmental election (Admin/Election Committee only)
  update: async (id, electionData) => {
    const response = await api.put(`/departmentalElections/${id}`, electionData)
    return response.data
  },

  // Toggle departmental election status (Admin/Election Committee only)
  toggleStatus: async (id, status) => {
    const response = await api.patch(`/departmentalElections/${id}/status`, { status })
    return response.data
  },

  // Delete departmental election (Admin only)
  delete: async (id) => {
    const response = await api.delete(`/departmentalElections/${id}`)
    return response.data
  },

  // Utility functions for frontend state management
  
  // Check if user can vote in departmental election (voter role)
  canVoteInElection: async (electionId) => {
    try {
      const election = await departmentalElectionsAPI.getById(electionId)
      return election.status === 'active' && new Date() >= new Date(election.startDate) && new Date() <= new Date(election.endDate)
    } catch (error) {
      console.error('Error checking voting eligibility:', error)
      return false
    }
  },

  // Get elections available for specific department
  getElectionsForDepartment: async (department) => {
    try {
      const elections = await departmentalElectionsAPI.getByDepartment(department)
      return elections.filter(election => election.status === 'active')
    } catch (error) {
      console.error('Error getting elections for department:', error)
      return []
    }
  }
}