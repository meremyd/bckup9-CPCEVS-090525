const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")
const path = require("path")
require("dotenv").config({ path: path.join(__dirname, "../../.env") })

async function setupDatabaseWithConnectionCheck() {
  try {
    // Check environment variables first
    if (!process.env.MONGODB_URI) {
      console.error("❌ MONGODB_URI environment variable is not set")
      console.error("Please check your .env file")
      return
    }

    if (process.env.MONGODB_URI.includes("<db_password>")) {
      console.error("❌ Please replace <db_password> in your .env file with your actual MongoDB password")
      console.error("Current URI contains placeholder: <db_password>")
      return
    }

    console.log("🔄 Connecting to MongoDB...")
    console.log("📍 Database URI:", process.env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@"))

    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    })
    
    console.log("✅ Connected to MongoDB successfully!")
    console.log(`📊 Database: ${mongoose.connection.name}`)

    // Import models
    const User = require("../models/User")
    const Degree = require("../models/Degree")
    const Voter = require("../models/Voter")
    const Election = require("../models/Election")
    const Position = require("../models/Position")
    const Partylist = require("../models/Partylist")
    const Candidate = require("../models/Candidate")

    // Clear existing data
    console.log("🧹 Clearing existing data...")
    await User.deleteMany({})
    await Degree.deleteMany({})
    await Voter.deleteMany({})
    await Election.deleteMany({})
    await Position.deleteMany({})
    await Partylist.deleteMany({})
    await Candidate.deleteMany({})
    console.log("✅ Existing data cleared")

    // Create users with proper password hashing
    console.log("👥 Creating users...")
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

    // Create degrees
    console.log("🎓 Creating degrees...")
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
        degreeName: "Bachelor of Secondary Education - Major in Science",
        department: "College of Teacher Education",
        major: "Science",
      },
      {
        degreeCode: "BSED",
        degreeName: "Bachelor of Secondary Education - Major in English",
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
    console.log(`✅ Created ${degrees.length} degrees`)

    // Create sample voters
    console.log("🗳️ Creating sample voters...")
    const voters = await Voter.insertMany([
      {
        schoolId: 20210001,
        firstName: "Jay",
        middleName: "Lee",
        lastName: "Taylor",
        birthdate: new Date("2000-01-16"),
        degreeId: degrees[0]._id,
        email: "jay.taylor@student.edu",
      },
      {
        schoolId: 20210002,
        firstName: "Mary",
        middleName: "Jane",
        lastName: "Smith",
        birthdate: new Date("2000-02-23"),
        degreeId: degrees[0]._id,
        email: "mary.smith@student.edu",
      },
      {
        schoolId: 20210003,
        firstName: "June",
        middleName: "Patalinghug",
        lastName: "Flores",
        birthdate: new Date("1999-12-13"),
        degreeId: degrees[4]._id,
        email: "june.flores@student.edu",
      },
      {
        schoolId: 20210004,
        firstName: "Sarah",
        middleName: "Joe",
        lastName: "Dayday",
        birthdate: new Date("2000-03-25"),
        degreeId: degrees[1]._id,
        email: "sarah.dayday@student.edu",
      },
      {
        schoolId: 20210005,
        firstName: "Ryan",
        middleName: "Tom",
        lastName: "Cruz",
        birthdate: new Date("1999-11-30"),
        degreeId: degrees[2]._id,
        email: "ryan.cruz@student.edu",
      },
    ])
    console.log(`✅ Created ${voters.length} voters`)

    // Create sample elections
    console.log("🗳️ Creating sample elections...")
    const elections = await Election.insertMany([
      {
        electionId: "SSG2024001",
        electionYear: 2024,
        title: "SSG General Elections 2024",
        electionType: "ssg",
        status: "upcoming",
        electionDate: new Date("2024-03-15"),
        ballotOpenTime: "08:00:00",
        ballotCloseTime: "17:00:00",
        createdBy: users[1]._id,
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
      },
    ])
    console.log(`✅ Created ${elections.length} sample elections`)

    console.log("🎉 Database setup completed successfully!")
    console.log("📊 Summary:")
    console.log(`- Users: ${users.length}`)
    console.log(`- Degrees: ${degrees.length}`)
    console.log(`- Voters: ${voters.length}`)
    console.log(`- Elections: ${elections.length}`)
    console.log("\n🔑 Login Credentials:")
    console.log("Admin: username=admin, password=admin123")
    console.log("Election Committee: username=ecommittee1, password=committee123")
    console.log("SAO: username=sao, password=sao123")
    
  } catch (error) {
    console.error("❌ Database setup failed:", error.message)
    
    if (error.message.includes("authentication failed")) {
      console.error("\n🔧 To fix authentication issues:")
      console.error("1. Go to MongoDB Atlas dashboard")
      console.error("2. Navigate to Database Access")
      console.error("3. Check your database user credentials")
      console.error("4. Update the password in your .env file")
      console.error("5. Make sure your IP is whitelisted in Network Access")
    }
  } finally {
    console.log("🔌 Database connection closed")
    await mongoose.connection.close()
  }
}

setupDatabaseWithConnectionCheck()