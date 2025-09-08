const mongoose = require("mongoose")
const path = require("path")
require("dotenv").config({ path: path.join(__dirname, "../../.env") })

async function testConnection() {
  try {
    console.log("🔄 Testing MongoDB connection...")
    
    // Check environment variables
    if (!process.env.MONGODB_URI) {
      console.error("❌ MONGODB_URI environment variable is not set")
      return
    }

    if (process.env.MONGODB_URI.includes("<db_password>")) {
      console.error("❌ Please replace <db_password> in your .env file with your actual MongoDB password")
      console.error("Example: mongodb+srv://username:your_actual_password@cluster.mongodb.net/database")
      return
    }

    console.log("📍 Attempting connection to:", process.env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@"))

    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    })

    console.log("✅ MongoDB connection successful!")
    console.log(`📊 Connected to database: ${mongoose.connection.name}`)
    console.log(`🏠 Host: ${mongoose.connection.host}`)
    console.log(`🔌 Connection state: ${mongoose.connection.readyState}`)

    // Test a simple operation
    const collections = await mongoose.connection.db.listCollections().toArray()
    console.log(`📁 Available collections: ${collections.length}`)
    collections.forEach(col => console.log(`   - ${col.name}`))

  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message)
    
    if (error.message.includes("authentication failed")) {
      console.error("\n🔧 Authentication Error - Please check:")
      console.error("1. Your MongoDB username is correct")
      console.error("2. Your MongoDB password is correct and doesn't contain special characters that need encoding")
      console.error("3. Replace <db_password> in .env with your actual password")
      console.error("4. Your IP address is whitelisted in MongoDB Atlas Network Access")
      console.error("5. The database user has proper permissions")
    } else if (error.message.includes("ENOTFOUND")) {
      console.error("\n🌐 Network Error - Please check:")
      console.error("1. Your internet connection")
      console.error("2. The MongoDB cluster URL is correct")
      console.error("3. MongoDB Atlas is accessible from your network")
    }
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close()
      console.log("🔌 Database connection closed")
    }
  }
}

testConnection()