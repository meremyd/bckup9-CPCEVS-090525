const bcrypt = require("bcryptjs")

async function testPassword() {
  const plainPassword = "admin123"
  const hashedPassword = await bcrypt.hash(plainPassword, 12)

  console.log("Plain password:", plainPassword)
  console.log("Hashed password:", hashedPassword)

  const isMatch = await bcrypt.compare(plainPassword, hashedPassword)
  console.log("Password match:", isMatch)

  // Test with a different hash format
  const testHash = "$2a$12$abcdefghijklmnopqrstuvwxyz"
  console.log("Testing with sample hash...")
}

testPassword()
