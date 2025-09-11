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
        // Log failed login attempt - user not found
        try {
          await AuditLog.create({
            action: "UNAUTHORIZED_ACCESS_ATTEMPT",
            username: username || "unknown",
            details: "Failed login attempt - user not found",
            ipAddress: req.ip,
            userAgent: req.get("User-Agent"),
          })
        } catch (logError) {
          console.error("Failed to log audit entry:", logError.message)
        }
        const error = new Error("Invalid credentials")
        error.statusCode = 401
        return next(error)
      }

      // Check password using the model method
      const isValidPassword = await user.comparePassword(password)
      if (!isValidPassword) {
        // Log failed login attempt - invalid password
        try {
          await AuditLog.create({
            action: "UNAUTHORIZED_ACCESS_ATTEMPT",
            username: user.username,
            userId: user._id,
            details: "Failed login attempt - invalid password",
            ipAddress: req.ip,
            userAgent: req.get("User-Agent"),
          })
        } catch (logError) {
          console.error("Failed to log audit entry:", logError.message)
        }
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
      try {
        await AuditLog.create({
          action: "LOGIN",
          username: user.username,
          userId: user._id,
          details: `Successful login - ${user.userType}`,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        })
      } catch (logError) {
        console.error("Failed to log audit entry:", logError.message)
      }

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

  // Voter Login - Updated to include department information
  static async voterLogin(req, res, next) {
    try {
      const { userId, password } = req.body

      if (!userId || !password) {
        const error = new Error("School ID and password are required")
        error.statusCode = 400
        return next(error)
      }

      // Convert userId to Number for consistent querying
      const schoolId = Number(userId)
      if (isNaN(schoolId)) {
        const error = new Error("Invalid School ID format")
        error.statusCode = 400
        return next(error)
      }

      // Find voter by school ID and populate department information
      const voter = await Voter.findOne({ schoolId }).populate("departmentId")
      if (!voter) {
        await AuditLog.create({
          action: "UNAUTHORIZED_ACCESS_ATTEMPT",
          username: userId.toString(),
          schoolId: schoolId,
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
        await AuditLog.create({
          action: "UNAUTHORIZED_ACCESS_ATTEMPT",
          username: voter.schoolId.toString(),
          voterId: voter._id,
          schoolId: voter.schoolId,
          details: "Failed voter login - account not activated",
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        })
        const error = new Error("Account not activated. Please complete pre-registration first.")
        error.statusCode = 401
        return next(error)
      }

      // Check password using the model method
      const isValidPassword = await voter.comparePassword(password)
      if (!isValidPassword) {
        await AuditLog.create({
          action: "UNAUTHORIZED_ACCESS_ATTEMPT",
          username: voter.schoolId.toString(),
          voterId: voter._id,
          schoolId: voter.schoolId,
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
        voterId: voter._id,
        schoolId: voter.schoolId,
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
          yearLevel: voter.yearLevel,
          department: voter.departmentId ? {
            id: voter.departmentId._id,
            departmentCode: voter.departmentId.departmentCode,
            degreeProgram: voter.departmentId.degreeProgram,
            college: voter.departmentId.college
          } : null,
          userType: "voter",
        },
        redirectTo: "/voter/dashboard",
      })
    } catch (error) {
      next(error)
    }
  }

  // Pre-registration Step 1 
  static async preRegisterStep1(req, res, next) {
    try {
      const { schoolId } = req.body

      if (!schoolId) {
        const error = new Error("School ID is required")
        error.statusCode = 400
        return next(error)
      }

      // Convert schoolId to Number for consistent querying
      const schoolIdNumber = Number(schoolId)
      if (isNaN(schoolIdNumber)) {
        const error = new Error("Invalid School ID format")
        error.statusCode = 400
        return next(error)
      }

      // Find voter by school ID and populate department information
      const voter = await Voter.findOne({ schoolId: schoolIdNumber }).populate("departmentId")
      if (!voter) {
        // Log failed pre-registration attempt
        await AuditLog.create({
          action: "VOTER_REGISTRATION",
          username: schoolId.toString(),
          schoolId: schoolIdNumber,
          details: "Pre-registration step 1 failed - student not found in database",
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        })
        const error = new Error("Student not found in voter database")
        error.statusCode = 404
        return next(error)
      }

      // Check if voter already has a password (already registered)
      if (voter.password) {
        await AuditLog.create({
          action: "VOTER_REGISTRATION",
          username: voter.schoolId.toString(),
          voterId: voter._id,
          schoolId: voter.schoolId,
          details: "Pre-registration step 1 failed - account already registered",
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        })
        const error = new Error("This account is already registered. Please use the login page.")
        error.statusCode = 400
        return next(error)
      }

      // Log successful pre-registration step 1
      await AuditLog.create({
        action: "VOTER_REGISTRATION",
        username: voter.schoolId.toString(),
        voterId: voter._id,
        schoolId: voter.schoolId,
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
          yearLevel: voter.yearLevel,
          department: voter.departmentId ? {
            id: voter.departmentId._id,
            departmentCode: voter.departmentId.departmentCode,
            degreeProgram: voter.departmentId.degreeProgram,
            college: voter.departmentId.college,
            displayName: voter.departmentId.displayName
          } : null,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  // Pre-registration Step 2 - Updated validation and response
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

      // Find voter and populate department
      const voter = await Voter.findById(voterId).populate("departmentId")
      if (!voter) {
        const error = new Error("Voter not found")
        error.statusCode = 404
        return next(error)
      }

      // Check if already registered
      if (voter.password) {
        await AuditLog.create({
          action: "VOTER_REGISTRATION",
          username: voter.schoolId.toString(),
          voterId: voter._id,
          schoolId: voter.schoolId,
          details: "Pre-registration step 2 failed - account already registered",
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        })
        const error = new Error("This account is already registered")
        error.statusCode = 400
        return next(error)
      }

      // Update voter with password (pre-save hook will handle hashing and registration status)
      voter.password = password;
      await voter.save();

      // Log successful registration completion
      await AuditLog.create({
        action: "VOTER_REGISTRATION",
        username: voter.schoolId.toString(),
        voterId: voter._id,
        schoolId: voter.schoolId,
        details: `Pre-registration completed successfully - ${voter.firstName} ${voter.lastName}`,
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
          yearLevel: voter.yearLevel,
          department: voter.departmentId ? {
            id: voter.departmentId._id,
            departmentCode: voter.departmentId.departmentCode,
            degreeProgram: voter.departmentId.degreeProgram,
            college: voter.departmentId.college
          } : null,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  // Logout
  static async logout(req, res, next) {
    try {
      const { username, userType, voterId, schoolId } = req.user || {}

      // Log logout with proper user identification
      await AuditLog.create({
        action: "LOGOUT",
        username: username || schoolId?.toString() || "unknown",
        userId: req.user?.userId || null,
        voterId: voterId || null,
        schoolId: schoolId || null,
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