const User = require("../models/User")
const AuditLog = require("../models/AuditLog")

class UserController {
  // Get all users
  static async getAllUsers(req, res, next) {
    try {
      const { userType, isActive, page = 1, limit = 50, search } = req.query

      // Build filter
      const filter = {}
      if (userType) filter.userType = userType
      if (isActive !== undefined) filter.isActive = isActive === "true"
      if (search) {
        filter.$or = [
          { username: { $regex: search, $options: "i" } },
          { userType: { $regex: search, $options: "i" } }
        ]
      }

      // Pagination
      const skip = (page - 1) * limit

      const users = await User.find(filter)
        .select("-passwordHash")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number.parseInt(limit))

      const total = await User.countDocuments(filter)

      // Log the access using the static method
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        { username: req.user?.username },
        `Users list accessed - ${users.length} users returned`,
        req
      )

      res.json(users)
    } catch (error) {
      next(error)
    }
  }

  // Get single user
  static async getUser(req, res, next) {
    try {
      const { id } = req.params

      const user = await User.findById(id).select("-passwordHash")
      if (!user) {
        // Log failed access attempt
        await AuditLog.logUserAction(
          "SYSTEM_ACCESS",
          { username: req.user?.username },
          `Failed to access user - User ID ${id} not found`,
          req
        )
        
        const error = new Error("User not found")
        error.statusCode = 404
        return next(error)
      }

      // Log successful user access
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        { username: req.user?.username },
        `User accessed - ${user.username} (${user.userType})`,
        req
      )

      res.json(user)
    } catch (error) {
      next(error)
    }
  }

  // Create new user
  static async createUser(req, res, next) {
    try {
      const { username, password, userType, isActive = true } = req.body

      // Validation
      if (!username || !password || !userType) {
        const error = new Error("Username, password, and user type are required")
        error.statusCode = 400
        return next(error)
      }

      const validUserTypes = ["admin", "election_committee", "sao"]
      if (!validUserTypes.includes(userType)) {
        const error = new Error("Invalid user type")
        error.statusCode = 400
        return next(error)
      }

      if (password.length < 6) {
        const error = new Error("Password must be at least 6 characters long")
        error.statusCode = 400
        return next(error)
      }

      // Check if username already exists
      const existingUser = await User.findOne({ username })
      if (existingUser) {
        // Log failed creation attempt
        await AuditLog.logUserAction(
          "CREATE_USER",
          { username: req.user?.username },
          `Failed to create user - Username ${username} already exists`,
          req
        )
        
        const error = new Error("Username already exists")
        error.statusCode = 400
        return next(error)
      }

      // Create user using the static method
      const user = await User.createWithPassword({
        username,
        password,
        userType,
        isActive,
      })

      // Log the creation using the static method
      await AuditLog.logUserAction(
        "CREATE_USER",
        { username: req.user?.username, userId: req.user?.userId },
        `User created - ${username} (${userType})`,
        req
      )

      const userResponse = await User.findById(user._id).select("-passwordHash")

      res.status(201).json({
        message: "User created successfully",
        user: userResponse,
      })
    } catch (error) {
      next(error)
    }
  }

  // Update user
  static async updateUser(req, res, next) {
    try {
      const { id } = req.params
      const { username, password, userType, isActive } = req.body

      const user = await User.findById(id)
      if (!user) {
        // Log failed update attempt
        await AuditLog.logUserAction(
          "UPDATE_USER",
          { username: req.user?.username },
          `Failed to update user - User ID ${id} not found`,
          req
        )
        
        const error = new Error("User not found")
        error.statusCode = 404
        return next(error)
      }

      const originalUsername = user.username
      const originalUserType = user.userType
      const originalIsActive = user.isActive
      let updateDetails = []

      // Update username if provided
      if (username && username !== user.username) {
        // Check if new username already exists
        const existingUser = await User.findOne({ username, _id: { $ne: id } })
        if (existingUser) {
          await AuditLog.logUserAction(
            "UPDATE_USER",
            { username: req.user?.username },
            `Failed to update user - Username ${username} already exists`,
            req
          )
          
          const error = new Error("Username already exists")
          error.statusCode = 400
          return next(error)
        }
        user.username = username
        updateDetails.push(`username changed from ${originalUsername} to ${username}`)
      }

      // Update password if provided
      if (password) {
        if (password.length < 6) {
          const error = new Error("Password must be at least 6 characters long")
          error.statusCode = 400
          return next(error)
        }
        await user.updatePassword(password)
        updateDetails.push("password updated")
      }

      // Update userType if provided
      if (userType && userType !== user.userType) {
        const validUserTypes = ["admin", "election_committee", "sao"]
        if (!validUserTypes.includes(userType)) {
          const error = new Error("Invalid user type")
          error.statusCode = 400
          return next(error)
        }
        user.userType = userType
        updateDetails.push(`user type changed from ${originalUserType} to ${userType}`)
      }

      // Update isActive if provided
      if (isActive !== undefined && isActive !== user.isActive) {
        user.isActive = isActive
        updateDetails.push(`status changed from ${originalIsActive ? 'active' : 'inactive'} to ${isActive ? 'active' : 'inactive'}`)
        
        // Log specific activation/deactivation actions
        const activationAction = isActive ? "ACTIVATE_USER" : "DEACTIVATE_USER"
        await AuditLog.logUserAction(
          activationAction,
          { username: req.user?.username, userId: req.user?.userId },
          `User ${isActive ? 'activated' : 'deactivated'} - ${user.username} (${user.userType})`,
          req
        )
      }

      await user.save()

      // Log the update with detailed changes
      const detailsString = updateDetails.length > 0 
        ? `User updated - ${user.username} (${user.userType}): ${updateDetails.join(', ')}`
        : `User updated - ${user.username} (${user.userType})`
        
      await AuditLog.logUserAction(
        "UPDATE_USER",
        { username: req.user?.username, userId: req.user?.userId },
        detailsString,
        req
      )

      const updatedUser = await User.findById(id).select("-passwordHash")

      res.json({
        message: "User updated successfully",
        user: updatedUser,
      })
    } catch (error) {
      next(error)
    }
  }

  // Delete user
  static async deleteUser(req, res, next) {
    try {
      const { id } = req.params

      const user = await User.findById(id)
      if (!user) {
        // Log failed deletion attempt
        await AuditLog.logUserAction(
          "DELETE_USER",
          { username: req.user?.username },
          `Failed to delete user - User ID ${id} not found`,
          req
        )
        
        const error = new Error("User not found")
        error.statusCode = 404
        return next(error)
      }

      // Prevent deletion of the last admin
      if (user.userType === "admin") {
        const adminCount = await User.countDocuments({ userType: "admin", isActive: true })
        if (adminCount <= 1) {
          // Log failed deletion attempt
          await AuditLog.logUserAction(
            "DELETE_USER",
            { username: req.user?.username },
            `Failed to delete user - Cannot delete last active admin: ${user.username}`,
            req
          )
          
          const error = new Error("Cannot delete the last active admin user")
          error.statusCode = 400
          return next(error)
        }
      }

      const deletedUsername = user.username
      const deletedUserType = user.userType

      await User.findByIdAndDelete(id)

      // Log the deletion using the static method
      await AuditLog.logUserAction(
        "DELETE_USER",
        { username: req.user?.username, userId: req.user?.userId },
        `User deleted - ${deletedUsername} (${deletedUserType})`,
        req
      )

      res.json({ message: "User deleted successfully" })
    } catch (error) {
      next(error)
    }
  }

  // Get user statistics
  static async getStatistics(req, res, next) {
    try {
      const total = await User.countDocuments()
      const active = await User.countDocuments({ isActive: true })
      const inactive = total - active

      const byUserType = await User.aggregate([
        {
          $group: {
            _id: "$userType",
            total: { $sum: 1 },
            active: {
              $sum: {
                $cond: ["$isActive", 1, 0],
              },
            },
          },
        },
      ])

      // Log statistics access
      await AuditLog.logUserAction(
        "SYSTEM_ACCESS",
        { username: req.user?.username },
        `User statistics accessed - Total: ${total}, Active: ${active}, Inactive: ${inactive}`,
        req
      )

      res.json({
        total,
        active,
        inactive,
        byUserType,
      })
    } catch (error) {
      next(error)
    }
  }
}

module.exports = UserController