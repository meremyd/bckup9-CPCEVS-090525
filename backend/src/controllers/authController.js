const User = require("../models/User")
const Voter = require("../models/Voter")
const AuditLog = require("../models/AuditLog")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")

class AuthController {
  // Admin/Staff Login
  static async login(req, res, next) {
    try {
      const { username, password } = req.body

      if (!username || !password) {
        const error = new Error("Username and password are required")
        error.statusCode = 400
        return next(error)
      }

      // Find user by username
      const user = await User.findOne({ username, isActive: true })
      if (!user) {
        await AuditLog.create({
          action: "LOGIN",
          username: username || "unknown",
          details: "Failed login attempt - user not found",
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        })
        const error = new Error("Invalid credentials")
        error.statusCode = 401
        return next(error)
      }

      // Check password
      const isValidPassword = await user.comparePassword(password)
      if (!isValidPassword) {
        await AuditLog.create({
          action: "LOGIN",
          username: user.username,
          details: "Failed login attempt - invalid password",
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        })
        const error = new Error("Invalid credentials")
        error.statusCode = 401
        return next(error)
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user._id,
          username: user.username,
          userType: user.userType,
        },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "24h" },
      )

      // Log successful login
      await AuditLog.create({
        action: "LOGIN",
        username: user.username,
        details: `Successful login - ${user.userType}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

      res.json({
        message: "Login successful",
        token,
        user: {
          id: user._id,
          username: user.username,
          userType: user.userType,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  // Voter Login
  static async voterLogin(req, res, next) {
    try {
      const { userId, password } = req.body

      if (!userId || !password) {
        const error = new Error("School ID and password are required")
        error.statusCode = 400
        return next(error)
      }

      // Find voter by school ID
      const voter = await Voter.findOne({ schoolId: userId }).populate("degreeId")
      if (!voter) {
        await AuditLog.create({
          action: "LOGIN",
          username: userId,
          details: "Failed voter login - voter not found",
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        })
        const error = new Error("Invalid credentials")
        error.statusCode = 401
        return next(error)
      }

      // Check if voter has a password set
      if (!voter.password) {
        const error = new Error("Account not activated. Please complete pre-registration first.")
        error.statusCode = 401
        return next(error)
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, voter.password)
      if (!isValidPassword) {
        await AuditLog.create({
          action: "LOGIN",
          username: voter.schoolId.toString(),
          details: "Failed voter login - invalid password",
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        })
        const error = new Error("Invalid credentials")
        error.statusCode = 401
        return next(error)
      }

      // Generate JWT token for voter
      const token = jwt.sign(
        {
          voterId: voter._id,
          schoolId: voter.schoolId,
          userType: "voter",
        },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "24h" },
      )

      // Log successful login
      await AuditLog.create({
        action: "LOGIN",
        username: voter.schoolId.toString(),
        details: `Successful voter login - ${voter.firstName} ${voter.lastName}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

      res.json({
        message: "Login successful",
        token,
        user: {
          id: voter._id,
          schoolId: voter.schoolId,
          firstName: voter.firstName,
          lastName: voter.lastName,
          userType: "voter",
        },
        redirectTo: "/voter/dashboard",
      })
    } catch (error) {
      next(error)
    }
  }

  // Pre-registration Step 1 - Verify voter exists
  static async preRegisterStep1(req, res, next) {
    try {
      const { schoolId } = req.body

      if (!schoolId) {
        const error = new Error("School ID is required")
        error.statusCode = 400
        return next(error)
      }

      // Find voter by school ID
      const voter = await Voter.findOne({ schoolId }).populate("degreeId")
      if (!voter) {
        const error = new Error("Student not found in voter database")
        error.statusCode = 404
        return next(error)
      }

      // Check if voter already has a password (already registered)
      if (voter.password) {
        const error = new Error("This account is already registered. Please use the login page.")
        error.statusCode = 400
        return next(error)
      }

      // Log pre-registration attempt
      await AuditLog.create({
        action: "VOTER_REGISTRATION",
        username: voter.schoolId.toString(),
        details: `Pre-registration step 1 completed - ${voter.firstName} ${voter.lastName}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

      res.json({
        message: "Voter found and eligible for registration",
        voter: {
          id: voter._id,
          schoolId: voter.schoolId,
          firstName: voter.firstName,
          middleName: voter.middleName,
          lastName: voter.lastName,
          degree: voter.degreeId,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  // Pre-registration Step 2 - Set password and complete registration
  static async preRegisterStep2(req, res, next) {
    try {
      const { voterId, password, confirmPassword, firstName, middleName, lastName, schoolId, photoCompleted } = req.body

      // Validation
      if (!voterId || !password || !confirmPassword) {
        const error = new Error("All fields are required")
        error.statusCode = 400
        return next(error)
      }

      if (password !== confirmPassword) {
        const error = new Error("Passwords do not match")
        error.statusCode = 400
        return next(error)
      }

      if (password.length < 6) {
        const error = new Error("Password must be at least 6 characters long")
        error.statusCode = 400
        return next(error)
      }

      if (!photoCompleted) {
        const error = new Error("Face recognition must be completed")
        error.statusCode = 400
        return next(error)
      }

      // Find voter
      const voter = await Voter.findById(voterId)
      if (!voter) {
        const error = new Error("Voter not found")
        error.statusCode = 404
        return next(error)
      }

      // Check if already registered
      if (voter.password) {
        const error = new Error("This account is already registered")
        error.statusCode = 400
        return next(error)
      }

      // Hash password
      const saltRounds = 12
      const hashedPassword = await bcrypt.hash(password, saltRounds)

      // Update voter with password
      await Voter.findByIdAndUpdate(voterId, {
        password: hashedPassword,
      })

      // Log successful registration
      await AuditLog.create({
        action: "VOTER_REGISTRATION",
        username: voter.schoolId.toString(),
        details: `Pre-registration completed - ${voter.firstName} ${voter.lastName}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

      res.json({
        message: "Registration completed successfully",
        voter: {
          id: voter._id,
          schoolId: voter.schoolId,
          firstName: voter.firstName,
          lastName: voter.lastName,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  // Logout
  static async logout(req, res, next) {
    try {
      const { username, userType } = req.user || {}

      // Log logout
      await AuditLog.create({
        action: "LOGOUT",
        username: username || "unknown",
        details: `User logged out - ${userType || "unknown"}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      })

      res.json({ message: "Logout successful" })
    } catch (error) {
      next(error)
    }
  }
}

module.exports = AuthController