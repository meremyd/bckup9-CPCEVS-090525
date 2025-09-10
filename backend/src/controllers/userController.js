const User = require("../models/User")
const AuditLog = require("../models/AuditLog")

const UserController = {
  // Get all users with basic filtering
  getAllUsers: async (req, res) => {
    try {
      const { userType, isActive } = req.query
      const filter = {}
      
      if (userType) filter.userType = userType
      if (isActive !== undefined) filter.isActive = isActive === 'true'
      
      const users = await User.find(filter)
        .select('-passwordHash') // Exclude password hash from response
        .sort({ createdAt: -1 })
      
      res.json({
        success: true,
        data: users,
        count: users.length
      })
    } catch (error) {
      console.error('Error fetching users:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to fetch users',
        error: error.message
      })
    }
  },

  // Get user by ID
  getUser: async (req, res) => {
    try {
      const { id } = req.params
      
      const user = await User.findById(id).select('-passwordHash')
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        })
      }
      
      res.json({
        success: true,
        data: user
      })
    } catch (error) {
      console.error('Error fetching user:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user',
        error: error.message
      })
    }
  },

  // Create new user
  createUser: async (req, res) => {
    try {
      const { username, password, userType } = req.body
      
      // Validation
      if (!username || !password || !userType) {
        return res.status(400).json({
          success: false,
          message: 'Username, password, and userType are required'
        })
      }
      
      // Check valid userType
      const validUserTypes = ['admin', 'election_committee', 'sao']
      if (!validUserTypes.includes(userType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid userType. Must be: admin, election_committee, or sao'
        })
      }
      
      // Check if username already exists
      const existingUser = await User.findOne({ username })
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Username already exists'
        })
      }
      
      // Create user using static method
      const user = await User.createWithPassword({
        username,
        password,
        userType,
        isActive: req.body.isActive !== undefined ? req.body.isActive : true
      })
      
      // Log the action
      await AuditLog.logUserAction(
        'CREATE_USER',
        { username: req.user?.username || 'system' },
        `Created user: ${username} with type: ${userType}`,
        req
      )
      
      // Return user without password
      const userResponse = user.toObject()
      delete userResponse.passwordHash
      
      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: userResponse
      })
    } catch (error) {
      console.error('Error creating user:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to create user',
        error: error.message
      })
    }
  },

  // Update user
  updateUser: async (req, res) => {
    try {
      const { id } = req.params
      const { username, userType, isActive, password } = req.body
      
      const user = await User.findById(id)
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        })
      }
      
      // Update basic fields
      if (username && username !== user.username) {
        const existingUser = await User.findOne({ username, _id: { $ne: id } })
        if (existingUser) {
          return res.status(409).json({
            success: false,
            message: 'Username already exists'
          })
        }
        user.username = username
      }
      
      if (userType && ['admin', 'election_committee', 'sao'].includes(userType)) {
        user.userType = userType
      }
      
      if (isActive !== undefined) {
        user.isActive = isActive
      }
      
      // Update password if provided
      if (password) {
        await user.updatePassword(password)
      } else {
        await user.save()
      }
      
      // Log the action
      await AuditLog.logUserAction(
        'UPDATE_USER',
        { username: req.user?.username || 'system' },
        `Updated user: ${user.username}`,
        req
      )
      
      // Return updated user without password
      const userResponse = user.toObject()
      delete userResponse.passwordHash
      
      res.json({
        success: true,
        message: 'User updated successfully',
        data: userResponse
      })
    } catch (error) {
      console.error('Error updating user:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to update user',
        error: error.message
      })
    }
  },

  // Delete user
  deleteUser: async (req, res) => {
    try {
      const { id } = req.params
      
      const user = await User.findById(id)
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        })
      }
      
      await User.findByIdAndDelete(id)
      
      // Log the action
      await AuditLog.logUserAction(
        'DELETE_USER',
        { username: req.user?.username || 'system' },
        `Deleted user: ${user.username}`,
        req
      )
      
      res.json({
        success: true,
        message: 'User deleted successfully'
      })
    } catch (error) {
      console.error('Error deleting user:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to delete user',
        error: error.message
      })
    }
  },

  // Get user statistics
  getStatistics: async (req, res) => {
    try {
      const stats = await User.aggregate([
        {
          $group: {
            _id: '$userType',
            count: { $sum: 1 },
            active: { $sum: { $cond: ['$isActive', 1, 0] } },
            inactive: { $sum: { $cond: ['$isActive', 0, 1] } }
          }
        }
      ])
      
      const totalUsers = await User.countDocuments()
      const activeUsers = await User.countDocuments({ isActive: true })
      
      res.json({
        success: true,
        data: {
          totalUsers,
          activeUsers,
          inactiveUsers: totalUsers - activeUsers,
          byUserType: stats.reduce((acc, stat) => {
            acc[stat._id] = {
              total: stat.count,
              active: stat.active,
              inactive: stat.inactive
            }
            return acc
          }, {})
        }
      })
    } catch (error) {
      console.error('Error fetching user statistics:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user statistics',
        error: error.message
      })
    }
  }
}

module.exports = UserController