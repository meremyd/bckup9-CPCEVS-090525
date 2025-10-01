const mongoose = require('mongoose');
const path = require('path');

// Load .env from the correct path
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function createPartialIndexes() {
  try {
    // Use MONGODB_URI (not MONGO_URI) to match your .env file
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in environment variables');
    }
    
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const collection = db.collection('electionparticipations');
    
    // Create the new partial indexes
    await collection.createIndex(
      { voterId: 1, deptElectionId: 1 },
      { 
        unique: true, 
        partialFilterExpression: { deptElectionId: { $type: 'objectId' } },
        name: 'voterId_1_deptElectionId_1'
      }
    );
    console.log('✓ Created partial index for departmental elections');
    
    await collection.createIndex(
      { voterId: 1, ssgElectionId: 1 },
      { 
        unique: true, 
        partialFilterExpression: { ssgElectionId: { $type: 'objectId' } },
        name: 'voterId_1_ssgElectionId_1'
      }
    );
    console.log('✓ Created partial index for SSG elections');
    
    // Verify the indexes were created
    const indexes = await collection.indexes();
    console.log('\n=== Current Indexes ===');
    indexes.forEach(index => {
      if (index.name.includes('voterId')) {
        console.log(JSON.stringify(index, null, 2));
      }
    });
    
    console.log('\n✓ All done! New partial indexes created successfully.');
    console.log('You can now restart your application.\n');
    
    await mongoose.disconnect();
    process.exit(0);
    
  } catch (error) {
    console.error('Error creating indexes:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

createPartialIndexes();