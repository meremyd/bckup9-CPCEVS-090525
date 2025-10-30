const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")
const path = require("path")
require("dotenv").config({ path: path.join(__dirname, "../../.env") })

async function migrate() {
  try {
    console.log("Connecting to MongoDB...")
    await mongoose.connect(process.env.MONGODB_URI)
    console.log("Connected to MongoDB")

    // Import models
    const User = require("../models/User")
    const Department = require("../models/Department")
    const Voter = require("../models/Voter")
    const DepartmentalElection = require("../models/DepartmentalElection")
    const SSGElection = require("../models/SSGElection")
    const Position = require("../models/Position")
    const Partylist = require("../models/Partylist")
    const Candidate = require("../models/Candidate")
    const AuditLog = require("../models/AuditLog")
    const Ballot = require("../models/Ballot")
    const Vote = require("../models/Vote")
    const ChatSupport = require("../models/ChatSupport")
    const ElectionParticipation = require("../models/ElectionParticipation")

    console.log("Clearing existing data...")
    await User.deleteMany({})
    await Department.deleteMany({})
    await Voter.deleteMany({})
    await DepartmentalElection.deleteMany({})
    await SSGElection.deleteMany({})
    await Position.deleteMany({})
    await Partylist.deleteMany({})
    await Candidate.deleteMany({})
    await AuditLog.deleteMany({})
    await Ballot.deleteMany({})
    await Vote.deleteMany({})
    await ChatSupport.deleteMany({})
    await ElectionParticipation.deleteMany({})

    // Drop indexes
    const modelsToDropIndexes = [
      { model: Position, name: "Position" },
      { model: Department, name: "Department" },
      { model: Voter, name: "Voter" },
      { model: Candidate, name: "Candidate" },
      { model: Ballot, name: "Ballot" },
      { model: Vote, name: "Vote" },
      { model: ElectionParticipation, name: "ElectionParticipation" },
      { model: Partylist, name: "Partylist" }
    ]

    for (const { model, name } of modelsToDropIndexes) {
      try {
        await model.collection.dropIndexes()
        console.log(`Dropped ${name} indexes`)
      } catch {
        console.log(`Could not drop ${name} indexes (might not exist yet)`)
      }
    }

    // Create users
    console.log("Migrating users...")
    const usersData = [
      { userType: "admin", username: "admin", passwordHash: "admin123", isActive: true },
      { userType: "election_committee", username: "ecommittee1", passwordHash: "committee123", isActive: true },
      { userType: "sao", username: "sao", passwordHash: "sao123", isActive: true },
    ]

    const users = []
    for (const userData of usersData) {
      const user = new User(userData)
      await user.save()
      users.push(user)
      console.log(`Created user: ${user.username} (${user.userType})`)
    }

    // Create departments
    console.log("Migrating departments...")
    const departments = await Department.insertMany([
      { departmentCode: "BEED", degreeProgram: "Bachelor of Elementary Education", college: "College of Teacher Education" },
      { departmentCode: "BSED", degreeProgram: "Bachelor of Secondary Education", college: "College of Teacher Education" },
      { departmentCode: "BSHM", degreeProgram: "Bachelor of Science in Hospitality Management", college: "College of Hospitality Management" },
      { departmentCode: "BSIT", degreeProgram: "Bachelor of Science in Information Technology", college: "College of Computer Studies" },
    ])
    console.log(`Migrated ${departments.length} departments`)

    // Create sample voters (unregistered - for OTP/registration flow)
    console.log("Creating sample unregistered voters...")
    const unregisteredVotersData = [
      {
        schoolId: 20210001,
        firstName: "Jay",
        middleName: "Lee",
        lastName: "Taylor",
        sex: "Male",
        departmentId: departments[3]._id, // BSIT (index 3)
        yearLevel: 3,
        email: "jay.taylor@student.edu",
        password: null,
        faceEncoding: null,
        profilePicture: null,
        isActive: true,
        isRegistered: false,
        isClassOfficer: false,
        otpCode: null,
        otpExpires: null,
        otpVerified: false,
      },
      {
        schoolId: 20210002,
        firstName: "Mary",
        middleName: "Jane",
        lastName: "Smith",
        sex: "Female",
        departmentId: departments[2]._id, // BSHM (index 2)
        yearLevel: 2,
        email: "mary.smith@student.edu",
        password: null,
        faceEncoding: null,
        profilePicture: null,
        isActive: true,
        isRegistered: false,
        isClassOfficer: false,
        otpCode: null,
        otpExpires: null,
        otpVerified: false,
      },
      {
        schoolId: 20210003,
        firstName: "John",
        middleName: "Paul",
        lastName: "Doe",
        sex: "Male",
        departmentId: departments[0]._id, // BEED (index 0)
        yearLevel: 1,
        email: "john.doe@student.edu",
        password: null,
        faceEncoding: null,
        profilePicture: null,
        isActive: true,
        isRegistered: false,
        isClassOfficer: false,
        otpCode: null,
        otpExpires: null,
        otpVerified: false,
      },
    ]

    const unregisteredVoters = await Voter.insertMany(unregisteredVotersData)
    console.log(`Created ${unregisteredVoters.length} unregistered voters`)

    // Create sample registered voters
    console.log("Creating sample registered voters...")
    const registeredVotersData = [
      {
        schoolId: 20210004,
        firstName: "Alice",
        middleName: "Marie",
        lastName: "Johnson",
        sex: "Female",
        departmentId: departments[3]._id, // BSIT
        yearLevel: 4,
        email: "alice.johnson@student.edu",
        password: "password123",
        faceEncoding: null,
        profilePicture: null,
        isActive: true,
        isRegistered: true,
        isClassOfficer: true,
        isPasswordActive: true,
      },
      {
        schoolId: 20210005,
        firstName: "Bob",
        middleName: "Andrew",
        lastName: "Williams",
        sex: "Male",
        departmentId: departments[1]._id, // BSED
        yearLevel: 3,
        email: "bob.williams@student.edu",
        password: "password123",
        faceEncoding: null,
        profilePicture: null,
        isActive: true,
        isRegistered: true,
        isClassOfficer: true,
        isPasswordActive: true,
      },
      {
        schoolId: 20210006,
        firstName: "Charlie",
        middleName: "David",
        lastName: "Brown",
        sex: "Male",
        departmentId: departments[3]._id, // BSIT
        yearLevel: 2,
        email: "charlie.brown@student.edu",
        password: "password123",
        faceEncoding: null,
        profilePicture: null,
        isActive: true,
        isRegistered: true,
        isClassOfficer: false,
        isPasswordActive: true,
      },
    ]

    const registeredVoters = await Voter.insertMany(registeredVotersData)
    console.log(`Created ${registeredVoters.length} registered voters`)

    // Create sample SSG election
    console.log("Creating sample SSG election...")
    const ssgElectionData = {
      ssgElectionId: "SSG-2025",
      electionYear: 2025,
      title: "SSG General Elections 2025",
      status: "upcoming",
      electionDate: new Date("2025-11-15"),
      ballotOpenTime: "08:00",
      ballotCloseTime: "17:00",
      ballotDuration: 10,
      createdBy: users[0]._id,
      totalVotes: 0,
      voterTurnout: 0,
    }

    const ssgElection = await SSGElection.create(ssgElectionData)
    console.log(`Created SSG election: ${ssgElection.title}`)

    // Create sample departmental election
    console.log("Creating sample departmental election...")
    const deptElectionData = {
      deptElectionId: "DEPT-BSIT-2025",
      electionYear: 2025,
      title: "BSIT Departmental Elections 2025",
      departmentId: departments[3]._id, // BSIT
      status: "upcoming",
      electionDate: new Date("2025-11-20"),
      createdBy: users[0]._id,
      totalVotes: 0,
      voterTurnout: 0,
    }

    const deptElection = await DepartmentalElection.create(deptElectionData)
    console.log(`Created departmental election: ${deptElection.title}`)

    console.log("\n✅ Migration completed successfully!")
    console.log("\n📊 Summary:")
    console.log(`- Users: ${users.length}`)
    console.log(`- Departments: ${departments.length}`)
    console.log(`- Unregistered Voters: ${unregisteredVoters.length}`)
    console.log(`- Registered Voters: ${registeredVoters.length}`)
    console.log(`- SSG Elections: 1`)
    console.log(`- Departmental Elections: 1`)

  } catch (error) {
    console.error("❌ Migration failed:", error)
    console.error("Stack trace:", error.stack)
  } finally {
    await mongoose.connection.close()
    console.log("\nDatabase connection closed")
  }
}

migrate()