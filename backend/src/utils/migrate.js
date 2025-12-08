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

    // Create 3 students with no email and password
    console.log("Creating students...")
    const studentsData = [
      {
        schoolId: 20210001,
        firstName: "Jay",
        middleName: "Lee",
        lastName: "Taylor",
        sex: "Male",
        departmentId: departments[3]._id, // BSIT
        yearLevel: 3,
        email: null,
        password: null,
        isActive: true,
        isRegistered: false,
      },
      {
        schoolId: 20220001,
        firstName: "Emmanuel",
        middleName: "",
        lastName: "Bautista",
        sex: "Male",
        departmentId: departments[2]._id, // BSIT
        yearLevel: 3,
        email: null,
        password: null,
        isActive: true,
        isRegistered: false,
      },
      {
        schoolId: 20220002,
        firstName: "Joshua John",
        middleName: "",
        lastName: "Valenzuela",
        sex: "Male",
        departmentId: departments[3]._id, // BSIT
        yearLevel: 2,
        email: null,
        password: null,
        isActive: true,
        isRegistered: false,
      },
      {
        schoolId: 20220003,
        firstName: "Josh Garnet",
        middleName: "",
        lastName: "Martinez",
        sex: "Male",
        departmentId: departments[1]._id, // BSIT
        yearLevel: 4,
        email: null,
        password: null,
        isActive: true,
        isRegistered: false,
      },
      {
        schoolId: 20220004,
        firstName: "Jone",
        middleName: "",
        lastName: "Ceriaca",
        sex: "Male",
        departmentId: departments[3]._id, // BSIT
        yearLevel: 1,
        email: null,
        password: null,
        isActive: true,
        isRegistered: false,
      },
      {
        schoolId: 20220005,
        firstName: "Roger",
        middleName: "",
        lastName: "Lasaga",
        sex: "Male",
        departmentId: departments[2]._id, // BSIT
        yearLevel: 3,
        email: null,
        password: null,
        isActive: true,
        isRegistered: false,
      },
      {
        schoolId: 20220006,
        firstName: "Joreza",
        middleName: "",
        lastName: "Jamora",
        sex: "Female",
        departmentId: departments[0]._id, // BSIT
        yearLevel: 2,
        email: null,
        password: null,
        isActive: true,
        isRegistered: false,
      },
      {
        schoolId: 20220007,
        firstName: "Deither",
        middleName: "",
        lastName: "Cabansay",
        sex: "Male",
        departmentId: departments[1]._id, // BSIT
        yearLevel: 3,
        email: null,
        password: null,
        isActive: true,
        isRegistered: false,
      },
      {
        schoolId: 20220008,
        firstName: "Egie",
        middleName: "",
        lastName: "Nunez",
        sex: "Male",
        departmentId: departments[3]._id, // BSIT
        yearLevel: 3,
        email: null,
        password: null,
        isActive: true,
        isRegistered: false,
      },
      {
        schoolId: 20220009,
        firstName: "Zenith",
        middleName: "",
        lastName: "Marzan",
        sex: "Male",
        departmentId: departments[1]._id, // BSIT
        yearLevel: 3,
        email: null,
        password: null,
        isActive: true,
        isRegistered: false,
      },
      {
        schoolId: 20220010,
        firstName: "Errol",
        middleName: "",
        lastName: "Ramos",
        sex: "Male",
        departmentId: departments[2]._id, // BSIT
        yearLevel: 3,
        email: null,
        password: null,
        isActive: true,
        isRegistered: false,
      },
      {
        schoolId: 20220011,
        firstName: "Clint Joseph",
        middleName: "",
        lastName: "Goden",
        sex: "Male",
        departmentId: departments[2]._id, // BSIT
        yearLevel: 3,
        email: null,
        password: null,
        isActive: true,
        isRegistered: false,
      },
      {
        schoolId: 20220012,
        firstName: "Jenne Rose",
        middleName: "",
        lastName: "Lampera",
        sex: "Female",
        departmentId: departments[0]._id, // BSIT
        yearLevel: 3,
        email: null,
        password: null,
        isActive: true,
        isRegistered: false,
      },
      {
        schoolId: 20220013,
        firstName: "Warren James",
        middleName: "",
        lastName: "Villamor",
        sex: "Male",
        departmentId: departments[1]._id, // BSIT
        yearLevel: 3,
        email: null,
        password: null,
        isActive: true,
        isRegistered: false,
      },
      {
        schoolId: 20220014,
        firstName: "Glenda",
        middleName: "",
        lastName: "Inting",
        sex: "Male",
        departmentId: departments[3]._id, // BSIT
        yearLevel: 3,
        email: null,
        password: null,
        isActive: true,
        isRegistered: false,
      },
      {
        schoolId: 20220015,
        firstName: "Beverly",
        middleName: "",
        lastName: "Sinogbuhan",
        sex: "Female",
        departmentId: departments[1]._id, // BSIT
        yearLevel: 3,
        email: null,
        password: null,
        isActive: true,
        isRegistered: false,
      },
      {
        schoolId: 20220016,
        firstName: "Ralph",
        middleName: "",
        lastName: "Menguito",
        sex: "Male",
        departmentId: departments[3]._id, // BSIT
        yearLevel: 3,
        email: null,
        password: null,
        isActive: true,
        isRegistered: false,
      },
      {
        schoolId: 20220017,
        firstName: "Jorex",
        middleName: "",
        lastName: "Amoren",
        sex: "Male",
        departmentId: departments[0]._id, // BSIT
        yearLevel: 3,
        email: null,
        password: null,
        isActive: true,
        isRegistered: false,
      },
      {
        schoolId: 20220018,
        firstName: "Pepin",
        middleName: "",
        lastName: "Apa",
        sex: "Male",
        departmentId: departments[3]._id, // BSIT
        yearLevel: 3,
        email: null,
        password: null,
        isActive: true,
        isRegistered: false,
      },
      {
        schoolId: 20220019,
        firstName: "Romil",
        middleName: "",
        lastName: "Bautista",
        sex: "Male",
        departmentId: departments[1]._id, // BSIT
        yearLevel: 3,
        email: null,
        password: null,
        isActive: true,
        isRegistered: false,
      },
      {
        schoolId: 20220020,
        firstName: "Glee",
        middleName: "",
        lastName: "Canete",
        sex: "Male",
        departmentId: departments[1]._id, // BSIT
        yearLevel: 3,
        email: null,
        password: null,
        isActive: true,
        isRegistered: false,
      },
       {
        schoolId: 20220021,
        firstName: "Mark Anthony",
        middleName: "",
        lastName: "Casquejo",
        sex: "Male",
        departmentId: departments[1]._id, // BSIT
        yearLevel: 3,
        email: null,
        password: null,
        isActive: true,
        isRegistered: false,
      },
       {
        schoolId: 20220022,
        firstName: "Juswell",
        middleName: "",
        lastName: "Berame",
        sex: "Female",
        departmentId: departments[1]._id, // BSIT
        yearLevel: 3,
        email: null,
        password: null,
        isActive: true,
        isRegistered: false,
      },
       {
        schoolId: 20220023,
        firstName: "Elmarie Joy",
        middleName: "",
        lastName: "Gante",
        sex: "Female",
        departmentId: departments[1]._id, // BSIT
        yearLevel: 3,
        email: null,
        password: null,
        isActive: true,
        isRegistered: false,
      },
       {
        schoolId: 20220024,
        firstName: "John Mark",
        middleName: "",
        lastName: "Inoc",
        sex: "Male",
        departmentId: departments[3]._id, // BSIT
        yearLevel: 3,
        email: null,
        password: null,
        isActive: true,
        isRegistered: false,
      },
       {
        schoolId: 20220025,
        firstName: "James Harode",
        middleName: "",
        lastName: "Loberanes",
        sex: "Male",
        departmentId: departments[3]._id, // BSIT
        yearLevel: 3,
        email: null,
        password: null,
        isActive: true,
        isRegistered: false,
      },
       {
        schoolId: 20220026,
        firstName: "Mia Jane",
        middleName: "",
        lastName: "Panganuron",
        sex: "Male",
        departmentId: departments[1]._id, // BSIT
        yearLevel: 3,
        email: null,
        password: null,
        isActive: true,
        isRegistered: false,
      },
       {
        schoolId: 20220027,
        firstName: "Ian",
        middleName: "",
        lastName: "Petallar",
        sex: "Male",
        departmentId: departments[1]._id, // BSIT
        yearLevel: 3,
        email: null,
        password: null,
        isActive: true,
        isRegistered: false,
      },
       {
        schoolId: 20220028,
        firstName: "Quennie",
        middleName: "",
        lastName: "Ruelo",
        sex: "Female",
        departmentId: departments[1]._id, // BSIT
        yearLevel: 3,
        email: null,
        password: null,
        isActive: true,
        isRegistered: false,
      },
      {
        schoolId: 20210002,
        firstName: "Mary",
        middleName: "Jane",
        lastName: "Smith",
        sex: "Female",
        departmentId: departments[2]._id, // BSHM
        yearLevel: 2,
        email: null,
        password: null,
        isActive: true,
        isRegistered: false,
      },
      {
        schoolId: 20210003,
        firstName: "John",
        middleName: "Paul",
        lastName: "Doe",
        sex: "Male",
        departmentId: departments[0]._id, // BEED
        yearLevel: 1,
        email: null,
        password: null,
        isActive: true,
        isRegistered: false,
      },
    ]

    const students = await Voter.insertMany(studentsData)
    console.log(`Created ${students.length} students`)

    console.log("\n✅ Migration completed successfully!")
    console.log("\n📊 Summary:")
    console.log(`- Users: ${users.length}`)
    console.log(`- Departments: ${departments.length}`)
    console.log(`- Students: ${students.length}`)

  } catch (error) {
    console.error("❌ Migration failed:", error)
    console.error("Stack trace:", error.stack)
  } finally {
    await mongoose.connection.close()
    console.log("\nDatabase connection closed")
  }
}

migrate()