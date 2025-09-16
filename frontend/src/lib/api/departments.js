import api from '../api'

export const departmentsAPI = {
  // Get all departments (public)
  getAll: async (params = {}) => {
    try {
      const response = await api.get('/departments', { params })
      return response.data
    } catch (error) {
      console.error('Error fetching departments:', error)
      throw error
    }
  },
  
  // Get department by ID (public)
  getById: async (id) => {
    try {
      const response = await api.get(`/departments/${id}`)
      return response.data
    } catch (error) {
      console.error('Error fetching department:', error)
      throw error
    }
  },
  
  // NEW: Get department by department code (public)
  getByCode: async (code) => {
    try {
      const response = await api.get(`/departments/code/${code}`)
      return response.data
    } catch (error) {
      console.error('Error fetching department by code:', error)
      throw error
    }
  },
  
  // Search departments (public)
  search: async (params = {}) => {
    try {
      const response = await api.get('/departments/search', { params })
      return response.data
    } catch (error) {
      console.error('Error searching departments:', error)
      throw error
    }
  },
  
  // Get all colleges (public)
  getColleges: async () => {
    try {
      const response = await api.get('/departments/colleges/all')
      return response.data
    } catch (error) {
      console.error('Error fetching colleges:', error)
      throw error
    }
  },
  
  // Get registered voters in department (admin, election_committee, sao)
  getRegisteredVoters: async (id, params = {}) => {
    try {
      const response = await api.get(`/departments/${id}/voters/registered`, { params })
      return response.data
    } catch (error) {
      console.error('Error fetching registered voters:', error)
      throw error
    }
  },
  
  // Get class officers in department (admin, election_committee, sao)
  getClassOfficers: async (id, params = {}) => {
    try {
      const response = await api.get(`/departments/${id}/officers`, { params })
      return response.data
    } catch (error) {
      console.error('Error fetching class officers:', error)
      throw error
    }
  },
  
  // Create department (admin only)
  create: async (departmentData) => {
    try {
      const response = await api.post('/departments', departmentData)
      return response.data
    } catch (error) {
      console.error('Error creating department:', error)
      throw error
    }
  },
  
  // Update department (admin only)
  update: async (id, departmentData) => {
    try {
      const response = await api.put(`/departments/${id}`, departmentData)
      return response.data
    } catch (error) {
      console.error('Error updating department:', error)
      throw error
    }
  },
  
  // Delete department (admin only)
  delete: async (id, force = false) => {
    try {
      const response = await api.delete(`/departments/${id}`, { 
        params: { force: force.toString() } 
      })
      return response.data
    } catch (error) {
      console.error('Error deleting department:', error)
      throw error
    }
  },
  
  // Bulk create departments (admin only) 
  bulkCreate: async (departments) => {
    try {
      const response = await api.post('/departments/bulk', { departments })   
      return response.data
    } catch (error) {
      console.error('Error bulk creating departments:', error)
      throw error
    } 
  },

  // Get department statistics (admin, election committee, and sao)   
  getStatistics: async () => {
    try {
      const response = await api.get('/departments/statistics/overview')  
      return response.data
    } catch (error) {
      console.error('Error fetching department statistics:', error)
      throw error
    }   
  }
}