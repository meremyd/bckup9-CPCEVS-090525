const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")
const path = require("path")
require("dotenv").config({ path: path.join(__dirname, "../../.env") })

async function migrate() {
  try {
    console.log("🔄 Connecting to MongoDB...")
    await mongoose.connect(process.env.MONGODB_URI)
    console.log("✅ Connected to MongoDB")

    // Import models
    const User = require("../models/User")
    const Degree = require("../models/Degree")
    const Voter = require("../models/Voter")
    const Election = require("../models/Election")
    const Position = require("../models/Position")
    const Partylist = require("../models/Partylist")
    const Candidate = require("../models/Candidate")
    // Remove VoterStatus import since it's now merged with Voter
    const AuditLog = require("../models/AuditLog")
    const Ballot = require("../models/Ballot")
    const Vote = require("../models/Vote")
    const ChatSupport = require("../models/ChatSupport")

    // Clear existing data
    console.log("🧹 Clearing existing data...")
    await User.deleteMany({})
    await Degree.deleteMany({})
    await Voter.deleteMany({})
    await Election.deleteMany({})
    await Position.deleteMany({})
    await Partylist.deleteMany({})
    await Candidate.deleteMany({})
    await AuditLog.deleteMany({})
    await Ballot.deleteMany({})
    await Vote.deleteMany({})
    await ChatSupport.deleteMany({})

    // Create users (no more voter userType)
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

    // Migrate degrees - Fix potential uniqueness conflicts
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

    // Create sample voters with consistent data types and merged VoterStatus fields
    console.log("🗳️ Creating sample voters...")
    const votersData = [
      {
        schoolId: 20210001, // Keep as Number to match model
        firstName: "Jay",
        middleName: "Lee", 
        lastName: "Taylor",
        birthdate: new Date("2000-01-16"),
        degreeId: degrees[0]._id,
        email: "jay.taylor@student.edu",
        password: null, // Explicitly set to null for unregistered
        faceEncoding: null,
        profilePicture: null,
        // Merged VoterStatus fields
        isActive: true,
        isRegistered: false, // Will be set to true when password is added
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
        isClassOfficer: true, // This voter is a class officer
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
    const testPassword = "test123"
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
      isRegistered: true, // Will be automatically set by pre-save hook
      isClassOfficer: false,
      passwordCreatedAt: new Date(),
      passwordExpiresAt: new Date(Date.now() + 10 * 30 * 24 * 60 * 60 * 1000), // 10 months
      isPasswordActive: true,
    })
    await registeredVoter.save()
    console.log(`✅ Created registered voter: ${registeredVoter.schoolId} (password: ${testPassword})`)

    // Create sample elections
    console.log("🗳️ Creating sample elections...")
    const elections = await Election.insertMany([
      {
        electionId: "SSG2024001",
        electionYear: 2024,
        title: "SSG General Elections 2024",
        electionType: "ssg",
        department: null, // SSG elections don't have specific departments
        status: "upcoming",
        electionDate: new Date("2024-03-15"),
        ballotOpenTime: "08:00:00",
        ballotCloseTime: "17:00:00",
        createdBy: users[1]._id,
        totalVotes: 0,
        voterTurnout: 0,
      },
      {
        electionId: "DEPT2024001",
        electionYear: 2024,
        title: "College of Computer Studies Elections 2024",
        electionType: "departmental",
        department: "College of Computer Studies",
        status: "upcoming", 
        electionDate: new Date("2024-04-15"),
        ballotOpenTime: "09:00:00",
        ballotCloseTime: "16:00:00",
        createdBy: users[1]._id,
        totalVotes: 0,
        voterTurnout: 0,
      },
    ])
    console.log(`✅ Created ${elections.length} sample elections`)

    // Create positions for SSG election
    console.log("🏛️ Creating SSG positions...")
    const ssgPositions = await Position.insertMany([
      {
        electionId: elections[0]._id,
        positionName: "President",
        positionOrder: 1,
        maxVotes: 1,
        description: "Head of the Supreme Student Government",
        isActive: true,
      },
      {
        electionId: elections[0]._id,
        positionName: "Vice President",
        positionOrder: 2,
        maxVotes: 1,
        description: "Deputy head of the Supreme Student Government", 
        isActive: true,
      },
      {
        electionId: elections[0]._id,
        positionName: "Secretary",
        positionOrder: 3,
        maxVotes: 1,
        description: "Responsible for documentation and correspondence",
        isActive: true,
      },
      {
        electionId: elections[0]._id,
        positionName: "Treasurer",
        positionOrder: 4,
        maxVotes: 1,
        description: "Manages financial matters",
        isActive: true,
      },
      {
        electionId: elections[0]._id,
        positionName: "Auditor",
        positionOrder: 5,
        maxVotes: 1,
        description: "Reviews financial records and transactions",
        isActive: true,
      },
      {
        electionId: elections[0]._id,
        positionName: "Public Information Officer", 
        positionOrder: 6,
        maxVotes: 1,
        description: "Handles public relations and communications",
        isActive: true,
      },
      {
        electionId: elections[0]._id,
        positionName: "Senator",
        positionOrder: 7,
        maxVotes: 12,
        description: "Legislative body members",
        isActive: true,
      },
    ])

    // Create positions for Departmental election
    console.log("🏛️ Creating Departmental positions...")
    const deptPositions = await Position.insertMany([
      {
        electionId: elections[1]._id,
        positionName: "Governor",
        positionOrder: 1,
        maxVotes: 1,
        description: "Head of the departmental student government",
        isActive: true,
      },
      {
        electionId: elections[1]._id,
        positionName: "Vice Governor", 
        positionOrder: 2,
        maxVotes: 1,
        description: "Deputy head of the departmental student government",
        isActive: true,
      },
      {
        electionId: elections[1]._id,
        positionName: "Secretary",
        positionOrder: 3,
        maxVotes: 1,
        description: "Handles documentation for the department",
        isActive: true,
      },
      {
        electionId: elections[1]._id,
        positionName: "Treasurer",
        positionOrder: 4,
        maxVotes: 1,
        description: "Manages departmental funds",
        isActive: true,
      },
      {
        electionId: elections[1]._id,
        positionName: "Auditor",
        positionOrder: 5,
        maxVotes: 1,
        description: "Reviews departmental financial records",
        isActive: true,
      },
      {
        electionId: elections[1]._id,
        positionName: "Public Information Officer",
        positionOrder: 6,
        maxVotes: 1,
        description: "Manages departmental communications",
        isActive: true,
      },
      {
        electionId: elections[1]._id,
        positionName: "1st Year Representative",
        positionOrder: 7,
        maxVotes: 1,
        description: "Represents first year students",
        isActive: true,
      },
      {
        electionId: elections[1]._id,
        positionName: "2nd Year Representative",
        positionOrder: 8,
        maxVotes: 1,
        description: "Represents second year students", 
        isActive: true,
      },
      {
        electionId: elections[1]._id,
        positionName: "3rd Year Representative",
        positionOrder: 9,
        maxVotes: 1,
        description: "Represents third year students",
        isActive: true,
      },
      {
        electionId: elections[1]._id,
        positionName: "4th Year Representative",
        positionOrder: 10,
        maxVotes: 1,
        description: "Represents fourth year students",
        isActive: true,
      },
    ])

    console.log(`✅ Created ${ssgPositions.length} SSG positions and ${deptPositions.length} departmental positions`)

    // Create partylists
    console.log("🎉 Creating partylists...")
    const partylists = await Partylist.insertMany([
      {
        partylistId: "PL2024001",
        electionId: elections[0]._id,
        partylistName: "Unity Party",
        description: "For unity and progress",
        logo: null,
      },
      {
        partylistId: "PL2024002",
        electionId: elections[0]._id,
        partylistName: "Progressive Alliance", 
        description: "Progressive leadership for students",
        logo: null,
      },
      {
        partylistId: "PL2024003",
        electionId: elections[1]._id,
        partylistName: "Tech Leaders",
        description: "Technology-focused leadership for CCS",
        logo: null,
      },
    ])
    console.log(`✅ Created ${partylists.length} partylists`)

    // Create sample candidates 
    console.log("👥 Creating sample candidates...")
    const candidates = await Candidate.insertMany([
      {
        candidateId: "CAND2024001",
        electionId: elections[0]._id,
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
        electionId: elections[0]._id,
        voterId: voters[1]._id,
        positionId: ssgPositions[1]._id, // Vice President
        partylistId: partylists[0]._id,
        candidateNumber: 2,
        campaignPicture: null,
        platform: "Enhanced student welfare programs",
        isActive: true,
        voteCount: 0,
      },
      {
        candidateId: "CAND2024003",
        electionId: elections[1]._id,
        voterId: voters[2]._id,
        positionId: deptPositions[0]._id, // Governor
        partylistId: partylists[2]._id,
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
    console.log(`- Elections: ${elections.length}`)
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