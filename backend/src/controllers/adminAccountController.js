const Voter = require('../models/Voter')
const User = require('../models/User')
const Department = require('../models/Department')
const AuditLog = require('../models/AuditLog')

// Lookup accounts by email or studentId
exports.lookup = async (req, res, next) => {
  try {
    const { email, studentId } = req.query
    const accounts = []
    // Prioritize lookup by studentId when provided
    if (studentId) {
      const sid = Number(studentId)
      if (!isNaN(sid)) {
        const voter = await Voter.findOne({ schoolId: sid }).lean()
        if (voter) {
          // indicate which field matched
          voter.matchedBy = 'studentId'
          return res.status(200).json({ found: true, accounts: [{ type: 'voter', ...voter }] })
        }
      }
    }

    // If not found by studentId, try email lookup
    if (email) {
      const e = String(email).toLowerCase()
      const voter = await Voter.findOne({ email: e }).lean()
      if (voter) {
        voter.matchedBy = 'email'
        return res.status(200).json({ found: true, accounts: [{ type: 'voter', ...voter }] })
      }
      const user = await User.findOne({ username: e }).lean()
      if (user) {
        user.matchedBy = 'email'
        return res.status(200).json({ found: true, accounts: [{ type: 'user', ...user }] })
      }
    }

    return res.status(200).json({ found: false })
  } catch (error) {
    next(error)
  }
}

// Create account (defaults to voter)
exports.create = async (req, res, next) => {
  try {
    const { type = 'voter' } = req.body

    if (type === 'voter') {
      const { firstName, middleName, lastName, schoolId, department, yearLevel } = req.body
      if (!schoolId || !firstName || !lastName || !department) {
        return res.status(400).json({ success: false, message: 'schoolId, firstName, lastName and department are required' })
      }

      // attempt to find department
      let deptDoc = null
      if (department) {
        deptDoc = await Department.findOne({ $or: [{ departmentCode: department }, { degreeProgram: department }] })
      }
      if (!deptDoc) return res.status(400).json({ success: false, message: 'Department not found' })

      // Determine yearLevel: accept provided value (1-4), otherwise default to 1
      let yl = 1
      if (typeof yearLevel !== 'undefined' && yearLevel !== null && yearLevel !== '') {
        const maybe = Number(yearLevel)
        if (isNaN(maybe) || maybe < 1 || maybe > 4) {
          return res.status(400).json({ success: false, message: 'Invalid yearLevel (must be integer 1-4)' })
        }
        yl = Math.floor(maybe)
      }

      // Build payload WITHOUT email for created accounts per admin request
      const payload = {
        schoolId: Number(schoolId),
        firstName,
        middleName: middleName || null,
        lastName,
        departmentId: deptDoc._id,
        yearLevel: yl,
        isActive: true
      }

      const existing = await Voter.findOne({ schoolId: payload.schoolId })
      if (existing) return res.status(400).json({ success: false, message: 'Voter with this School ID already exists' })

      const created = await Voter.create(payload)

      // audit
      try { await AuditLog.create({ adminId: req.user?._id, action: 'create_account', targetId: created._id, details: { fromMessage: req.body.fromMessageId || null } }) } catch (e) { }

      return res.status(201).json({ success: true, account: created, activationSent: false })
    }

    // user creation not implemented in this helper
    return res.status(400).json({ success: false, message: 'Only voter account creation is supported via this endpoint' })
  } catch (error) {
    next(error)
  }
}

// Update account (voter)
exports.update = async (req, res, next) => {
  try {
    const { id } = req.params
    const { firstName, middleName, lastName, email, schoolId, department, yearLevel } = req.body

    // try voter first
    const voter = await Voter.findById(id)
    if (voter) {
      if (firstName) voter.firstName = firstName
      if (middleName !== undefined) voter.middleName = middleName
      if (lastName) voter.lastName = lastName
      if (email) voter.email = String(email).toLowerCase()
      if (schoolId) voter.schoolId = Number(schoolId)
      if (typeof yearLevel !== 'undefined' && yearLevel !== null && yearLevel !== '') {
        const maybe = Number(yearLevel)
        if (!isNaN(maybe) && maybe >= 1 && maybe <= 4) voter.yearLevel = Math.floor(maybe)
      }
      if (department) {
        const deptDoc = await Department.findOne({ $or: [{ departmentCode: department }, { degreeProgram: department }] })
        if (deptDoc) voter.departmentId = deptDoc._id
      }
      await voter.save()
      try { await AuditLog.create({ adminId: req.user?._id, action: 'update_account', targetId: voter._id, details: {} }) } catch (e) {}
      return res.status(200).json({ success: true, account: voter })
    }

    // try user
    const user = await User.findById(id)
    if (user) {
      if (email) user.username = email
      if (typeof req.body.isActive !== 'undefined') user.isActive = !!req.body.isActive
      await user.save()
      try { await AuditLog.create({ adminId: req.user?._id, action: 'update_account', targetId: user._id, details: {} }) } catch (e) {}
      return res.status(200).json({ success: true, account: user })
    }

    return res.status(404).json({ success: false, message: 'Account not found' })
  } catch (error) {
    next(error)
  }
}