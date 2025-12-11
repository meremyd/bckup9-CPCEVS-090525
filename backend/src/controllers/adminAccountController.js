const Voter = require('../models/Voter')
const User = require('../models/User')
const Department = require('../models/Department')
const AuditLog = require('../models/AuditLog')

exports.lookup = async (req, res, next) => {
  try {
    const { email, studentId } = req.query
    const accounts = []

    if (studentId) {
      const sid = Number(studentId)
      if (!isNaN(sid)) {
        const voter = await Voter.findOne({ schoolId: sid }).lean()
        if (voter) {

          voter.matchedBy = 'studentId'
          return res.status(200).json({ found: true, accounts: [{ type: 'voter', ...voter }] })
        }
      }
    }

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

exports.create = async (req, res, next) => {
  try {
    const { type = 'voter' } = req.body

    if (type === 'voter') {
      const { firstName, middleName, lastName, schoolId, department, yearLevel } = req.body
      if (!schoolId || !firstName || !lastName || !department) {
        return res.status(400).json({ success: false, message: 'schoolId, firstName, lastName and department are required' })
      }

      let deptDoc = null
      if (department) {
        deptDoc = await Department.findOne({ $or: [{ departmentCode: department }, { degreeProgram: department }] })
      }
      if (!deptDoc) return res.status(400).json({ success: false, message: 'Department not found' })

      let yl = 1
      if (typeof yearLevel !== 'undefined' && yearLevel !== null && yearLevel !== '') {
        const maybe = Number(yearLevel)
        if (isNaN(maybe) || maybe < 1 || maybe > 4) {
          return res.status(400).json({ success: false, message: 'Invalid yearLevel (must be integer 1-4)' })
        }
        yl = Math.floor(maybe)
      }

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

      try { await AuditLog.create({ adminId: req.user?._id, action: 'create_account', targetId: created._id, details: { fromMessage: req.body.fromMessageId || null } }) } catch (e) { }

      return res.status(201).json({ success: true, account: created, activationSent: false })
    }

    return res.status(400).json({ success: false, message: 'Only voter account creation is supported via this endpoint' })
  } catch (error) {
    next(error)
  }
}

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params
    const { firstName, middleName, lastName, email, schoolId, department, yearLevel } = req.body

    const voter = await Voter.findById(id)
    if (voter) {
      if (firstName) voter.firstName = firstName
      if (middleName !== undefined) voter.middleName = middleName
      if (lastName) voter.lastName = lastName
      if (email) {
        const e = String(email).toLowerCase()

        const existing = await Voter.findOne({ email: e })
        if (existing && String(existing._id) !== String(id)) {
          return res.status(400).json({ success: false, message: 'Email already in use by another voter' })
        }
        voter.email = e
      }
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

    const user = await User.findById(id)
    if (user) {
      if (email) {
        const e = String(email).toLowerCase()

        const conflictingVoter = await Voter.findOne({ email: e })
        if (conflictingVoter) {
          return res.status(400).json({ success: false, message: 'Email already in use by a voter' })
        }
        user.username = e
      }
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