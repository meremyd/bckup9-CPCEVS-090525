const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")
const path = require("path")
require("dotenv").config({ path: path.join(__dirname, "../../.env") })

async function migrate() {
  try {
    console.log("📄 Connecting to MongoDB...")
    await mongoose.connect(process.env.MONGODB_URI)
    console.log("✅ Connected to MongoDB")

    // Import models
    const User = require("../models/User")
    const Degree = require("../models/Degree")
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

    // Clear existing data
    console.log("🧹 Clearing existing data...")
    await User.deleteMany({})
    await Degree.deleteMany({})
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

    // Drop indexes to ensure clean state
    try {
      await Position.collection.dropIndexes()
      console.log("✅ Dropped Position indexes")
    } catch (error) {
      console.log("⚠️ Could not drop Position indexes (might not exist yet)")
    }

    // Create users
    console.log("👥 Migrating users...")
    const usersData = [
      {
        userType: "admin",
        username: "admin",
        password: "admin123",
        isActive: true,
      },
      {
        userType: "election_committee",
        username: "ecommittee1",
        password: "committee123",
        isActive: true,
      },
      {
        userType: "sao",
        username: "sao",
        password: "sao123",
        isActive: true,
      },
    ]

    const users = []
    for (const userData of usersData) {
      const user = await User.createWithPassword(userData)
      users.push(user)
      console.log(`✅ Created user: ${user.username} (${user.userType})`)
    }

    // Migrate degrees
    console.log("🎓 Migrating degrees...")
    const degrees = await Degree.insertMany([
      {
        degreeCode: "BSIT",
        degreeName: "Bachelor of Science in Information Technology",
        department: "College of Computer Studies",
        major: null,
      },
      {
        degreeCode: "BSHM",
        degreeName: "Bachelor of Science in Hospitality Management", 
        department: "College of Hospitality Management",
        major: null,
      },
      {
        degreeCode: "BSED",
        degreeName: "Bachelor of Secondary Education Major in Science",
        department: "College of Teacher Education",
        major: "Science",
      },
      {
        degreeCode: "BSED", 
        degreeName: "Bachelor of Secondary Education Major in English",
        department: "College of Teacher Education",
        major: "English",
      },
      {
        degreeCode: "BEED",
        degreeName: "Bachelor of Elementary Education",
        department: "College of Education", 
        major: null,
      },
    ])
    console.log(`✅ Migrated ${degrees.length} degrees`)

    // Create sample voters
    console.log("🗳️ Creating sample voters...")
    const votersData = [
      {
        schoolId: 20210001,
        firstName: "Jay",
        middleName: "Lee", 
        lastName: "Taylor",
        birthdate: new Date("2000-01-16"),
        degreeId: degrees[0]._id,
        email: "jay.taylor@student.edu",
        password: null,
        faceEncoding: null,
        profilePicture: null,
        isActive: true,
        isRegistered: false,
        isClassOfficer: false,
        passwordCreatedAt: null,
        passwordExpiresAt: null,
        isPasswordActive: false,
      },
      {
        schoolId: 20210002,
        firstName: "Mary",
        middleName: "Jane",
        lastName: "Smith", 
        birthdate: new Date("2000-02-23"),
        degreeId: degrees[0]._id,
        email: "mary.smith@student.edu", 
        password: null,
        faceEncoding: null,
        profilePicture: null,
        isActive: true,
        isRegistered: false,
        isClassOfficer: false,
        passwordCreatedAt: null,
        passwordExpiresAt: null,
        isPasswordActive: false,
      },
      {
        schoolId: 20210003,
        firstName: "June",
        middleName: "Patalinghug",
        lastName: "Flores",
        birthdate: new Date("1999-12-13"),
        degreeId: degrees[4]._id,
        email: "june.flores@student.edu",
        password: null,
        faceEncoding: null, 
        profilePicture: null,
        isActive: true,
        isRegistered: false,
        isClassOfficer: true,
        passwordCreatedAt: null,
        passwordExpiresAt: null,
        isPasswordActive: false,
      },
      {
        schoolId: 20210004,
        firstName: "Sarah",
        middleName: "Joe",
        lastName: "Dayday",
        birthdate: new Date("2000-03-25"),
        degreeId: degrees[1]._id, 
        email: "sarah.dayday@student.edu",
        password: null,
        faceEncoding: null,
        profilePicture: null,
        isActive: true,
        isRegistered: false,
        isClassOfficer: false,
        passwordCreatedAt: null,
        passwordExpiresAt: null,
        isPasswordActive: false,
      },
      {
        schoolId: 20210005,
        firstName: "Ryan", 
        middleName: "Tom",
        lastName: "Cruz",
        birthdate: new Date("1999-11-30"),
        degreeId: degrees[2]._id,
        email: "ryan.cruz@student.edu",
        password: null,
        faceEncoding: null,
        profilePicture: null,
        isActive: true,
        isRegistered: false,
        isClassOfficer: false,
        passwordCreatedAt: null,
        passwordExpiresAt: null,
        isPasswordActive: false,
      },
    ]
    
    const voters = await Voter.insertMany(votersData)
    console.log(`✅ Created ${voters.length} voters`)

    // Create one registered voter for testing
    console.log("🔐 Creating a registered voter for testing...")
    const testPassword = "test123" // Password: test123
    const hashedPassword = await bcrypt.hash(testPassword, 12)
    
    const registeredVoter = new Voter({
      schoolId: 20210099,
      firstName: "Test",
      middleName: "User",
      lastName: "Registered",
      birthdate: new Date("2000-01-01"),
      degreeId: degrees[0]._id,
      email: "test.registered@student.edu",
      password: hashedPassword,
      faceEncoding: null,
      profilePicture: null,
      isActive: true,
      isRegistered: true,
      isClassOfficer: false,
      passwordCreatedAt: new Date(),
      passwordExpiresAt: new Date(Date.now() + 10 * 30 * 24 * 60 * 60 * 1000), // 10 months
      isPasswordActive: true,
    })
    await registeredVoter.save()
    console.log(`✅ Created registered voter: ${registeredVoter.schoolId} (password: ${testPassword})`)

    // Create SSG Election
    console.log("🗳️ Creating SSG election...")
    const ssgElection = await SSGElection.create({
      ssgElectionId: "SSG2024001",
      electionYear: 2024,
      title: "SSG General Elections 2024",
      status: "upcoming",
      electionDate: new Date("2024-03-15"),
      ballotOpenTime: "08:00:00",
      ballotCloseTime: "17:00:00",
      createdBy: users[1]._id,
      totalVotes: 0,
      voterTurnout: 0,
    })

    // Create Departmental Election
    console.log("🗳️ Creating departmental election...")
    const deptElection = await DepartmentalElection.create({
      deptElectionId: "DEPT2024001",
      electionYear: 2024,
      title: "College of Computer Studies Elections 2024",
      department: "College of Computer Studies",
      status: "upcoming", 
      electionDate: new Date("2024-04-15"),
      ballotOpenTime: "09:00:00",
      ballotCloseTime: "16:00:00",
      createdBy: users[1]._id,
      totalVotes: 0,
      voterTurnout: 0,
    })

    console.log(`✅ Created 1 SSG election and 1 departmental election`)
    
    // Debug: Log election IDs
    console.log(`SSG Election ID: ${ssgElection._id}`)
    console.log(`Dept Election ID: ${deptElection._id}`)

    // Create positions for SSG election
    console.log("🏛️ Creating SSG positions...")
    const ssgPositions = await Position.insertMany([
      {
        ssgElectionId: ssgElection._id,
        deptElectionId: null,
        positionName: "President",
        positionOrder: 1,
        maxVotes: 1,
        description: "Head of the Supreme Student Government",
        isActive: true,
      },
      {
        ssgElectionId: ssgElection._id,
        deptElectionId: null,
        positionName: "Vice President",
        positionOrder: 2,
        maxVotes: 1,
        description: "Deputy head of the Supreme Student Government", 
        isActive: true,
      },
      {
        ssgElectionId: ssgElection._id,
        deptElectionId: null,
        positionName: "Secretary",
        positionOrder: 3,
        maxVotes: 1,
        description: "Responsible for documentation and correspondence",
        isActive: true,
      },
      {
        ssgElectionId: ssgElection._id,
        deptElectionId: null,
        positionName: "Treasurer",
        positionOrder: 4,
        maxVotes: 1,
        description: "Manages financial matters",
        isActive: true,
      },
      {
        ssgElectionId: ssgElection._id,
        deptElectionId: null,
        positionName: "Auditor",
        positionOrder: 5,
        maxVotes: 1,
        description: "Reviews financial records and transactions",
        isActive: true,
      },
      {
        ssgElectionId: ssgElection._id,
        deptElectionId: null,
        positionName: "Public Information Officer", 
        positionOrder: 6,
        maxVotes: 1,
        description: "Handles public relations and communications",
        isActive: true,
      },
      {
        ssgElectionId: ssgElection._id,
        deptElectionId: null,
        positionName: "Senator",
        positionOrder: 7,
        maxVotes: 12,
        description: "Legislative body members",
        isActive: true,
      },
    ])

    console.log(`✅ Created ${ssgPositions.length} SSG positions`)

    // Create positions for Departmental election
    console.log("🏛️ Creating departmental positions...")
    const deptPositions = await Position.insertMany([
      {
        deptElectionId: deptElection._id,
        ssgElectionId: null,
        positionName: "Governor",
        positionOrder: 1,
        maxVotes: 1,
        description: "Head of the departmental student government",
        isActive: true,
      },
      {
        deptElectionId: deptElection._id,
        ssgElectionId: null,
        positionName: "Vice Governor", 
        positionOrder: 2,
        maxVotes: 1,
        description: "Deputy head of the departmental student government",
        isActive: true,
      },
      {
        deptElectionId: deptElection._id,
        ssgElectionId: null,
        positionName: "Secretary",
        positionOrder: 3,
        maxVotes: 1,
        description: "Handles documentation for the department",
        isActive: true,
      },
      {
        deptElectionId: deptElection._id,
        ssgElectionId: null,
        positionName: "Treasurer",
        positionOrder: 4,
        maxVotes: 1,
        description: "Manages departmental funds",
        isActive: true,
      },
      {
        deptElectionId: deptElection._id,
        ssgElectionId: null,
        positionName: "Auditor",
        positionOrder: 5,
        maxVotes: 1,
        description: "Reviews departmental financial records",
        isActive: true,
      },
      {
        deptElectionId: deptElection._id,
        ssgElectionId: null,
        positionName: "Public Information Officer",
        positionOrder: 6,
        maxVotes: 1,
        description: "Manages departmental communications",
        isActive: true,
      },
      {
        deptElectionId: deptElection._id,
        ssgElectionId: null,
        positionName: "1st Year Representative",
        positionOrder: 7,
        maxVotes: 1,
        description: "Represents first year students",
        isActive: true,
      },
      {
        deptElectionId: deptElection._id,
        ssgElectionId: null,
        positionName: "2nd Year Representative",
        positionOrder: 8,
        maxVotes: 1,
        description: "Represents second year students", 
        isActive: true,
      },
      {
        deptElectionId: deptElection._id,
        ssgElectionId: null,
        positionName: "3rd Year Representative",
        positionOrder: 9,
        maxVotes: 1,
        description: "Represents third year students",
        isActive: true,
      },
      {
        deptElectionId: deptElection._id,
        ssgElectionId: null,
        positionName: "4th Year Representative",
        positionOrder: 10,
        maxVotes: 1,
        description: "Represents fourth year students",
        isActive: true,
      },
    ])

    console.log(`✅ Created ${deptPositions.length} departmental positions`)

    // Create partylists (only for SSG election based on your Partylist model)
    console.log("🎉 Creating partylists...")
    const partylists = await Partylist.insertMany([
      {
        partylistId: "PL2024001",
        ssgElectionId: ssgElection._id,
        partylistName: "Unity Party",
        description: "For unity and progress",
        logo: null,
      },
      {
        partylistId: "PL2024002",
        ssgElectionId: ssgElection._id,
        partylistName: "Progressive Alliance", 
        description: "Progressive leadership for students",
        logo: null,
      },
    ])
    console.log(`✅ Created ${partylists.length} partylists`)

    // Create sample candidates 
    console.log("👥 Creating sample candidates...")
    const candidates = await Candidate.insertMany([
      // SSG Candidates
      {
        candidateId: "CAND2024001",
        ssgElectionId: ssgElection._id,
        voterId: voters[0]._id,
        positionId: ssgPositions[0]._id, // President
        partylistId: partylists[0]._id,
        candidateNumber: 1,
        campaignPicture: null,
        platform: "Better student services and facilities",
        isActive: true,
        voteCount: 0,
      },
      {
        candidateId: "CAND2024002",
        ssgElectionId: ssgElection._id,
        voterId: voters[1]._id,
        positionId: ssgPositions[1]._id, // Vice President
        partylistId: partylists[0]._id,
        candidateNumber: 2,
        campaignPicture: null,
        platform: "Enhanced student welfare programs",
        isActive: true,
        voteCount: 0,
      },
      // Departmental Candidate
      {
        candidateId: "CAND2024003",
        deptElectionId: deptElection._id,
        voterId: voters[2]._id,
        positionId: deptPositions[0]._id, // Governor
        partylistId: null, // No partylist for departmental elections
        candidateNumber: 1,
        campaignPicture: null,
        platform: "Innovation in computer studies education",
        isActive: true,
        voteCount: 0,
      },
    ])
    console.log(`✅ Created ${candidates.length} sample candidates`)

    // Create initial audit log entry
    await AuditLog.create({
      action: "SYSTEM_ACCESS",
      username: "system",
      details: "Database migration completed successfully",
      ipAddress: "127.0.0.1",
      userAgent: "Migration Script",
      timestamp: new Date(),
    })

    console.log("🎉 Migration completed successfully!")
    console.log("📊 Summary:")
    console.log(`- Users: ${users.length}`)
    console.log(`- Degrees: ${degrees.length}`)
    console.log(`- Voters: ${voters.length + 1}`) // +1 for registered test voter
    console.log(`- SSG Elections: 1`)
    console.log(`- Departmental Elections: 1`)
    console.log(`- SSG Positions: ${ssgPositions.length}`)
    console.log(`- Departmental Positions: ${deptPositions.length}`)
    console.log(`- Partylists: ${partylists.length}`)
    console.log(`- Candidates: ${candidates.length}`)
    console.log("\n🔑 Login Credentials:")
    console.log("Admin: username=admin, password=admin123")
    console.log("Election Committee: username=ecommittee1, password=committee123") 
    console.log("SAO: username=sao, password=sao123")
    console.log("Test Registered Voter: schoolId=20210099, password=test123")
  } catch (error) {
    console.error("❌ Migration failed:", error)
    console.error("Error details:", error.message)
    console.error("Stack trace:", error.stack)
  } finally {
    console.log("🔌 Database connection closed")
    await mongoose.connection.close()
  }
}

migrate()