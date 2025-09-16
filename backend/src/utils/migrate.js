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

    // Clear existing data
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

    // Drop indexes to ensure clean state
    const modelsToDropIndexes = [
      { model: Position, name: "Position" },
      { model: Department, name: "Department" },
      { model: Voter, name: "Voter" },
      { model: Candidate, name: "Candidate" },
      { model: Ballot, name: "Ballot" },
      { model: Vote, name: "Vote" },
      { model: ElectionParticipation, name: "ElectionParticipation" }
    ]

    for (const { model, name } of modelsToDropIndexes) {
      try {
        await model.collection.dropIndexes()
        console.log(`Dropped ${name} indexes`)
      } catch (error) {
        console.log(`Could not drop ${name} indexes (might not exist yet)`)
      }
    }

    // Create users
    console.log("Migrating users...")
    const usersData = [
      {
        userType: "admin",
        username: "admin",
        passwordHash: "admin123", // Will be hashed by pre-save hook
        isActive: true,
      },
      {
        userType: "election_committee",
        username: "ecommittee1",
        passwordHash: "committee123", // Will be hashed by pre-save hook
        isActive: true,
      },
      {
        userType: "sao",
        username: "sao",
        passwordHash: "sao123", // Will be hashed by pre-save hook
        isActive: true,
      },
    ]

    const users = []
    for (const userData of usersData) {
      const user = new User(userData)
      await user.save()
      users.push(user)
      console.log(`Created user: ${user.username} (${user.userType})`)
    }

    // Migrate departments with updated data
    console.log("Migrating departments...")
    const departments = await Department.insertMany([
      {
        departmentCode: "BEED",
        degreeProgram: "Bachelor of Elementary Education",
        college: "College of Teacher Education",
      },
      {
        departmentCode: "BSED",
        degreeProgram: "Bachelor of Secondary Education major in Science",
        college: "College of Teacher Education",
      },
      {
        departmentCode: "BSED",
        degreeProgram: "Bachelor of Secondary Education major in English",
        college: "College of Teacher Education",
      },
      {
        departmentCode: "BSHM",
        degreeProgram: "Bachelor of Science in Hospitality Management",
        college: "College of Hospitality Management",
      },
      {
        departmentCode: "BSIT",
        degreeProgram: "Bachelor of Science in Information Technology",
        college: "College of Computer Studies",
      },
    ])
    console.log(`Migrated ${departments.length} departments`)

    // Create sample voters with updated structure
    console.log("Creating sample voters...")
    const votersData = [
      {
        schoolId: 20210001,
        firstName: "Jay",
        middleName: "Lee", 
        lastName: "Taylor",
        birthdate: new Date("2000-01-16"),
        departmentId: departments[4]._id, // BSIT
        yearLevel: 3,
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
        departmentId: departments[4]._id, // BSIT
        yearLevel: 2,
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
        departmentId: departments[0]._id, // BEED
        yearLevel: 4,
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
        departmentId: departments[3]._id, // BSHM
        yearLevel: 1,
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
        departmentId: departments[1]._id, // BSED Science
        yearLevel: 3,
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
      {
        schoolId: 20210006,
        firstName: "Alice",
        middleName: "Grace",
        lastName: "Johnson",
        birthdate: new Date("2000-05-10"),
        departmentId: departments[2]._id, // BSED-ENG
        yearLevel: 2,
        email: "alice.johnson@student.edu",
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
    console.log(`Created ${voters.length} voters`)

    // Create registered voters for testing
    console.log("Creating registered voters for testing...")
    const testPassword = "test123"
    
    const registeredVoters = [
      {
        schoolId: 20210099,
        firstName: "Test",
        middleName: "User",
        lastName: "Registered",
        birthdate: new Date("2000-01-01"),
        departmentId: departments[4]._id, // BSIT
        yearLevel: 2,
        email: "test.registered@student.edu",
        password: testPassword, // Will be hashed and set registration flags
        faceEncoding: null,
        profilePicture: null,
        isActive: true,
        isClassOfficer: false,
      },
      {
        schoolId: 20210098,
        firstName: "Demo",
        middleName: "Class",
        lastName: "Officer",
        birthdate: new Date("1999-06-15"),
        departmentId: departments[4]._id, // BSIT
        yearLevel: 3,
        email: "demo.officer@student.edu",
        password: testPassword, // Will be hashed and set registration flags
        faceEncoding: null,
        profilePicture: null,
        isActive: true,
        isClassOfficer: true,
      },
    ]

    const registeredVoterDocs = []
    for (const voterData of registeredVoters) {
      const voter = new Voter(voterData)
      await voter.save()
      registeredVoterDocs.push(voter)
      console.log(`Created registered voter: ${voter.schoolId} (${voter.fullName})`)
    }

    // Create SSG Election
    console.log("Creating SSG election...")
    const ssgElection = await SSGElection.create({
      ssgElectionId: "SSG2024001",
      electionYear: 2024,
      title: "SSG General Elections 2024",
      status: "upcoming",
      electionDate: new Date("2024-03-15"),
      createdBy: users[1]._id,
      totalVotes: 0,
      voterTurnout: 0,
    })

    // Create Departmental Elections
    console.log("Creating departmental elections...")
    const departmentalElections = []
    
    // Computer Studies Election (BSIT)
    const csElection = await DepartmentalElection.create({
      deptElectionId: "DEPT2024001",
      electionYear: 2024,
      title: "College of Computer Studies Elections 2024",
      departmentId: departments[4]._id, // BSIT department
      status: "upcoming", 
      electionDate: new Date("2024-04-15"),
      createdBy: users[1]._id,
      totalVotes: 0,
      voterTurnout: 0,
    })
    departmentalElections.push(csElection)

    // Teacher Education Election (BEED)
    const teElection = await DepartmentalElection.create({
      deptElectionId: "DEPT2024002",
      electionYear: 2024,
      title: "College of Teacher Education Elections 2024",
      departmentId: departments[0]._id, // BEED department
      status: "upcoming",
      electionDate: new Date("2024-04-20"),
      createdBy: users[1]._id,
      totalVotes: 0,
      voterTurnout: 0,
    })
    departmentalElections.push(teElection)

    console.log(`Created 1 SSG election and ${departmentalElections.length} departmental elections`)

    // Create positions for SSG election - Only President, Vice President, and Senator
    console.log("Creating SSG positions...")
    const ssgPositions = await Position.insertMany([
      {
        ssgElectionId: ssgElection._id,
        deptElectionId: null,
        positionName: "President",
        positionOrder: 1,
        maxVotes: 1,
        maxCandidates: 10,
        maxCandidatesPerPartylist: 1,
        description: "Head of the Supreme Student Government",
        isActive: true,
      },
      {
        ssgElectionId: ssgElection._id,
        deptElectionId: null,
        positionName: "Vice President",
        positionOrder: 2,
        maxVotes: 1,
        maxCandidates: 10,
        maxCandidatesPerPartylist: 1,
        description: "Deputy head of the Supreme Student Government", 
        isActive: true,
      },
      {
        ssgElectionId: ssgElection._id,
        deptElectionId: null,
        positionName: "Senator",
        positionOrder: 3,
        maxVotes: 12,
        maxCandidates: 20,
        maxCandidatesPerPartylist: 6,
        description: "Legislative body members",
        isActive: true,
      },
    ])
    console.log(`Created ${ssgPositions.length} SSG positions`)

    // Create positions for Departmental elections
    console.log("Creating departmental positions...")
    const deptPositions = []
    
    // Computer Studies positions
    const csPositions = await Position.insertMany([
      {
        deptElectionId: csElection._id,
        ssgElectionId: null,
        positionName: "Governor",
        positionOrder: 1,
        maxVotes: 1,
        maxCandidates: 10,
        maxCandidatesPerPartylist: null,
        description: "Head of the departmental student government",
        isActive: true,
      },
      {
        deptElectionId: csElection._id,
        ssgElectionId: null,
        positionName: "Vice Governor", 
        positionOrder: 2,
        maxVotes: 1,
        maxCandidates: 10,
        maxCandidatesPerPartylist: null,
        description: "Deputy head of the departmental student government",
        isActive: true,
      },
      {
        deptElectionId: csElection._id,
        ssgElectionId: null,
        positionName: "Secretary",
        positionOrder: 3,
        maxVotes: 1,
        maxCandidates: 10,
        maxCandidatesPerPartylist: null,
        description: "Handles documentation for the department",
        isActive: true,
      },
      {
        deptElectionId: csElection._id,
        ssgElectionId: null,
        positionName: "Treasurer",
        positionOrder: 4,
        maxVotes: 1,
        maxCandidates: 10,
        maxCandidatesPerPartylist: null,
        description: "Manages departmental funds",
        isActive: true,
      },
      {
        deptElectionId: csElection._id,
        ssgElectionId: null,
        positionName: "1st Year Representative",
        positionOrder: 5,
        maxVotes: 1,
        maxCandidates: 10,
        maxCandidatesPerPartylist: null,
        description: "Represents first year students",
        isActive: true,
      },
      {
        deptElectionId: csElection._id,
        ssgElectionId: null,
        positionName: "2nd Year Representative",
        positionOrder: 6,
        maxVotes: 1,
        maxCandidates: 10,
        maxCandidatesPerPartylist: null,
        description: "Represents second year students", 
        isActive: true,
      },
      {
        deptElectionId: csElection._id,
        ssgElectionId: null,
        positionName: "3rd Year Representative",
        positionOrder: 7,
        maxVotes: 1,
        maxCandidates: 10,
        maxCandidatesPerPartylist: null,
        description: "Represents third year students",
        isActive: true,
      },
      {
        deptElectionId: csElection._id,
        ssgElectionId: null,
        positionName: "4th Year Representative",
        positionOrder: 8,
        maxVotes: 1,
        maxCandidates: 10,
        maxCandidatesPerPartylist: null,
        description: "Represents fourth year students",
        isActive: true,
      },
    ])
    deptPositions.push(...csPositions)

    // Teacher Education positions  
    const tePositions = await Position.insertMany([
      {
        deptElectionId: teElection._id,
        ssgElectionId: null,
        positionName: "Governor",
        positionOrder: 1,
        maxVotes: 1,
        maxCandidates: 10,
        maxCandidatesPerPartylist: null,
        description: "Head of the departmental student government",
        isActive: true,
      },
      {
        deptElectionId: teElection._id,
        ssgElectionId: null,
        positionName: "Vice Governor",
        positionOrder: 2,
        maxVotes: 1,
        maxCandidates: 10,
        maxCandidatesPerPartylist: null,
        description: "Deputy head of the departmental student government",
        isActive: true,
      },
      {
        deptElectionId: teElection._id,
        ssgElectionId: null,
        positionName: "Secretary",
        positionOrder: 3,
        maxVotes: 1,
        maxCandidates: 10,
        maxCandidatesPerPartylist: null,
        description: "Handles documentation for the department",
        isActive: true,
      },
    ])
    deptPositions.push(...tePositions)

    console.log(`Created ${deptPositions.length} departmental positions`)

    // Create partylists (only for SSG election)
    console.log("Creating partylists...")
    const partylists = await Partylist.insertMany([
      {
        partylistId: "PL2024001",
        ssgElectionId: ssgElection._id,
        partylistName: "Unity Party",
        platform: null,
        logo: null,
        isActive: true,
      },
      {
        partylistId: "PL2024002",
        ssgElectionId: ssgElection._id,
        partylistName: "Progressive Alliance",
        platform: null,
        logo: null,
        isActive: true,
      },
    ])
    console.log(`Created ${partylists.length} partylists`)

    // Create sample candidates 
    console.log("Creating sample candidates...")
    const candidates = []
    
    // SSG Candidates
    const ssgCandidates = await Candidate.insertMany([
      {
        ssgElectionId: ssgElection._id,
        deptElectionId: null,
        voterId: voters[0]._id,
        positionId: ssgPositions[0]._id,
        partylistId: partylists[0]._id,
        candidateNumber: 1,
        campaignPicture: null,
        credentials: null,
        isActive: true,
        voteCount: 0,
      },
      {
        ssgElectionId: ssgElection._id,
        deptElectionId: null,
        voterId: voters[1]._id,
        positionId: ssgPositions[1]._id, 
        partylistId: partylists[0]._id,
        candidateNumber: 1,
        campaignPicture: null,
        credentials: null,
        isActive: true,
        voteCount: 0,
      },
      {
        ssgElectionId: ssgElection._id,
        deptElectionId: null,
        voterId: registeredVoterDocs[1]._id, 
        positionId: ssgPositions[2]._id, 
        partylistId: partylists[1]._id,
        candidateNumber: 1,
        campaignPicture: null,
        credentials: null,
        isActive: true,
        voteCount: 0,
      },
    ])
    candidates.push(...ssgCandidates)

    // Departmental Candidates (using appropriate department voters)
    const deptCandidates = await Candidate.insertMany([
      {
        deptElectionId: csElection._id,
        ssgElectionId: null,
        voterId: registeredVoterDocs[0]._id, 
        positionId: csPositions[0]._id, 
        partylistId: null,
        candidateNumber: 1,
        campaignPicture: null,
        credentials: null,
        isActive: true,
        voteCount: 0,
      },
      {
        deptElectionId: teElection._id,
        ssgElectionId: null,
        voterId: voters[2]._id, // BEED student (class officer)
        positionId: tePositions[0]._id, // Governor
        partylistId: null,
        candidateNumber: 1,
        campaignPicture: null,
        credentials: null,
        isActive: true,
        voteCount: 0,
      },
    ])
    candidates.push(...deptCandidates)

    console.log(`Created ${candidates.length} sample candidates`)

    // Create sample ballots (updated with new timer structure)
    console.log("Creating sample ballots...")
    const crypto = require('crypto')
    const sampleBallots = await Ballot.insertMany([
      {
        deptElectionId: null,
        ssgElectionId: ssgElection._id,
        currentPositionId: null,
        voterId: registeredVoterDocs[0]._id,
        ballotToken: crypto.randomBytes(32).toString('hex'),
        isSubmitted: false,
        submittedAt: null,
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 Test Browser',
        ballotOpenTime: null,
        ballotCloseTime: null,
        ballotDuration: 30,
        timerStarted: false,
        timerStartedAt: null,
      },
      {
        deptElectionId: csElection._id,
        ssgElectionId: null,
        currentPositionId: null,
        voterId: registeredVoterDocs[1]._id,
        ballotToken: crypto.randomBytes(32).toString('hex'),
        isSubmitted: false,
        submittedAt: null,
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 Test Browser',
        ballotOpenTime: null,
        ballotCloseTime: null,
        ballotDuration: 30,
        timerStarted: false,
        timerStartedAt: null,
      },
    ])
    console.log(`Created ${sampleBallots.length} sample ballots`)

    console.log("Creating sample chat support...")
    const chatRequests = await ChatSupport.insertMany([
      {
        schoolId: voters[0].schoolId,
        voterId: voters[0]._id,
        fullName: voters[0].fullName,
        departmentId: voters[0].departmentId,
        birthday: voters[0].birthdate,
        email: voters[0].email,
        message: "I'm having trouble accessing the voting system. Can you help?",
        status: "pending",
      },
      {
        schoolId: registeredVoterDocs[0].schoolId,
        voterId: registeredVoterDocs[0]._id,
        fullName: registeredVoterDocs[0].fullName,
        departmentId: registeredVoterDocs[0].departmentId,
        birthday: registeredVoterDocs[0].birthdate,
        email: registeredVoterDocs[0].email,
        message: "When will the election results be announced?",
        status: "resolved",
        response: "Election results will be announced within 24 hours after voting closes.",
        respondedAt: new Date(),
      },
    ])
    console.log(`Created ${chatRequests.length} chat support requests`)

    console.log("Creating sample election participation records...")
    const participationRecords = await ElectionParticipation.insertMany([
      {
        voterId: registeredVoterDocs[0]._id,
        ssgElectionId: ssgElection._id,
        deptElectionId: null,
        confirmedAt: new Date(),
        hasVoted: false,
        votedAt: null,
        departmentId: registeredVoterDocs[0].departmentId,
        eligibilityCheckedAt: new Date(),
        departmentRestriction: null,
        status: "confirmed",
      },
      {
        voterId: registeredVoterDocs[1]._id,
        ssgElectionId: null,
        deptElectionId: csElection._id,
        confirmedAt: new Date(),
        hasVoted: false,
        votedAt: null,
        departmentId: registeredVoterDocs[1].departmentId,
        eligibilityCheckedAt: new Date(),
        departmentRestriction: null,
        status: "confirmed",
      },
    ])
    console.log(`Created ${participationRecords.length} election participation records`)

    // Create initial audit log entry
    await AuditLog.create({
      action: "SYSTEM_ACCESS",
      username: "system",
      userId: null,
      voterId: null,
      schoolId: null,
      details: "Database migration completed successfully",
      ipAddress: "127.0.0.1",
      userAgent: "Migration Script",
      timestamp: new Date(),
    })

    console.log("Migration completed successfully!")
    console.log("Summary:")
    console.log(`- Users: ${users.length}`)
    console.log(`- Departments: ${departments.length}`)
    console.log(`- Unregistered Voters: ${voters.length}`)
    console.log(`- Registered Voters: ${registeredVoterDocs.length}`)
    console.log(`- SSG Elections: 1`)
    console.log(`- Departmental Elections: ${departmentalElections.length}`)
    console.log(`- SSG Positions: ${ssgPositions.length}`)
    console.log(`- Departmental Positions: ${deptPositions.length}`)
    console.log(`- Partylists: ${partylists.length}`)
    console.log(`- Candidates: ${candidates.length}`)
    console.log(`- Sample Ballots: ${sampleBallots.length}`)
    console.log(`- Chat Support Requests: ${chatRequests.length}`)
    console.log(`- Election Participation Records: ${participationRecords.length}`)
    console.log("\nLogin Credentials:")
    console.log("Admin: username=admin, password=admin123")
    console.log("Election Committee: username=ecommittee1, password=committee123") 
    console.log("SAO: username=sao, password=sao123")
    console.log("Test Registered Voter: schoolId=20210099, password=test123")
    console.log("Demo Class Officer: schoolId=20210098, password=test123")
  } catch (error) {
    console.error("Migration failed:", error)
    console.error("Error details:", error.message)
    console.error("Stack trace:", error.stack)
  } finally {
    console.log("Database connection closed")
    await mongoose.connection.close()
  }
}

migrate()