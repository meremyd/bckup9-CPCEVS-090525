const mongoose = require("mongoose")
const path = require("path")
require("dotenv").config({ path: path.join(__dirname, "../../.env") })

// Define schemas directly in migration file to avoid import issues
const userSchema = new mongoose.Schema(
  {
    userType: {
      type: String,
      enum: ["admin", "election_committee", "sao", "voter"],
      required: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
)

const degreeSchema = new mongoose.Schema(
  {
    degreeCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    degreeName: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
)

const voterSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    schoolId: {
      type: Number,
      required: true,
      unique: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    middleName: {
      type: String,
      default: null,
    },
    lastName: {
      type: String,
      required: true,
    },
    birthdate: {
      type: Date,
      required: true,
    },
    degreeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Degree",
      required: true,
    },
    faceEncoding: {
      type: String,
      default: null,
    },
    profilePicture: {
      type: Buffer,
      default: null,
    },
  },
  {
    timestamps: true,
  },
)

const voterStatusSchema = new mongoose.Schema(
  {
    voterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Voter",
      required: true,
      unique: true,
    },
    schoolId: {
      type: Number,
      required: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    middleName: {
      type: String,
      default: null,
    },
    lastName: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isRegistered: {
      type: Boolean,
      default: false,
    },
    isClassOfficer: {
      type: Boolean,
      default: false,
    },
    degreeCode: {
      type: String,
      required: true,
    },
    voterDepartment: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
)

const electionSchema = new mongoose.Schema(
  {
    electionYear: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    electionType: {
      type: String,
      enum: ["departmental", "ssg"],
      required: true,
    },
    department: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["upcoming", "active", "completed", "cancelled"],
      default: "upcoming",
    },
    electionDate: {
      type: Date,
      required: true,
    },
    ballotOpenTime: {
      type: String,
      required: true,
    },
    ballotCloseTime: {
      type: String,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
)

const positionSchema = new mongoose.Schema(
  {
    electionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Election",
      required: true,
    },
    positionName: {
      type: String,
      required: true,
    },
    positionOrder: {
      type: Number,
      default: 1,
    },
    maxVotes: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  },
)

const partylistSchema = new mongoose.Schema(
  {
    electionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Election",
      required: true,
    },
    partylistName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: null,
    },
    logo: {
      type: Buffer,
      default: null,
    },
  },
  {
    timestamps: true,
  },
)

// Add password hashing middleware
const bcrypt = require("bcryptjs")

userSchema.pre("save", async function (next) {
  if (!this.isModified("passwordHash")) return next()
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12)
  next()
})

async function migrate() {
  try {
    console.log("🔄 Connecting to MongoDB...")
    await mongoose.connect(process.env.MONGODB_URI)
    console.log("✅ Connected to MongoDB")

    // Create models
    const User = mongoose.model("User", userSchema)
    const Degree = mongoose.model("Degree", degreeSchema)
    const Voter = mongoose.model("Voter", voterSchema)
    const VoterStatus = mongoose.model("VoterStatus", voterStatusSchema)
    const Election = mongoose.model("Election", electionSchema)
    const Position = mongoose.model("Position", positionSchema)
    const Partylist = mongoose.model("Partylist", partylistSchema)

    // Clear existing data
    console.log("🧹 Clearing existing data...")
    await User.deleteMany({})
    await Degree.deleteMany({})
    await Voter.deleteMany({})
    await VoterStatus.deleteMany({})
    await Election.deleteMany({})
    await Position.deleteMany({})
    await Partylist.deleteMany({})

    // Migrate users with plain text passwords that will be hashed by pre-save hook
    console.log("👥 Migrating users...")
    const users = await User.insertMany([
      {
        userType: "admin",
        username: "admin",
        passwordHash: "admin123", // Will be hashed by pre-save hook
      },
      {
        userType: "election_committee",
        username: "committee1",
        passwordHash: "committee123",
      },
      {
        userType: "sao",
        username: "sao",
        passwordHash: "sao123",
      },
    ])
    console.log(`✅ Migrated ${users.length} users`)
    console.log("Admin credentials: username=admin, password=admin123")

    // Migrate degrees
    console.log("🎓 Migrating degrees...")
    const degrees = await Degree.insertMany([
      {
        degreeCode: "BSIT",
        degreeName: "Bachelor of Science in Information Technology",
        department: "IT",
      },
      {
        degreeCode: "BEED",
        degreeName: "Bachelor of Elementary Education",
        department: "Education",
      },
      {
        degreeCode: "BSHM",
        degreeName: "Bachelor of Science in Hospitality Management",
        department: "HM",
      },
      {
        degreeCode: "BSED",
        degreeName: "Bachelor of Secondary Education",
        department: "Education",
      },
    ])
    console.log(`✅ Migrated ${degrees.length} degrees`)

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
      },
      {
        schoolId: 20210002,
        firstName: "Mary",
        middleName: "Jane",
        lastName: "Smith",
        birthdate: new Date("2000-02-23"),
        degreeId: degrees[0]._id,
      },
      {
        schoolId: 20210003,
        firstName: "June",
        middleName: "Patalinghug",
        lastName: "Flores",
        birthdate: new Date("1999-12-13"),
        degreeId: degrees[1]._id,
      },
      {
        schoolId: 20210004,
        firstName: "Sarah",
        middleName: "Joe",
        lastName: "Dayday",
        birthdate: new Date("2000-03-25"),
        degreeId: degrees[2]._id,
      },
      {
        schoolId: 20210005,
        firstName: "Ryab",
        middleName: "Tom",
        lastName: "Cruz",
        birthdate: new Date("1999-11-30"),
        degreeId: degrees[3]._id,
      },
    ])
    console.log(`✅ Created ${voters.length} voters`)

    // Create voter status records
    console.log("📊 Creating voter status records...")
    const voterStatuses = await VoterStatus.insertMany([
      {
        voterId: voters[0]._id,
        schoolId: 20210001,
        firstName: "Jay",
        middleName: "Lee",
        lastName: "Taylor",
        isActive: true,
        isRegistered: false,
        isClassOfficer: true,
        degreeCode: "BSIT",
        voterDepartment: "IT",
      },
      {
        voterId: voters[1]._id,
        schoolId: 20210002,
        firstName: "Mary",
        middleName: "Jane",
        lastName: "Smith",
        isActive: true,
        isRegistered: false,
        isClassOfficer: false,
        degreeCode: "BSIT",
        voterDepartment: "IT",
      },
      {
        voterId: voters[2]._id,
        schoolId: 20210003,
        firstName: "June",
        middleName: "Patalinghug",
        lastName: "Flores",
        isActive: true,
        isRegistered: false,
        isClassOfficer: true,
        degreeCode: "BEED",
        voterDepartment: "Education",
      },
      {
        voterId: voters[3]._id,
        schoolId: 20210004,
        firstName: "Sarah",
        middleName: "Joe",
        lastName: "Dayday",
        isActive: true,
        isRegistered: false,
        isClassOfficer: true,
        degreeCode: "BSHM",
        voterDepartment: "HM",
      },
      {
        voterId: voters[4]._id,
        schoolId: 20210005,
        firstName: "Ryab",
        middleName: "Tom",
        lastName: "Cruz",
        isActive: true,
        isRegistered: false,
        isClassOfficer: false,
        degreeCode: "BSED",
        voterDepartment: "Education",
      },
    ])
    console.log(`✅ Created ${voterStatuses.length} voter status records`)

    // Create sample election
    console.log("🗳️ Creating sample election...")
    const elections = await Election.insertMany([
      {
        electionYear: 2024,
        title: "SSG General Elections 2024",
        electionType: "ssg",
        department: null,
        status: "upcoming",
        electionDate: new Date("2024-03-15"),
        ballotOpenTime: "08:00:00",
        ballotCloseTime: "17:00:00",
        createdBy: users[1]._id,
      },
    ])
    console.log(`✅ Created sample election`)

    // Create positions
    console.log("🏛️ Creating positions...")
    await Position.insertMany([
      {
        electionId: elections[0]._id,
        positionName: "President",
        positionOrder: 1,
        maxVotes: 1,
      },
      {
        electionId: elections[0]._id,
        positionName: "Vice President",
        positionOrder: 2,
        maxVotes: 1,
      },
      {
        electionId: elections[0]._id,
        positionName: "Secretary",
        positionOrder: 3,
        maxVotes: 1,
      },
      {
        electionId: elections[0]._id,
        positionName: "Treasurer",
        positionOrder: 4,
        maxVotes: 1,
      },
    ])

    // Create partylists
    console.log("🎉 Creating partylists...")
    const partylists = await Partylist.insertMany([
      {
        electionId: elections[0]._id,
        partylistName: "Unity Party",
        description: "For unity and progress",
      },
      {
        electionId: elections[0]._id,
        partylistName: "Progressive Alliance",
        description: "Progressive leadership for students",
      },
    ])
    console.log(`✅ Created ${partylists.length} partylists`)

    console.log("🎉 Migration completed successfully!")
    console.log("📊 Summary:")
    console.log(`- Users: ${users.length}`)
    console.log(`- Degrees: ${degrees.length}`)
    console.log(`- Voters: ${voters.length}`)
    console.log(`- Voter Status: ${voterStatuses.length}`)
    console.log(`- Elections: ${elections.length}`)
    console.log(`- Positions: 4`)
    console.log(`- Partylists: ${partylists.length}`)
    console.log("\n🔑 Login Credentials:")
    console.log("Admin: username=admin, password=admin123")
    console.log("Committee: username=committee1, password=committee123")
    console.log("SAO: username=sao, password=sao123")
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
