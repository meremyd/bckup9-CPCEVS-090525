const mongoose = require("mongoose")
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

      // Instead of issuing a token immediately, generate an OTP and email it
      // This enables two-step authentication: password -> OTP

      if (!voter.email) {
        const error = new Error('No email on file for this voter')
        error.statusCode = 400
        return next(error)
      }

      // generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString()
      const expires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

      voter.otpCode = otp
      voter.otpExpires = expires
      voter.otpVerified = false
      await voter.save()

      const { sendMail } = require('../utils/mailer')
      try {
        await sendMail({
          to: voter.email,
          subject: 'Your OTP for login',
          text: `Your OTP to complete login is ${otp}. It expires in 10 minutes.`,
          html: `<p>Your OTP to complete login is <strong>${otp}</strong>. It expires in 10 minutes.</p>`,
        })
      } catch (mailErr) {
        console.error('Failed to send login OTP email:', mailErr && mailErr.message)
        const error = new Error('Failed to send OTP email. Please try again later.')
        error.statusCode = 500
        return next(error)
      }

      await AuditLog.create({
        action: 'LOGIN',
        username: voter.schoolId.toString(),
        voterId: voter._id,
        schoolId: voter.schoolId,
        details: 'OTP sent for voter login',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      })

      // Tell the frontend to prompt for OTP
      res.json({ message: 'OTP sent to registered email', otpRequired: true, voterId: voter._id })
    } catch (error) {
      next(error)
    }
  }

  // Verify OTP for voter login and issue JWT
  static async voterLoginVerifyOtp(req, res, next) {
    try {
      const { voterId, otp } = req.body
      if (!otp) {
        const error = new Error('OTP is required')
        error.statusCode = 400
        return next(error)
      }

      let voter
      if (voterId) {
        voter = await Voter.findById(voterId).populate('departmentId')
      } else {
        voter = await Voter.findOne({ otpCode: otp }).populate('departmentId')
      }

      if (!voter) {
        const error = new Error('Voter not found or OTP invalid')
        error.statusCode = 404
        return next(error)
      }

      if (!voter.otpCode || !voter.otpExpires) {
        const error = new Error('No OTP requested for this voter')
        error.statusCode = 400
        return next(error)
      }

      if (new Date() > voter.otpExpires) {
        const error = new Error('OTP has expired')
        error.statusCode = 400
        return next(error)
      }

      if (voter.otpCode !== otp) {
        const error = new Error('Invalid OTP')
        error.statusCode = 400
        return next(error)
      }

      // clear OTP fields and mark verified
      voter.otpVerified = true
      voter.otpCode = null
      voter.otpExpires = null
      await voter.save()

      // Issue JWT token for voter
      const token = jwt.sign(
        {
          voterId: voter._id,
          schoolId: voter.schoolId,
          userType: 'voter',
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' },
      )

      await AuditLog.create({
        action: 'LOGIN',
        username: voter.schoolId.toString(),
        voterId: voter._id,
        schoolId: voter.schoolId,
        details: `Successful voter login - ${voter.firstName} ${voter.lastName}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      })

      res.json({
        message: 'Login successful',
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
          isClassOfficer: voter.isClassOfficer,
          userType: 'voter',
        },
        redirectTo: '/voter/dashboard',
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
  // Pre-registration Step 2 - send OTP to email
  static async preRegisterStep2(req, res, next) {
    try {
      const { voterId, email } = req.body

      if (!voterId || !email) {
        const error = new Error("Voter ID and email are required")
        error.statusCode = 400
        return next(error)
      }

      const voter = await Voter.findById(voterId)
      if (!voter) {
        const error = new Error("Voter not found")
        error.statusCode = 404
        return next(error)
      }

      // Normalize email and check for duplicates
      const normalizedEmail = String(email).trim().toLowerCase()
      const existing = await Voter.findOne({ email: normalizedEmail, _id: { $ne: voter._id } })
      if (existing) {
        const error = new Error('Email is already registered to another account')
        error.statusCode = 400
        return next(error)
      }

      // generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString()
      const expires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

      voter.email = normalizedEmail
      voter.otpCode = otp
      voter.otpExpires = expires
      voter.otpVerified = false
      await voter.save()

      // send email
      const { sendMail } = require('../utils/mailer')
      try {
        await sendMail({
          to: email,
          subject: 'Your OTP for Pre-Registration',
          text: `Your OTP is ${otp}. It expires in 10 minutes.`,
          html: `<p>Your OTP is <strong>${otp}</strong>. It expires in 10 minutes.</p>`,
        })
      } catch (mailErr) {
        // Detailed logging for debugging send failures
        try {
          console.error('Failed to send OTP email - message:', mailErr && mailErr.message)
          console.error('Failed to send OTP email - stack:', mailErr && mailErr.stack)
          if (mailErr && mailErr.response) console.error('Failed to send OTP email - response:', mailErr.response)
        } catch (logErr) {
          console.error('Error while logging mailErr', logErr && logErr.message)
        }
        const error = new Error('Failed to send OTP email. Please try again later.')
        error.statusCode = 500
        return next(error)
      }

      await AuditLog.create({
        action: 'VOTER_REGISTRATION',
        username: voter.schoolId.toString(),
        voterId: voter._id,
        schoolId: voter.schoolId,
        details: 'OTP sent for pre-registration',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      })

  // Return voterId so frontend can proceed without asking the user for it
  res.json({ message: 'OTP sent to email', voterId: voter._id })
    } catch (error) {
      next(error)
    }
  }

  // Voter Forgot Password - Request OTP
  static async voterForgotPasswordRequest(req, res, next) {
    try {
      const { schoolId, email } = req.body

      if (!schoolId || !email) {
        const error = new Error('School ID and email are required')
        error.statusCode = 400
        return next(error)
      }

      const schoolIdNumber = Number(schoolId)
      if (isNaN(schoolIdNumber)) {
        const error = new Error('Invalid School ID format')
        error.statusCode = 400
        return next(error)
      }

      const voter = await Voter.findOne({ schoolId: schoolIdNumber })
      if (!voter) {
        const error = new Error('Voter not found')
        error.statusCode = 404
        return next(error)
      }

      const normalizedEmail = String(email).trim().toLowerCase()
      if (!voter.email || voter.email.toLowerCase() !== normalizedEmail) {
        const error = new Error('Email does not match our records for this School ID')
        error.statusCode = 400
        return next(error)
      }

      // generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString()
      const expires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

      voter.otpCode = otp
      voter.otpExpires = expires
      voter.otpVerified = false
      await voter.save()

      const { sendMail } = require('../utils/mailer')
      try {
        await sendMail({
          to: normalizedEmail,
          subject: 'Your OTP to reset password',
          text: `Your OTP to reset your password is ${otp}. It expires in 10 minutes.`,
          html: `<p>Your OTP to reset your password is <strong>${otp}</strong>. It expires in 10 minutes.</p>`,
        })
      } catch (mailErr) {
        console.error('Failed to send forgot-password OTP email:', mailErr && mailErr.message)
        const error = new Error('Failed to send OTP email. Please try again later.')
        error.statusCode = 500
        return next(error)
      }

      await AuditLog.create({
        action: 'PASSWORD_RESET_REQUEST',
        username: voter.schoolId.toString(),
        voterId: voter._id,
        schoolId: voter.schoolId,
        details: 'OTP sent for password reset',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      })

  // Return voterId so frontend can proceed to verify/reset without asking for voterId
  res.json({ message: 'OTP sent to email', voterId: voter._id })
    } catch (error) {
      next(error)
    }
  }

  // Verify OTP endpoint - accepts either { voterId, otp } or just { otp }
  static async verifyOtp(req, res, next) {
    try {
      const { voterId, otp } = req.body
      if (!otp) {
        const error = new Error('OTP is required')
        error.statusCode = 400
        return next(error)
      }

      let voter
      if (voterId) {
        voter = await Voter.findById(voterId)
      } else {
        // Find voter by otpCode (allows frontend to submit only OTP)
        voter = await Voter.findOne({ otpCode: otp })
      }

      if (!voter) {
        const error = new Error('Voter not found or OTP invalid')
        error.statusCode = 404
        return next(error)
      }

      if (!voter.otpCode || !voter.otpExpires) {
        const error = new Error('No OTP requested for this voter')
        error.statusCode = 400
        return next(error)
      }

      if (new Date() > voter.otpExpires) {
        const error = new Error('OTP has expired')
        error.statusCode = 400
        return next(error)
      }

      if (voter.otpCode !== otp) {
        const error = new Error('Invalid OTP')
        error.statusCode = 400
        return next(error)
      }

      voter.otpVerified = true
      voter.otpCode = null
      voter.otpExpires = null
      await voter.save()

      await AuditLog.create({
        action: 'VOTER_REGISTRATION',
        username: voter.schoolId.toString(),
        voterId: voter._id,
        schoolId: voter.schoolId,
        details: 'OTP verified for pre-registration or password reset',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      })

  // Return voterId so frontend can proceed to reset without extra inputs
  res.json({ message: 'OTP verified', voterId: voter._id })
    } catch (error) {
      next(error)
    }
  }

  // Resend OTP - generate a new OTP and send to the existing voter.email
  static async preRegisterResendOtp(req, res, next) {
    try {
      const { voterId } = req.body
      if (!voterId) {
        const error = new Error('Voter ID is required')
        error.statusCode = 400
        return next(error)
      }

      const voter = await Voter.findById(voterId)
      if (!voter) {
        const error = new Error('Voter not found')
        error.statusCode = 404
        return next(error)
      }

      if (!voter.email) {
        const error = new Error('No email on file for this voter')
        error.statusCode = 400
        return next(error)
      }

      // Normalize the stored email for consistency
      const normalizedEmail = String(voter.email).trim().toLowerCase()
      voter.email = normalizedEmail

      // generate new OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString()
      const expires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

      voter.otpCode = otp
      voter.otpExpires = expires
      voter.otpVerified = false
      await voter.save()

      const { sendMail } = require('../utils/mailer')
      try {
        await sendMail({
          to: voter.email,
          subject: 'Your OTP for Pre-Registration (Resent)',
          text: `Your new OTP is ${otp}. It expires in 10 minutes.`,
          html: `<p>Your new OTP is <strong>${otp}</strong>. It expires in 10 minutes.</p>`,
        })
      } catch (mailErr) {
        // Detailed logging for debugging send failures
        try {
          console.error('Failed to send resend OTP email - message:', mailErr && mailErr.message)
          console.error('Failed to send resend OTP email - stack:', mailErr && mailErr.stack)
          if (mailErr && mailErr.response) console.error('Failed to send resend OTP email - response:', mailErr.response)
        } catch (logErr) {
          console.error('Error while logging mailErr', logErr && logErr.message)
        }
        const error = new Error('Failed to resend OTP email. Please try again later.')
        error.statusCode = 500
        return next(error)
      }

      await AuditLog.create({
        action: 'VOTER_REGISTRATION',
        username: voter.schoolId.toString(),
        voterId: voter._id,
        schoolId: voter.schoolId,
        details: 'OTP resent for pre-registration',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      })

      res.json({ message: 'OTP resent to email' })
    } catch (error) {
      next(error)
    }
  }

  // Pre-registration Step 3 - previously Step 2: complete registration with password
  static async preRegisterStep3(req, res, next) {
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

      // Find voter and populate department
      const voter = await Voter.findById(voterId).populate("departmentId")
      if (!voter) {
        const error = new Error("Voter not found")
        error.statusCode = 404
        return next(error)
      }

      // Check if OTP was verified
      if (!voter.otpVerified && voter.email) {
        const error = new Error('Email not verified. Complete step 2 first.')
        error.statusCode = 400
        return next(error)
      }

      // Check if already registered
      if (voter.password) {
        await AuditLog.create({
          action: "VOTER_REGISTRATION",
          username: voter.schoolId.toString(),
          voterId: voter._id,
          schoolId: voter.schoolId,
          details: "Pre-registration step 3 failed - account already registered",
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

  // Reset password after verifying OTP
  static async voterResetPassword(req, res, next) {
    try {
      const { voterId, password, confirmPassword } = req.body

      if (!voterId || !password || !confirmPassword) {
        const error = new Error('Voter ID and new passwords are required')
        error.statusCode = 400
        return next(error)
      }

      if (password !== confirmPassword) {
        const error = new Error('Passwords do not match')
        error.statusCode = 400
        return next(error)
      }

      if (password.length < 6) {
        const error = new Error('Password must be at least 6 characters long')
        error.statusCode = 400
        return next(error)
      }

      const voter = await Voter.findById(voterId)
      if (!voter) {
        const error = new Error('Voter not found')
        error.statusCode = 404
        return next(error)
      }

      // Require OTP verification
      if (!voter.otpVerified) {
        const error = new Error('OTP not verified. Complete verification first.')
        error.statusCode = 400
        return next(error)
      }

      // Update password (pre-save hook will hash and set registration flags)
      voter.password = password
      // clear OTP fields
      voter.otpVerified = false
      voter.otpCode = null
      voter.otpExpires = null
      await voter.save()

      await AuditLog.create({
        action: 'PASSWORD_RESET_SUCCESS',
        username: voter.schoolId.toString(),
        voterId: voter._id,
        schoolId: voter.schoolId,
        details: 'Password reset completed',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      })

      res.json({ message: 'Password has been reset successfully' })
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

  static async checkAuth(req, res, next) {
  try {
    // The user should already be attached to req by the auth middleware
    if (!req.user) {
      const error = new Error("User not authenticated")
      error.statusCode = 401
      return next(error)
    }

    const { userId, voterId, username, userType, schoolId } = req.user

    // For admin/staff users
    if (userId) {
      const user = await User.findById(userId).select('-passwordHash')
      if (!user || !user.isActive) {
        const error = new Error("User account not found or inactive")
        error.statusCode = 401
        return next(error)
      }

      return res.json({
        authenticated: true,
        userType: 'staff',
        user: {
          id: user._id,
          username: user.username,
          userType: user.userType,
        }
      })
    }

    // For voters
    if (voterId) {
      const voter = await Voter.findById(voterId)
        .populate("departmentId")
        .select('-password')
        
      if (!voter || !voter.isActive) {
        const error = new Error("Voter account not found or inactive")
        error.statusCode = 401
        return next(error)
      }

      return res.json({
        authenticated: true,
        userType: 'voter',
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
        }
      })
    }

    const error = new Error("Invalid token format")
    error.statusCode = 401
    next(error)
  } catch (error) {
    next(error)
  }
}

// Refresh JWT token
static async refreshToken(req, res, next) {
  try {
    if (!req.user) {
      const error = new Error("User not authenticated")
      error.statusCode = 401
      return next(error)
    }

    const { userId, voterId, username, userType, schoolId } = req.user

    // For admin/staff users
    if (userId) {
      const user = await User.findById(userId)
      if (!user || !user.isActive) {
        const error = new Error("User account not found or inactive")
        error.statusCode = 401
        return next(error)
      }

      // Generate new JWT token
      const newToken = jwt.sign(
        {
          userId: user._id,
          username: user.username,
          userType: user.userType,
        },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "24h" }
      )

      // Log token refresh
      try {
        await AuditLog.create({
          action: "LOGIN", // Using LOGIN as it's similar to token refresh
          username: user.username,
          userId: user._id,
          details: "Token refreshed successfully",
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        })
      } catch (logError) {
        console.error("Failed to log token refresh:", logError.message)
      }

      return res.json({
        message: "Token refreshed successfully",
        token: newToken,
        user: {
          id: user._id,
          username: user.username,
          userType: user.userType,
        }
      })
    }

    // For voters
    if (voterId) {
      const voter = await Voter.findById(voterId).populate("departmentId")
      if (!voter || !voter.isActive) {
        const error = new Error("Voter account not found or inactive")
        error.statusCode = 401
        return next(error)
      }

      // Generate new JWT token for voter
      const newToken = jwt.sign(
        {
          voterId: voter._id,
          schoolId: voter.schoolId,
          userType: "voter",
        },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "24h" }
      )

      // Log token refresh
      try {
        await AuditLog.create({
          action: "LOGIN", // Using LOGIN as it's similar to token refresh
          username: voter.schoolId.toString(),
          voterId: voter._id,
          schoolId: voter.schoolId,
          details: "Voter token refreshed successfully",
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        })
      } catch (logError) {
        console.error("Failed to log token refresh:", logError.message)
      }

      return res.json({
        message: "Token refreshed successfully",
        token: newToken,
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
        }
      })
    }

    const error = new Error("Invalid token format")
    error.statusCode = 401
    next(error)
  } catch (error) {
    next(error)
  }
}

}

module.exports = AuthController