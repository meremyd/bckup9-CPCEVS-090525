const User = require("../models/User")
const AuditLog = require("../models/AuditLog")
const bcrypt = require("bcryptjs")

class UserController {
  // Get all users
  static async getAllUsers(req, res, next) {
    try {
      const { userType, isActive, page = 1, limit = 10 } = req.query

      // Build filter
      const filter = {}
      if (userType) filter.userType = userType
      if (isActive !== undefined) filter.isActive = isActive === "true"

      // Pagination
      const skip = (page - 1) * limit

      const users = await User.find(filter)
        .select("-passwordHash")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number.parseInt(limit))

      const total = await User.countDocuments(filter)

      res.json({
        users,
        pagination: {
          current: Number.parseInt(page),
          total: Math.ceil(total / limit),
          count: users.length,
          totalUsers: total,
        },
      })
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
        const error = new Error("User not found")
        error.statusCode = 404
        return next(error)
      }

      res.json(user)
    } catch (error) {
      next(error)
    }
  }

  // Create new user
  static async createUser(req, res, next) {
    try {
      const { username, password, userType } = req.body

      // Validation
      if (!username || !password || !userType) {
        const error = new Error("Username, password, and user type are required")
        error.statusCode = 400
        return next(error)
      }

      const validUserTypes = ["admin", "election_committee", "sao", "voter"]
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
        const error = new Error("Username already exists")
        error.statusCode = 400
        return next(error)
      }

      // Hash password
      const saltRounds = 12
      const passwordHash = await bcrypt.hash(password, saltRounds)

      // Create user
      const user = new User({
        username,
        passwordHash,
        userType,
        isActive: true,
      })

      await user.save()

      // Log the creation
      await AuditLog.create({
        action: "CREATE_USER",
        username: req.user?.username || "system",
        details: `User created - ${username} (${userType})`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

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
        const error = new Error("User not found")
        error.statusCode = 404
        return next(error)
      }

      // Build update data
      const updateData = {}

      if (username && username !== user.username) {
        // Check if new username already exists
        const existingUser = await User.findOne({ username, _id: { $ne: id } })
        if (existingUser) {
          const error = new Error("Username already exists")
          error.statusCode = 400
          return next(error)
        }
        updateData.username = username
      }

      if (password) {
        if (password.length < 6) {
          const error = new Error("Password must be at least 6 characters long")
          error.statusCode = 400
          return next(error)
        }
        const saltRounds = 12
        updateData.passwordHash = await bcrypt.hash(password, saltRounds)
      }

      if (userType) {
        const validUserTypes = ["admin", "election_committee", "sao", "voter"]
        if (!validUserTypes.includes(userType)) {
          const error = new Error("Invalid user type")
          error.statusCode = 400
          return next(error)
        }
        updateData.userType = userType
      }

      if (isActive !== undefined) {
        updateData.isActive = isActive
      }

      const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true }).select("-passwordHash")

      // Log the update
      await AuditLog.create({
        action: "UPDATE_USER",
        username: req.user?.username || "system",
        details: `User updated - ${updatedUser.username} (${updatedUser.userType})`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

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
        const error = new Error("User not found")
        error.statusCode = 404
        return next(error)
      }

      // Prevent deletion of the last admin
      if (user.userType === "admin") {
        const adminCount = await User.countDocuments({ userType: "admin", isActive: true })
        if (adminCount <= 1) {
          const error = new Error("Cannot delete the last active admin user")
          error.statusCode = 400
          return next(error)
        }
      }

      await User.findByIdAndDelete(id)

      // Log the deletion
      await AuditLog.create({
        action: "DELETE_USER",
        username: req.user?.username || "system",
        details: `User deleted - ${user.username} (${user.userType})`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

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